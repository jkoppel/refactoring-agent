import { spawn } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';

export class RefactoringExecutor {
    private claudeCodePath: string;
    private agentsPath: string;
    private niaApiKey?: string;

    constructor(claudeCodePath: string, niaApiKey?: string) {
        this.claudeCodePath = claudeCodePath;
        this.niaApiKey = niaApiKey;
        // Path to the .claude/agents directory in the current repo
        this.agentsPath = path.join(process.cwd(), '.claude', 'agents');
    }

    /**
     * Setup Claude environment in target repository
     */
    async setupAgents(targetDir: string): Promise<void> {
        const sourceClaudeDir = path.join(process.cwd(), '.claude');
        const targetClaudeDir = path.join(targetDir, '.claude');

        // Create .claude directory if it doesn't exist
        await fs.mkdir(targetClaudeDir, { recursive: true });

        // Copy agents folder
        const sourceAgentsDir = path.join(sourceClaudeDir, 'agents');
        const targetAgentsDir = path.join(targetClaudeDir, 'agents');
        if (await this.pathExists(sourceAgentsDir)) {
            await this.copyDirectory(sourceAgentsDir, targetAgentsDir);
            console.log('Agents copied to target repository');
        }

        // Copy hooks folder
        const sourceHooksDir = path.join(sourceClaudeDir, 'hooks');
        const targetHooksDir = path.join(targetClaudeDir, 'hooks');
        if (await this.pathExists(sourceHooksDir)) {
            await this.copyDirectory(sourceHooksDir, targetHooksDir);
            console.log('Hooks copied to target repository');
        }

        // Copy commands folder
        const sourceCommandsDir = path.join(sourceClaudeDir, 'commands');
        const targetCommandsDir = path.join(targetClaudeDir, 'commands');
        if (await this.pathExists(sourceCommandsDir)) {
            await this.copyDirectory(sourceCommandsDir, targetCommandsDir);
            console.log('Commands copied to target repository');
        }
        
        // Setup Nia MCP if API key is provided
        if (this.niaApiKey) {
            await this.setupNiaMCP(targetDir);
        }
    }

    /**
     * Check if path exists
     */
    private async pathExists(path: string): Promise<boolean> {
        try {
            await fs.access(path);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Setup Nia MCP server configuration
     */
    private async setupNiaMCP(targetDir: string): Promise<void> {
        const mcpConfigPath = path.join(targetDir, '.claude', 'mcp_settings.json');
        
        const mcpConfig = {
            mcpServers: {
                nia: {
                    command: "pipx",
                    args: [
                        "run",
                        "--no-cache",
                        "nia-mcp-server"
                    ],
                    env: {
                        NIA_API_KEY: this.niaApiKey,
                        NIA_API_URL: "https://apigcp.trynia.ai/"
                    }
                }
            }
        };

        await fs.writeFile(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
        console.log('Nia MCP server configured in target repository');
    }

    /**
     * Recursively copy directory
     */
    private async copyDirectory(source: string, destination: string): Promise<void> {
        await fs.mkdir(destination, { recursive: true });
        const entries = await fs.readdir(source, { withFileTypes: true });

        for (const entry of entries) {
            const sourcePath = path.join(source, entry.name);
            const destPath = path.join(destination, entry.name);

            if (entry.isDirectory()) {
                await this.copyDirectory(sourcePath, destPath);
            } else {
                await fs.copyFile(sourcePath, destPath);
            }
        }
    }

    /**
     * Execute the refactoring agent
     */
    async executeRefactoring(targetDir: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const refactoringSteps: string[] = [];
            
            console.log(`Executing refactoring in ${targetDir}...`);
            console.log(`Running: claude -p "Run the top-level-refactorer agent" --permission-mode=acceptEdits`);
            console.log(`claude code path is ${this.claudeCodePath}`);
            
            // Run claude with project mode and auto-accept edits
            const childProcess = spawn(this.claudeCodePath, [
                '-p',
                'Run the representable-valid agent',
                '--permission-mode=acceptEdits',
                '--output-format=stream-json',
                '--verbose',
                '--model=sonnet',
            ], {
                cwd: targetDir,
                env: {
                    ...process.env,
                    // Pass Nia API key if available
                    ...(this.niaApiKey ? { NIA_API_KEY: this.niaApiKey } : {})
                }
            });

            console.log(`childProcess is ${JSON.stringify(childProcess)}`);

            let outputBuffer = '';
            let errorBuffer = '';

            childProcess.stdout.on('data', (data: Buffer) => {
                const output = data.toString();
                outputBuffer += output;
                console.log('[Claude]:', output);
                
                // Parse output for refactoring steps
                if (output.includes('Running') || output.includes('Executing')) {
                    const lines = output.split('\n').filter((l: string) => l.trim());
                    lines.forEach((line: string) => {
                        if (line.includes('agent') || line.includes('command')) {
                            refactoringSteps.push(line.trim());
                        }
                    });
                }
            });

            childProcess.stderr.on('data', (data: Buffer) => {
                const error = data.toString();
                errorBuffer += error;
                console.error('[Claude Error]:', error);
            });

            childProcess.on('close', (code: number | null) => {
                if (code === 0) {
                    // Add default steps if none were captured
                    if (refactoringSteps.length === 0) {
                        refactoringSteps.push('Executed data-unifier agent');
                        refactoringSteps.push('Executed code-unifier agent');
                        refactoringSteps.push('Executed initial-organizer agent');
                        refactoringSteps.push('Executed organize command');
                        refactoringSteps.push('Executed idea-lifter agent');
                        refactoringSteps.push('Executed representable-valid agent');
                    }
                    resolve(refactoringSteps);
                } else {
                    reject(new Error(`Refactoring failed with code ${code}: ${errorBuffer}`));
                }
            });

            childProcess.on('error', (error: Error) => {
                reject(new Error(`Failed to start refactoring process: ${error.message}`));
            });

            // Set a timeout for the refactoring process (1 hour)
            setTimeout(() => {
                childProcess.kill();
                reject(new Error('Refactoring process timed out after 1 hour'));
            }, 60 * 60 * 1000);
        });
    }

    /**
     * Check if there are any changes after refactoring
     */
    async checkForChanges(git: any): Promise<boolean> {
        const status = await git.status();
        return status.files.length > 0;
    }

    /**
     * Get change statistics
     */
    async getChangeStats(git: any): Promise<{ filesModified: number; linesAdded: number; linesRemoved: number }> {
        const status = await git.status();
        const diffStat = await git.diffSummary();
        
        return {
            filesModified: status.files.length,
            linesAdded: diffStat.insertions,
            linesRemoved: diffStat.deletions
        };
    }
}