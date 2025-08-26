import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { GitHubClient } from '../github-client.js';
import { RefactoringExecutor } from '../refactoring-executor.js';
import { GithubFullWorkflowArgs, RefactoringResult } from '../types.js';

/**
 * Tool definition for github_full_workflow
 */
export const githubFullWorkflowToolDefinition: Tool = {
    name: "github_full_workflow",
    description: "Clone a GitHub repository, apply automated refactoring, and create a pull request with the improvements. This performs the complete workflow: fork → clone → refactor → commit → push → create PR.",
    inputSchema: {
        type: "object",
        properties: {
            repository_url: {
                type: "string",
                description: "The GitHub repository URL (e.g., https://github.com/owner/repo or owner/repo)"
            },
            base_branch: {
                type: "string",
                description: "The base branch to create the PR against (defaults to repository's default branch)"
            }
        },
        required: ["repository_url"]
    }
};

/**
 * Type guard for github_full_workflow arguments
 */
function isGithubFullWorkflowArgs(args: unknown): args is GithubFullWorkflowArgs {
    return (
        typeof args === "object" &&
        args !== null &&
        "repository_url" in args &&
        typeof (args as { repository_url: unknown }).repository_url === "string"
    );
}

/**
 * Handle github_full_workflow tool call
 */
export async function handleGithubFullWorkflowTool(
    githubClient: GitHubClient,
    refactoringExecutor: RefactoringExecutor,
    args: unknown
): Promise<CallToolResult> {
    try {
        if (!args) {
            throw new Error("No arguments provided");
        }

        if (!isGithubFullWorkflowArgs(args)) {
            throw new Error("Invalid arguments: repository_url is required");
        }

        console.log(`Starting full workflow for repository: ${args.repository_url}`);

        // Parse repository URL
        const repoInfo = githubClient.parseGitHubUrl(args.repository_url);
        
        // Get full repository information
        const fullRepoInfo = await githubClient.getRepoInfo(repoInfo.owner, repoInfo.repo);
        const baseBranch = args.base_branch || fullRepoInfo.defaultBranch;

        // Step 1: Fork the repository
        console.log(`Step 1: Forking ${repoInfo.owner}/${repoInfo.repo}...`);
        const fork = await githubClient.forkRepository(repoInfo.owner, repoInfo.repo);

        // Step 2: Clone the forked repository
        console.log(`Step 2: Cloning fork ${fork.owner}/${fork.repo}...`);
        const { git, dir } = await githubClient.cloneRepository(fork.owner, fork.repo, baseBranch);

        let result: RefactoringResult;

        try {
            // Step 3: Set up agents in the cloned repository
            console.log('Step 3: Setting up refactoring agents...');
            await refactoringExecutor.setupAgents(dir);

            // Step 4: Execute refactoring
            console.log('Step 4: Executing refactoring (this may take several minutes)...');
            const refactoringSteps = await refactoringExecutor.executeRefactoring(dir);

            // Step 5: Check for changes
            console.log('Step 5: Checking for changes...');
            const hasChanges = await refactoringExecutor.checkForChanges(git);

            if (!hasChanges) {
                result = {
                    success: true,
                    error: "No changes were made during refactoring. The codebase may already be well-organized.",
                    refactoringSteps
                };
            } else {
                // Get change statistics
                const changes = await refactoringExecutor.getChangeStats(git);

                // Step 6: Create branch and push changes
                console.log('Step 6: Pushing changes to fork...');
                const branchName = `refactor/auto-${Date.now()}`;
                const excludeFiles = refactoringExecutor.getCopiedFiles();
                await githubClient.pushChanges(git, branchName, excludeFiles);

                // Step 7: Create pull request
                console.log('Step 7: Creating pull request...');
                const prUrl = await githubClient.createPullRequest(
                    repoInfo.owner,
                    repoInfo.repo,
                    fork.owner,
                    branchName,
                    baseBranch,
                    refactoringSteps
                );

                result = {
                    success: true,
                    prUrl,
                    changes,
                    refactoringSteps
                };
            }
        } finally {
            // Clean up temporary directory
            await githubClient.cleanup(dir);
        }

        // Format response
        let responseText = `## Refactoring Complete!\n\n`;
        
        if (result.prUrl) {
            responseText += `✅ **Pull Request Created:** ${result.prUrl}\n\n`;
            responseText += `### Changes Summary\n`;
            responseText += `- Files modified: ${result.changes?.filesModified}\n`;
            responseText += `- Lines added: ${result.changes?.linesAdded}\n`;
            responseText += `- Lines removed: ${result.changes?.linesRemoved}\n\n`;
        } else {
            responseText += `ℹ️ ${result.error}\n\n`;
        }

        if (result.refactoringSteps && result.refactoringSteps.length > 0) {
            responseText += `### Refactoring Steps Applied\n`;
            result.refactoringSteps.forEach(step => {
                responseText += `- ${step}\n`;
            });
        }

        return {
            content: [{ type: "text", text: responseText }],
            isError: false
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error in github_full_workflow:', errorMessage);
        
        return {
            content: [
                {
                    type: "text",
                    text: `❌ Error: ${errorMessage}\n\nPlease ensure:\n1. GITHUB_TOKEN is set and valid\n2. You have access to the repository\n3. Claude CLI is installed and accessible`
                }
            ],
            isError: true
        };
    }
}