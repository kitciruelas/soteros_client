#!/bin/bash

# Vercel Build Script for Vite
echo "Starting Vercel build process..."

# Set proper permissions
chmod +x node_modules/.bin/* 2>/dev/null || true

# Run the build
echo "Running Vite build..."
npx vite build

echo "Build completed successfully!"
