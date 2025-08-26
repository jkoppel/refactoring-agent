import { Octokit } from '@octokit/rest';
import simpleGit, { SimpleGit } from 'simple-git';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { RepoInfo } from './types.js';

export class GitHubClient {
    private octokit: Octokit;
    private token: string;
    private authenticatedUser: string | null = null;

    constructor(token: string) {
        this.token = token;
        this.octokit = new Octokit({ auth: token });
    }

    /**
     * Retry wrapper for GitHub operations that may fail due to transient service errors
     */
    private async withGitHubRetry<T>(
        operation: () => Promise<T>,
        maxAttempts: number = 3,
        retryDelay: number = 5000
    ): Promise<T> {
        const isGitHubTransientError = (error: Error): boolean => {
            const message = error.message.toLowerCase();
            return message.includes('service unavailable') ||
                   message.includes('gh100') ||
                   message.includes('gh200') ||
                   message.includes('503') ||
                   message.includes('502') ||
                   message.includes('504') ||
                   message.includes('timeout');
        };

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                if (attempt < maxAttempts && error instanceof Error && isGitHubTransientError(error)) {
                    console.log(`GitHub operation attempt ${attempt} failed with transient error, retrying in ${retryDelay}ms...`);
                    console.log(`Error: ${error.message}`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    continue;
                }
                throw error;
            }
        }
        throw new Error('GitHub retry logic failed - this should never happen');
    }

    /**
     * Initialize and get authenticated user info
     */
    async initialize(): Promise<void> {
        try {
            const { data: user } = await this.octokit.users.getAuthenticated();
            this.authenticatedUser = user.login;
            console.log(`Authenticated as GitHub user: ${this.authenticatedUser}`);
        } catch (error) {
            throw new Error(`Failed to authenticate with GitHub: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Parse GitHub URL to extract owner and repo
     */
    parseGitHubUrl(url: string): RepoInfo {
        // Handle various GitHub URL formats
        const patterns = [
            /github\.com[\/:]([^\/]+)\/([^\/\.]+)/,
            /^([^\/]+)\/([^\/]+)$/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return {
                    owner: match[1],
                    repo: match[2].replace(/\.git$/, ''),
                    defaultBranch: 'main' // Will be updated later
                };
            }
        }

        throw new Error(`Invalid GitHub URL: ${url}`);
    }

    /**
     * Fork a repository to the authenticated user's account
     */
    async forkRepository(owner: string, repo: string): Promise<{ owner: string; repo: string }> {
        if (!this.authenticatedUser) {
            await this.initialize();
        }

        try {
            // Check if fork already exists
            try {
                await this.octokit.repos.get({
                    owner: this.authenticatedUser!,
                    repo: repo
                });
                console.log(`Fork already exists: ${this.authenticatedUser}/${repo}`);
                return { owner: this.authenticatedUser!, repo };
            } catch {
                // Fork doesn't exist, create it
            }

            // Create fork
            console.log(`Creating fork of ${owner}/${repo}...`);
            const { data: fork } = await this.octokit.repos.createFork({
                owner,
                repo
            });

            // Wait for fork to be ready (GitHub needs time to create it)
            await this.waitForFork(fork.owner.login, fork.name);

            return { owner: fork.owner.login, repo: fork.name };
        } catch (error) {
            throw new Error(`Failed to fork repository: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Wait for fork to be ready
     */
    private async waitForFork(owner: string, repo: string, maxAttempts: number = 30): Promise<void> {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                await this.octokit.repos.get({ owner, repo });
                return;
            } catch {
                if (i === maxAttempts - 1) {
                    throw new Error('Fork creation timed out');
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    /**
     * Clone a repository to a temporary directory
     */
    async cloneRepository(owner: string, repo: string, branch?: string): Promise<{ git: SimpleGit; dir: string }> {
        const tempDir = path.join(os.tmpdir(), `refactor-${owner}-${repo}-${Date.now()}`);
        await fs.mkdir(tempDir, { recursive: true });

        const cloneUrl = `https://${this.token}@github.com/${owner}/${repo}.git`;
        const git: SimpleGit = simpleGit();

        console.log(`Cloning ${owner}/${repo} to ${tempDir}...`);
        
        await this.withGitHubRetry(async () => {
            await git.clone(cloneUrl, tempDir, branch ? ['--branch', branch] : undefined);
        });

        const repoGit = simpleGit(tempDir);
        
        // Configure git user
        await repoGit.addConfig('user.email', 'refactoring-bot@example.com');
        await repoGit.addConfig('user.name', 'Refactoring Bot');

        return { git: repoGit, dir: tempDir };
    }

    /**
     * Push changes to a branch
     */
    async pushChanges(git: SimpleGit, branchName: string, excludeFiles: string[] = []): Promise<void> {
        console.log(`Pushing changes to branch ${branchName}...`);
        
        // Create and checkout new branch
        await git.checkoutLocalBranch(branchName);
        
        // Stage all changes except specified files
        if (excludeFiles.length > 0) {
            const excludePatterns = excludeFiles.map(file => `:!${file}`);
            await git.add(['--all', '--', ...excludePatterns]);
        } else {
            await git.add('--all');
        }
        
        // Commit changes
        const commitMessage = `Automated refactoring improvements

This commit contains automated refactoring performed by the GitHub Refactoring MCP Server.
The refactoring includes code organization, consolidation, and quality improvements.`;
        
        await git.commit(commitMessage);
        
        // Push to origin
        await git.push('origin', branchName, ['--set-upstream']);
    }

    /**
     * Create a pull request
     */
    async createPullRequest(
        originalOwner: string,
        originalRepo: string,
        forkOwner: string,
        branchName: string,
        baseBranch: string,
        refactoringSteps: string[]
    ): Promise<string> {
        const title = '🤖 Automated Refactoring Improvements';
        
        const body = `## Automated Refactoring

This pull request contains automated refactoring improvements performed by the GitHub Refactoring MCP Server.

### Refactoring Steps Applied

${refactoringSteps.map(step => `- ${step}`).join('\n')}

### What Changed

The refactoring agent has analyzed and improved the codebase by:
- Consolidating duplicate code
- Organizing files into logical structures
- Improving code representations
- Lifting abstractions to appropriate levels

### Review Guidelines

Please review the changes to ensure:
1. All tests still pass
2. The refactoring maintains existing functionality
3. The new structure improves code maintainability

---
*Generated by [GitHub Refactoring MCP Server](https://github.com/${forkOwner}/github-refactoring-mcp-server)*`;

        console.log(`Creating pull request from ${forkOwner}:${branchName} to ${originalOwner}:${baseBranch}...`);
        
        const { data: pr } = await this.octokit.pulls.create({
            owner: originalOwner,
            repo: originalRepo,
            title,
            body,
            head: `${forkOwner}:${branchName}`,
            base: baseBranch
        });

        return pr.html_url;
    }

    /**
     * Get repository information
     */
    async getRepoInfo(owner: string, repo: string): Promise<RepoInfo> {
        const { data } = await this.octokit.repos.get({ owner, repo });
        return {
            owner: data.owner.login,
            repo: data.name,
            defaultBranch: data.default_branch
        };
    }

    /**
     * Clean up temporary directory
     */
    async cleanup(dir: string): Promise<void> {
        try {
            await fs.rm(dir, { recursive: true, force: true });
        } catch (error) {
            console.error(`Failed to cleanup directory ${dir}:`, error);
        }
    }
}