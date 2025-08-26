import { execa } from 'execa';
import ndjson from 'ndjson';
import { PassThrough } from 'node:stream';
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
        return new Promise(async (resolve, reject) => {
            const refactoringSteps: string[] = [];
            let outputBuffer = '';
            let errorBuffer = '';
            
            console.log(`Executing refactoring in ${targetDir}...`);
            // console.log(`Running: claude -p "Run the top-level-refactorer agent" --permission-mode=acceptEdits`);
            console.log(`claude code path is ${this.claudeCodePath}`);
            
            // Run claude with project mode and auto-accept edits
            const childProcess = await execa(this.claudeCodePath, [
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
                    ...(this.niaApiKey ? { NIA_API_KEY: this.niaApiKey } : {}),
                    NO_COLOR: '1',
                    FORCE_COLOR: '0',
                },
                stdio: 'inherit',              // Can make this more robust in the future
                reject: false,                 // don't throw on nonzero exit
                timeout: 60 * 60 * 1000,
                buffer: false,
            });

            if (childProcess.timedOut) {
                throw new Error('Refactoring process timed out after 1 hour');
            }

            if (childProcess.exitCode !== 0) {
                throw new Error(`Refactoring failed with code ${childProcess.exitCode}${childProcess.signal ? ` (signal ${childProcess.signal})` : ''}`);
            }

            // return resolve(refactoringSteps);

            // // Mirror child logs to the parent TTY
            // childProcess.stdout?.pipe(process.stdout);
            // childProcess.stderr?.pipe(process.stderr);

            // // Tee stdout so we can both keep a raw buffer and parse NDJSON
            // const tee = new PassThrough();
            // childProcess.stdout?.pipe(tee);
            // tee.on('data', (chunk: Buffer) => { outputBuffer += chunk.toString(); });

            // // Parse NDJSON objects safely (drops junk lines with strict:false)
            // const parser = ndjson.parse({ strict: false });
            // tee.pipe(parser);

            // parser.on('data', (evt: any) => {
            // const msg: string | undefined =
            //     evt?.message ?? evt?.text ?? evt?.event ?? evt?.data;
            // if (typeof msg === 'string') {
            //     if (
            //     (msg.includes('Running') || msg.includes('Executing')) &&
            //     (msg.includes('agent') || msg.includes('command'))
            //     ) {
            //     refactoringSteps.push(msg.trim());
            //     }
            // }
            // });
            // parser.on('error', () => { /* ignore malformed lines */ });

            // childProcess.stderr?.on('data', (chunk: Buffer) => {
            // errorBuffer += chunk.toString();
            // });

            // const result = await childProcess; // resolves even on failure because reject:false

            // if ((result as any).timedOut) {
            // return reject(new Error('Refactoring process timed out after 1 hour'));
            // }

            // if (result.exitCode === 0) {
            // if (refactoringSteps.length === 0) {
            //     refactoringSteps.push(
            //     'Executed data-unifier agent',
            //     'Executed code-unifier agent',
            //     'Executed initial-organizer agent',
            //     'Executed organize command',
            //     'Executed idea-lifter agent',
            //     'Executed representable-valid agent',
            //     );
            // }
            // return resolve(refactoringSteps);
            // }

            // // Non-zero exit
            // const stderrText = typeof (result as any).stderr === 'string'
            // ? (result as any).stderr
            // : errorBuffer;

            // return reject(new Error(`Refactoring failed with code ${result.exitCode}: ${stderrText}`));
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