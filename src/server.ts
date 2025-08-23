import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    InitializedNotificationSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { GitHubClient } from './github-client.js';
import { RefactoringExecutor } from './refactoring-executor.js';
import {
    githubFullWorkflowToolDefinition,
    handleGithubFullWorkflowTool,
} from './tools/index.js';

export function createStandaloneServer(githubToken: string, claudeCodePath: string, niaApiKey?: string): Server {
    const serverInstance = new Server(
        {
            name: "github-refactoring",
            version: "0.1.0",
        },
        {
            capabilities: {
                tools: {},
            },
        }
    );

    const githubClient = new GitHubClient(githubToken);
    const refactoringExecutor = new RefactoringExecutor(claudeCodePath, niaApiKey);

    // Initialize GitHub client on server start
    serverInstance.setNotificationHandler(InitializedNotificationSchema, async () => {
        console.log('GitHub Refactoring MCP Server initialized');
        try {
            await githubClient.initialize();
        } catch (error) {
            console.error('Failed to initialize GitHub client:', error);
        }
    });

    // Handle tool listing
    serverInstance.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: [githubFullWorkflowToolDefinition],
    }));

    // Handle tool calls
    serverInstance.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        
        switch (name) {
            case "github_full_workflow":
                return await handleGithubFullWorkflowTool(githubClient, refactoringExecutor, args);
            default:
                return {
                    content: [{ type: "text", text: `Unknown tool: ${name}` }],
                    isError: true,
                };
        }
    });

    return serverInstance;
}

export class GitHubRefactoringServer {
    private githubToken: string;
    private claudeCodePath: string;
    private niaApiKey?: string;

    constructor(githubToken: string, claudeCodePath: string, niaApiKey?: string) {
        this.githubToken = githubToken;
        this.claudeCodePath = claudeCodePath;
        this.niaApiKey = niaApiKey;
    }

    getServer(): Server {
        return createStandaloneServer(this.githubToken, this.claudeCodePath, this.niaApiKey);
    }
}