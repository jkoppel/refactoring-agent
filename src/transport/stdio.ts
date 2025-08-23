import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

export async function runStdioTransport(server: Server): Promise<void> {
    const transport = new StdioServerTransport();
    
    try {
        await server.connect(transport);
        console.error("GitHub Refactoring MCP Server running on stdio");
    } catch (error) {
        console.error("Failed to start STDIO transport:", error);
        throw error;
    }
}