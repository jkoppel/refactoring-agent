#!/bin/bash

# Mock claude-code CLI for testing
echo "[Mock Claude Code] Running agent: $*"
echo "[Mock] Executing data-unifier agent..."
sleep 1
echo "[Mock] Executing code-unifier agent..."
sleep 1
echo "[Mock] Executing initial-organizer agent..."
sleep 1

# Create some fake changes
if [ -f "README.md" ]; then
    echo "# Refactored" >> README.md
    echo "This file was refactored by mock agent" >> README.md
fi

# Create a new file to show changes
echo "// Refactored code" > refactored.js
echo "console.log('This file was created by refactoring');" >> refactored.js

echo "[Mock] Refactoring complete!"
exit 0