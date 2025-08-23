#!/usr/bin/env node

// Test the MCP server directly
import http from 'http';

const testRequest = {
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
        name: "github_full_workflow",
        arguments: {
            repository_url: process.argv[2] || "https://github.com/octocat/Hello-World"
        }
    },
    id: 1
};

const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/mcp',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    }
};

console.log(`Testing with repository: ${testRequest.params.arguments.repository_url}`);
console.log('Sending request to MCP server...\n');

const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Response:', data);
        try {
            const parsed = JSON.parse(data);
            console.log('\nParsed response:', JSON.stringify(parsed, null, 2));
        } catch (e) {
            console.log('Could not parse response as JSON');
        }
    });
});

req.on('error', (error) => {
    console.error('Error connecting to server:', error.message);
    console.error('Make sure the server is running: GITHUB_TOKEN=ghp_xxx npm start');
});

req.write(JSON.stringify(testRequest));
req.end();