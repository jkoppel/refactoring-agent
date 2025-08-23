# GitHub Refactoring MCP Server

An MCP (Model Context Protocol) server that automatically refactors GitHub repositories using Claude Code agents and creates pull requests with the improvements.

## Features

- **Automated Refactoring**: Applies sophisticated refactoring agents to improve code organization
- **GitHub Integration**: Forks repositories, pushes changes, and creates pull requests automatically
- **Claude Agents**: Uses the refactoring agents defined in `.claude/agents/`
- **MCP Protocol**: Exposes refactoring capabilities through the MCP protocol
- **Nia Integration**: Optional integration with Nia MCP for enhanced refactoring capabilities

## Prerequisites

1. **Node.js 18+**
2. **Claude CLI** (`claude` command) installed and accessible in PATH
3. **GitHub Personal Access Token** with `repo` and `workflow` scopes

## Installation

```bash
# Install dependencies
npm install

# Build the TypeScript code
npm run build
```

## Configuration

### Required Environment Variables

- `GITHUB_TOKEN`: Your GitHub Personal Access Token
- `NIA_API_KEY` (optional): Nia API key for enhanced refactoring capabilities
- `CLAUDE_CODE_PATH` (optional): Path to claude CLI (defaults to 'claude')

### Create GitHub Token

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (classic) with scopes:
   - `repo` (Full control of private repositories)
   - `workflow` (Update GitHub Action workflows)
3. Copy the token

## Usage

### Start the Server

```bash
# With HTTP transport (default)
GITHUB_TOKEN=ghp_your_token_here npm start

# With Nia integration for enhanced refactoring
GITHUB_TOKEN=ghp_your_token_here NIA_API_KEY=your_nia_key npm start

# With STDIO transport
GITHUB_TOKEN=ghp_your_token_here npm run start:stdio

# On custom port
GITHUB_TOKEN=ghp_your_token_here npm start -- --port 3000
```

### Configure MCP Client

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "github-refactoring": {
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

### Use the Tool

The server exposes one tool: `github_full_workflow`

**Input:**
- `repository_url`: GitHub repository URL (e.g., "https://github.com/owner/repo")
- `base_branch` (optional): Base branch for PR (defaults to repo's default branch)

**Example:**
```json
{
  "tool": "github_full_workflow",
  "arguments": {
    "repository_url": "https://github.com/example/project"
  }
}
```

## How It Works

1. **Fork**: Creates a fork of the target repository under your GitHub account
2. **Clone**: Clones the fork to a temporary directory
3. **Setup**: Copies `.claude/agents`, `.claude/hooks`, and `.claude/commands` to the cloned repository, configures Nia MCP if API key provided
4. **Refactor**: Executes `claude -p --permission-mode=acceptEdits agent run top-level-refactorer` which runs:
   - data-unifier
   - code-unifier
   - initial-organizer
   - organize command
   - idea-lifter
   - representable-valid
5. **Commit**: Commits all changes with descriptive message
6. **Push**: Pushes to a new branch on your fork
7. **PR**: Creates a pull request from your fork to the original repository

## Refactoring Agents

The server uses the Claude agents defined in `.claude/agents/`:

- **data-unifier**: Consolidates data representations
- **code-unifier**: Merges duplicate functions with similar purposes
- **initial-organizer**: Initial code organization pass
- **organize**: Groups files into logical directory structures
- **idea-lifter**: Lifts abstractions to appropriate levels
- **representable-valid**: Validates code representations

## Development

```bash
# Watch mode for development
npm run watch

# Run in development mode
npm run dev

# Run with STDIO in development
npm run dev:stdio
```

## Troubleshooting

### "GITHUB_TOKEN environment variable is required"
Set your GitHub token: `export GITHUB_TOKEN=ghp_your_token_here`

### "Failed to authenticate with GitHub"
Verify your token has the correct scopes and is not expired

### "Failed to start refactoring process"
Ensure Claude CLI is installed and in PATH (command: `claude`)

### "Fork creation timed out"
GitHub may be slow; try again or check GitHub status

## Security Notes

- Never commit your GitHub token
- The token is used to authenticate as you on GitHub
- All actions (forks, PRs) are performed under your GitHub account
- Review refactoring changes before merging PRs

## Limitations

- Requires push access to your own GitHub account (for forks)
- Cannot directly push to repositories you don't own
- Refactoring process may take several minutes for large codebases
- Claude CLI must be installed separately

## License

MIT