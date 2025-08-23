#!/bin/bash

echo "Testing MCP server health..."

# Test health endpoint
echo -n "Health check: "
curl -s http://localhost:8080/health | jq '.' || echo "Failed"

# Test MCP endpoint
echo -e "\nTesting MCP endpoint..."
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"1.0.0","capabilities":{}},"id":1}' \
  -v

echo -e "\n\nIf you see a session ID in the response headers, the server is working."