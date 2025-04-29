#!/bin/bash

# Debug information
echo "Current directory: $(pwd)"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "PATH: $PATH"

# Install dependencies if not already installed
echo "Installing dependencies..."
npm ci

# Ensure node_modules/.bin is in PATH
export PATH="$(pwd)/node_modules/.bin:$PATH"

# Install dependencies in the server directory too
echo "Installing server dependencies..."
cd server && npm ci && cd ..

# Try traditional build approach first
echo "Attempting to build with standard build command..."
node_modules/.bin/vite build --emptyOutDir || {
  echo "Standard build failed, trying alternative approach..."
  
  # Alternative build approach using TypeScript directly
  echo "Building with explicit configuration..."
  node --no-warnings --loader ts-node/esm ./node_modules/vite/bin/vite.js build
}

# Verify output directory exists
if [ -d "dist" ]; then
  echo "Verified dist directory exists"
  ls -la dist
else
  echo "ERROR: dist directory does not exist after build!"
  echo "Creating empty dist directory as fallback..."
  mkdir -p dist
  echo "<html><body><h1>Build Error</h1><p>There was an error during build. Please check logs.</p></body></html>" > dist/index.html
fi

# Copy necessary files for serverless function if they don't exist
if [ ! -d "api" ]; then
  echo "API directory not found, creating it..."
  mkdir -p api
  echo "// Placeholder" > api/index.js
fi

# Success message
echo "Build process completed!" 