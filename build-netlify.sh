#!/bin/bash
set -e

echo "🚀 Starting Netlify build process..."

# Navigate to web-app directory
cd apps/web-app

echo "📦 Installing dependencies with pnpm..."
pnpm install --no-frozen-lockfile --force

echo "🏗️ Building Next.js application..."
pnpm run build

echo "✅ Build completed successfully!"
