#!/bin/bash

# Debug information
echo "Current directory: $(pwd)"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "PATH: $PATH"

# Make script executable
chmod +x build.sh

# Install dependencies if not already installed
echo "Installing dependencies..."
npm ci

# Ensure node_modules/.bin is in PATH
export PATH="$(pwd)/node_modules/.bin:$PATH"

# Verify vite is available
if command -v vite >/dev/null 2>&1; then
  echo "Vite is available at: $(which vite)"
else
  echo "WARNING: Vite not found in PATH. Installing vite globally..."
  npm install -g vite
fi

# Build the frontend
echo "Building frontend..."
npx vite build --emptyOutDir

# Success message
echo "Build completed successfully!" 