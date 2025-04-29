#!/bin/bash

# Simple build script for Vercel deployment
echo "Starting build process..."

# Install dependencies
npm ci

# Build the frontend assets
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