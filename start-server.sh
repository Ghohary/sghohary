#!/bin/bash

# GHOHARY Backend Server Startup Script

cd "$(dirname "$0")"

echo "🎀 Starting GHOHARY Backend Server..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install express cors
fi

# Kill any existing process on port 5000
lsof -ti:5000 | xargs kill -9 2>/dev/null || true

# Start the server
echo "✅ Starting server on http://localhost:5000"
echo ""
node server.js
