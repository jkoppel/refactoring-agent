/**
 * Arguments for github_full_workflow tool
 */
export interface GithubFullWorkflowArgs {
    repository_url: string;
    base_branch?: string;
}

/**
 * GitHub repository information
 */
export interface RepoInfo {
    owner: string;
    repo: string;
    defaultBranch: string;
}

/**
 * Refactoring result
 */
export interface RefactoringResult {
    success: boolean;
    prUrl?: string;
    error?: string;
    changes?: {
        filesModified: number;
        linesAdded: number;
        linesRemoved: number;
    };
    refactoringSteps?: string[];
}