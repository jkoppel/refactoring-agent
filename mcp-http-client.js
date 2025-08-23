#!/usr/bin/env node

/**
 * HTTP Client Wrapper for MCP
 * This script acts as a bridge between Claude Code (which expects STDIO) 
 * and an HTTP MCP server
 */

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import http from 'http';
import readline from 'readline';

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:8080/mcp';

// Parse URL
const url = new URL(MCP_SERVER_URL);

// Create readline interface for STDIO
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

let sessionId = null;
let buffer = '';

// Handle incoming STDIO messages from Claude Code
rl.on('line', async (line) => {
    try {
        buffer += line;
        
        // Try to parse as JSON
        let request;
        try {
            request = JSON.parse(buffer);
            buffer = ''; // Clear buffer on successful parse
        } catch {
            // Not complete JSON yet, wait for more
            return;
        }

        // Forward to HTTP server
        const response = await forwardToHttp(request);
        
        // Send response back via STDIO
        process.stdout.write(JSON.stringify(response) + '\n');
        
    } catch (error) {
        const errorResponse = {
            jsonrpc: '2.0',
            error: {
                code: -32603,
                message: error.message
            },
            id: null
        };
        process.stdout.write(JSON.stringify(errorResponse) + '\n');
    }
});

async function forwardToHttp(request) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(request);
        
        const options = {
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        // Add session ID if we have one
        if (sessionId) {
            options.headers['mcp-session-id'] = sessionId;
        }
        
        const req = http.request(options, (res) => {
            let data = '';
            
            // Capture session ID from headers
            if (res.headers['mcp-session-id']) {
                sessionId = res.headers['mcp-session-id'];
            }
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (error) {
                    reject(new Error(`Invalid JSON response: ${data}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.write(postData);
        req.end();
    });
}

// Handle process termination
process.on('SIGINT', () => {
    process.exit(0);
});

process.on('SIGTERM', () => {
    process.exit(0);
});

// Log that we're ready (to stderr so it doesn't interfere with STDIO protocol)
process.stderr.write(`MCP HTTP Client: Connecting to ${MCP_SERVER_URL}\n`);