import dotenv from 'dotenv';
dotenv.config();

export interface Config {
    githubToken: string;
    port: number;
    isProduction: boolean;
    claudeCodePath: string;
    niaApiKey?: string;
}

export function loadConfig(): Config {
    const githubToken = process.env['GITHUB_TOKEN'];
    if (!githubToken) {
        throw new Error('GITHUB_TOKEN environment variable is required');
    }

    const port = parseInt(process.env.PORT || '8080', 10);
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Path to claude CLI, defaulting to 'claude' (assumes it's in PATH)
    const claudeCodePath = process.env.CLAUDE_CODE_PATH || 'claude';
    
    // Nia API key for MCP server
    const niaApiKey = process.env.NIA_API_KEY;

    return { 
        githubToken, 
        port, 
        isProduction,
        claudeCodePath,
        niaApiKey
    };
}