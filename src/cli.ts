export interface CliOptions {
    port?: number;
    stdio?: boolean;
}

export function parseArgs(): CliOptions {
    const args = process.argv.slice(2);
    const options: CliOptions = {};
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--port':
                if (i + 1 < args.length) {
                    options.port = parseInt(args[i + 1], 10);
                    if (isNaN(options.port)) {
                        throw new Error('--port flag requires a valid number');
                    }
                    i++;
                } else {
                    throw new Error('--port flag requires a value');
                }
                break;
            case '--stdio':
                options.stdio = true;
                break;
            case '--help':
                printHelp();
                process.exit(0);
                break;
            default:
                console.error(`Unknown argument: ${args[i]}`);
                printHelp();
                process.exit(1);
        }
    }
    return options;
}

function printHelp(): void {
    console.log(`
GitHub Refactoring MCP Server

This server provides automated code refactoring for GitHub repositories.
It clones repositories, applies refactoring agents, and creates pull requests.

USAGE:
    github-refactoring-mcp [OPTIONS]

OPTIONS:
    --port <PORT>    Run HTTP server on specified port (default: 8080)
    --stdio          Use STDIO transport instead of HTTP
    --help           Print this help message

ENVIRONMENT VARIABLES:
    GITHUB_TOKEN        Required: Your GitHub Personal Access Token
    NIA_API_KEY         Optional: Nia API key for enhanced refactoring
    PORT                HTTP server port (default: 8080)
    NODE_ENV            Set to 'production' for production mode
    CLAUDE_CODE_PATH    Path to claude CLI (default: 'claude')

EXAMPLES:
    # Run with HTTP transport (default)
    GITHUB_TOKEN=ghp_xxxxx github-refactoring-mcp

    # Run with Nia integration
    GITHUB_TOKEN=ghp_xxxxx NIA_API_KEY=your_nia_key github-refactoring-mcp

    # Run with STDIO transport
    GITHUB_TOKEN=ghp_xxxxx github-refactoring-mcp --stdio

    # Run on custom port
    GITHUB_TOKEN=ghp_xxxxx github-refactoring-mcp --port 3000

SETUP:
    1. Create a GitHub Personal Access Token with repo and workflow scopes
    2. Install Claude CLI (claude) and ensure it's in PATH
    3. Set GITHUB_TOKEN environment variable
    4. Run the server
    5. Configure your MCP client to connect to http://localhost:8080/mcp

For more information, visit: https://github.com/your-username/github-refactoring-mcp-server
`);
}