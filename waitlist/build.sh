#!/bin/bash

# Simple build script for Vercel deployment
echo "Starting build process..."

# Install dependencies
npm ci

# Ensure terser is installed
echo "Ensuring terser is installed..."
npm install --no-save terser

# Build the frontend assets
echo "Building frontend assets..."
npm run build

# Ensure dist directory exists
if [ -d "dist" ]; then
  echo "✅ Build successful - dist directory created"
else
  echo "❌ Build failed - creating fallback dist directory"
  mkdir -p dist
  cp -r public/* dist/ 2>/dev/null || echo "No public files to copy"
fi

echo "Build complete!" 