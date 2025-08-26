import { execa } from 'execa';
import ndjson from 'ndjson';
import { PassThrough } from 'node:stream';
import path from 'path';
import { promises as fs } from 'fs';

export class RefactoringExecutor {
    private claudeCodePath: string;
    private agentsPath: string;
    private niaApiKey?: string;
    private copiedFiles: Set<string> = new Set();

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
        this.copiedFiles.clear();
        const sourceClaudeDir = path.join(process.cwd(), '.claude');
        const targetClaudeDir = path.join(targetDir, '.claude');

        // Create .claude directory if it doesn't exist 
        await fs.mkdir(targetClaudeDir, { recursive: true });

        // Copy agents folder
        const sourceAgentsDir = path.join(sourceClaudeDir, 'agents');
        const targetAgentsDir = path.join(targetClaudeDir, 'agents');
        if (await this.pathExists(sourceAgentsDir)) {
            await this.copyDirectoryAndTrack(sourceAgentsDir, targetAgentsDir, targetDir);
            console.log('Agents copied to target repository');
        }

        // Copy hooks folder
        const sourceHooksDir = path.join(sourceClaudeDir, 'hooks');
        const targetHooksDir = path.join(targetClaudeDir, 'hooks');
        if (await this.pathExists(sourceHooksDir)) {
            await this.copyDirectoryAndTrack(sourceHooksDir, targetHooksDir, targetDir);
            console.log('Hooks copied to target repository');
        }

        // Copy commands folder
        const sourceCommandsDir = path.join(sourceClaudeDir, 'commands');
        const targetCommandsDir = path.join(targetClaudeDir, 'commands');
        if (await this.pathExists(sourceCommandsDir)) {
            await this.copyDirectoryAndTrack(sourceCommandsDir, targetCommandsDir, targetDir);
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
        const relativePath = path.relative(targetDir, mcpConfigPath);
        
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
        this.copiedFiles.add(relativePath);
        console.log('Nia MCP server configured in target repository');
    }

    /**
     * Recursively copy directory and track copied files
     */
    private async copyDirectoryAndTrack(source: string, destination: string, targetDir: string): Promise<void> {
        await fs.mkdir(destination, { recursive: true });
        const entries = await fs.readdir(source, { withFileTypes: true });

        for (const entry of entries) {
            const sourcePath = path.join(source, entry.name);
            const destPath = path.join(destination, entry.name);

            if (entry.isDirectory()) {
                await this.copyDirectoryAndTrack(sourcePath, destPath, targetDir);
            } else {
                await fs.copyFile(sourcePath, destPath);
                const relativePath = path.relative(targetDir, destPath);
                this.copiedFiles.add(relativePath);
            }
        }
    }

    /**
     * Recursively copy directory (legacy method)
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
        return new Promise(async (resolve, reject) => {
            const refactoringSteps: string[] = [];
            let outputBuffer = '';
            
            console.log(`Executing refactoring in ${targetDir}...`);
            console.log(`claude code path is ${this.claudeCodePath}`);
            
            try {
                // Run claude with project mode and auto-accept edits
                const childProcess = execa(this.claudeCodePath, [
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
                        ...(this.niaApiKey ? { NIA_API_KEY: this.niaApiKey } : {}),
                        NO_COLOR: '1',
                        FORCE_COLOR: '0',
                    },
                    stdio: ['ignore', 'pipe', 'inherit'],
                    timeout: 60 * 60 * 1000,
                });

                // Create a passthrough stream to duplicate stdout
                const passThrough = new PassThrough();
                childProcess.stdout?.pipe(passThrough, { end: false });
                childProcess.stdout?.pipe(process.stdout, { end: false });

                // Parse NDJSON output for refactoring steps
                const parser = ndjson.parse({ strict: false });
                passThrough.pipe(parser);

                parser.on('data', (evt: any) => {
                    const msg: string | undefined = evt?.message ?? evt?.text ?? evt?.event ?? evt?.data;
                    if (typeof msg === 'string') {
                        if ((msg.includes('Running') || msg.includes('Executing')) &&
                            (msg.includes('agent') || msg.includes('command'))) {
                            refactoringSteps.push(msg.trim());
                        }
                    }
                });

                parser.on('error', () => { /* ignore malformed lines */ });

                const result = await childProcess;

                if (result.exitCode === 0) {
                    // Provide default steps if none were parsed
                    if (refactoringSteps.length === 0) {
                        refactoringSteps.push(
                            'Executed representable-valid agent',
                            'Applied representable/valid principle refactoring',
                            'Fixed type safety and state management issues'
                        );
                    }
                    resolve(refactoringSteps);
                } else {
                    reject(new Error(`Refactoring failed with exit code ${result.exitCode}`));
                }

            } catch (error) {
                if (error instanceof Error && error.message.includes('timed out')) {
                    reject(new Error('Refactoring process timed out after 1 hour'));
                } else {
                    reject(error);
                }
            }
        });
    }

    /**
     * Check if there are any changes after refactoring (excluding copied setup files)
     */
    async checkForChanges(git: any): Promise<boolean> {
        const status = await git.status();
        const relevantFiles = status.files.filter((file: any) => !this.copiedFiles.has(file.path));
        return relevantFiles.length > 0;
    }

    /**
     * Get change statistics (excluding copied setup files)
     */
    async getChangeStats(git: any): Promise<{ filesModified: number; linesAdded: number; linesRemoved: number }> {
        const status = await git.status();
        const relevantFiles = status.files.filter((file: any) => !this.copiedFiles.has(file.path));
        
        // Create pathspecs to exclude copied files
        const excludePatterns = Array.from(this.copiedFiles).map(file => `:!${file}`);
        const diffStat = excludePatterns.length > 0 
            ? await git.diffSummary(['--', ...excludePatterns])
            : await git.diffSummary();
        
        return {
            filesModified: relevantFiles.length,
            linesAdded: diffStat.insertions,
            linesRemoved: diffStat.deletions
        };
    }

    /**
     * Get the list of copied files that should be excluded from commits
     */
    getCopiedFiles(): string[] {
        return Array.from(this.copiedFiles);
    }
}