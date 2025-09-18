#!/bin/bash

echo "========================================"
echo "   PTFI Personal Node Server Starter"
echo "========================================"
echo

echo "Checking if Node.js is installed..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js is installed"
echo

echo "Installing dependencies..."
npm install

echo
echo "Starting PTFI Personal Node Server..."
echo
echo "🌐 Server will be available at:"
echo "   - Local: http://localhost:3000"
echo "   - Network: http://172.16.7.131:3000"
echo
echo "💡 Open one of these URLs in your browser"
echo "🛑 Press Ctrl+C to stop the server"
echo

npm start
