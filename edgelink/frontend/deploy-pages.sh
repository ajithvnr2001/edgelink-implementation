#!/bin/bash

# EdgeLink Frontend - Cloudflare Pages Deployment Script
# This script properly builds and deploys Next.js to Cloudflare Pages

set -e  # Exit on error

echo "🚀 Starting Cloudflare Pages deployment..."

# Step 1: Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf .vercel

# Step 2: Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Step 3: Build with @cloudflare/next-on-pages
echo "🔨 Building with @cloudflare/next-on-pages..."
npx @cloudflare/next-on-pages

# Step 4: Deploy to Cloudflare Pages
echo "☁️  Deploying to Cloudflare Pages..."
wrangler pages deploy .vercel/output/static --project-name=edgelink-production --branch=main --commit-dirty=true

echo "✅ Deployment complete!"
echo "🌐 Your site will be available at: https://edgelink-production.pages.dev"
