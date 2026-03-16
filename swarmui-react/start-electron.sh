#!/bin/bash

echo "============================================"
echo "SwarmUI Electron Desktop App - Launcher"
echo "============================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[1/3] Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install dependencies"
        exit 1
    fi
    echo ""
else
    echo "[1/3] Dependencies already installed"
    echo ""
fi

# Build the React app
echo "[2/3] Building React application..."
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to build React app"
    exit 1
fi
echo ""

# Start Electron
echo "[3/3] Starting Electron application..."
echo ""
echo "The SwarmUI desktop app will launch shortly..."
echo "SwarmUI backend will start automatically."
echo ""
unset ELECTRON_RUN_AS_NODE
npm run dev
