#!/usr/bin/env node

import { config as loadEnv } from 'dotenv';
loadEnv();

import { loadConfig } from './config.js';
import { parseArgs } from './cli.js';
import { GitHubRefactoringServer } from './server.js';
import { runStdioTransport, startHttpTransport } from './transport/index.js';

/**
 * Main entry point for the GitHub Refactoring MCP Server
 * 
 * Transport selection logic:
 * 1. --stdio flag forces STDIO transport
 * 2. Default: HTTP transport for production compatibility
 */
async function main() {
    try {
        const config = loadConfig();
        const cliOptions = parseArgs();
        
        console.log('Starting GitHub Refactoring MCP Server...');
        console.log(`Claude CLI path: ${config.claudeCodePath}`);
        
        if (cliOptions.stdio) {
            // STDIO transport for local development
            console.log('Using STDIO transport...');
            const server = new GitHubRefactoringServer(config.githubToken, config.claudeCodePath, config.niaApiKey);
            await runStdioTransport(server.getServer());
        } else {
            // HTTP transport for production/cloud deployment
            const port = cliOptions.port || config.port;
            console.log(`Using HTTP transport on port ${port}...`);
            startHttpTransport({ ...config, port });
        }
    } catch (error) {
        console.error("Fatal error running GitHub Refactoring server:", error);
        if (error instanceof Error && error.message.includes('GITHUB_TOKEN')) {
            console.error('\nPlease set the GITHUB_TOKEN environment variable:');
            console.error('export GITHUB_TOKEN=ghp_your_token_here');
        }
        if (error instanceof Error && error.message.includes('claude')) {
            console.error('\nPlease ensure Claude CLI is installed and accessible:');
            console.error('Check that "claude" command is available in your PATH');
        }
        process.exit(1);
    }
}

main();