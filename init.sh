#!/bin/bash

# Automaker - Development Environment Setup Script

echo "=== Automaker Development Environment Setup ==="

# Navigate to app directory
APP_DIR="$(dirname "$0")/app"

if [ ! -d "$APP_DIR" ]; then
    echo "Error: app directory not found"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "$APP_DIR/node_modules" ]; then
    echo "Installing dependencies..."
    npm install --prefix "$APP_DIR"
fi

# Install Playwright browsers if needed
echo "Checking Playwright browsers..."
npx playwright install chromium 2>/dev/null || true

# Kill any process on port 3000
echo "Checking port 3000..."
lsof -ti:3007 | xargs kill -9 2>/dev/null || true

# Start the dev server
echo "Starting Next.js development server..."
npm run dev --prefix "$APP_DIR"
