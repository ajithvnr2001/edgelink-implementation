# EdgeLink Complete Deployment Guide

**Comprehensive step-by-step guide to deploy EdgeLink to production**

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Deployment (Cloudflare D1)](#database-deployment)
4. [Backend Deployment (Cloudflare Workers)](#backend-deployment)
5. [Frontend Deployment (Cloudflare Pages)](#frontend-deployment)
6. [Browser Extension Publishing](#browser-extension-publishing)
7. [Custom Domain Setup](#custom-domain-setup)
8. [Environment Variables](#environment-variables)
9. [Post-Deployment Testing](#post-deployment-testing)
10. [Monitoring & Analytics](#monitoring--analytics)
11. [CI/CD Setup](#cicd-setup)
12. [Troubleshooting](#troubleshooting)
13. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required Accounts

1. **Cloudflare Account** (Free or Paid)
   - Sign up at: https://dash.cloudflare.com/sign-up
   - Credit card required for Workers (but free tier available)

2. **GitHub Account** (for CI/CD and Pages)
   - Sign up at: https://github.com/join

3. **Domain Name** (Optional but recommended)
   - Purchase from Cloudflare, Namecheap, GoDaddy, etc.

4. **Chrome Web Store Developer Account** ($5 one-time fee)
   - Sign up at: https://chrome.google.com/webstore/devconsole

5. **Firefox Add-ons Developer Account** (Free)
   - Sign up at: https://addons.mozilla.org/developers/

### Required Tools

Install the following on your local machine:

```bash
# Node.js (v18 or later)
# Download from: https://nodejs.org/

# Verify installation
node --version  # Should show v18.x.x or later
npm --version   # Should show 9.x.x or later

# Cloudflare Wrangler CLI
npm install -g wrangler

# Verify Wrangler installation
wrangler --version

# Git (if not already installed)
# Download from: https://git-scm.com/downloads
git --version
```

### Clone Repository

```bash
# Clone the repository
git clone https://github.com/ajithvnr2001/edgelink.git
cd edgelink

# Install dependencies for backend
cd backend
npm install

# Install dependencies for frontend
cd ../frontend
npm install

# Return to root
cd ..
```

---

## Environment Setup

### 1. Cloudflare Account Setup

```bash
# Login to Cloudflare via Wrangler
wrangler login

# This will open a browser window
# Authorize Wrangler to access your Cloudflare account
# You should see "Successfully logged in" in terminal
```

### 2. Create Cloudflare Account ID

```bash
# Get your Account ID
wrangler whoami

# Output will show:
# Account Name: Your Name
# Account ID: abc123def456...
# Copy the Account ID for later use
```

### 3. Set Up Environment Variables

Create environment files:

```bash
# Backend environment (.dev.vars for local development)
cd backend
cat > .dev.vars << 'EOF'
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
EOF

# Frontend environment (.env.local)
cd ../frontend
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

**Important**: Never commit `.dev.vars` or `.env.local` to git!

---

## Database Deployment

### Step 1: Create D1 Database

```bash
cd backend

# Create production database
wrangler d1 create edgelink-production

# Output will show:
# [[d1_databases]]
# binding = "DB"
# database_name = "edgelink-production"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Copy the database_id for next step
```

### Step 2: Update wrangler.toml

```bash
# Open wrangler.toml and update the d1_databases section
nano wrangler.toml
```

Update to:

```toml
name = "edgelink"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Production database
[[d1_databases]]
binding = "DB"
database_name = "edgelink-production"
database_id = "YOUR_DATABASE_ID_FROM_STEP_1"

# Environment-specific database (for staging)
[env.staging.d1_databases]
binding = "DB"
database_name = "edgelink-staging"
database_id = "staging-database-id"
```

### Step 3: Initialize Database Schema

```bash
# Execute schema on production database
wrangler d1 execute edgelink-production --file=./schema.sql

# You should see:
# 🌀 Executing on edgelink-production (xxxxx-xxxxx-xxxxx):
# 🌀 To execute on your local DB, remove the --remote flag
# ✅ Executed 50 commands in 2.3 seconds

# Verify tables were created
wrangler d1 execute edgelink-production --command="SELECT name FROM sqlite_master WHERE type='table';"

# You should see all your tables listed:
# users, links, refresh_tokens, custom_domains, etc.
```

### Step 4: Seed Initial Data (Optional)

```bash
# Create seed data file
cat > seed.sql << 'EOF'
-- Insert a test user (for testing only)
INSERT INTO users (user_id, email, password_hash, name, plan, email_verified)
VALUES (
  'usr_test_123',
  'test@example.com',
  '$2a$10$...',  -- bcrypt hash of 'password123'
  'Test User',
  'free',
  TRUE
);
EOF

# Execute seed data
wrangler d1 execute edgelink-production --file=./seed.sql
```

### Step 5: Create Development Database (Optional)

```bash
# Create local/remote development database
wrangler d1 create edgelink-dev

# Execute schema on dev database
wrangler d1 execute edgelink-dev --file=./schema.sql

# For local development, use --local flag
wrangler d1 execute edgelink-dev --local --file=./schema.sql
```

---

## Backend Deployment

### Step 1: Configure Secrets

```bash
cd backend

# Set JWT secrets in production
wrangler secret put JWT_SECRET
# Paste your secret when prompted: your-super-secret-jwt-key-min-32-chars

wrangler secret put REFRESH_SECRET
# Paste your secret when prompted: your-super-secret-refresh-key-min-32-chars

# Verify secrets are set
wrangler secret list
# You should see:
# JWT_SECRET
# REFRESH_SECRET
```

### Step 2: Test Locally First

```bash
# Start local development server
wrangler dev

# In another terminal, test the API
curl http://localhost:8787/health

# Expected response:
# {"status":"healthy","timestamp":1699372800000,"version":"1.0.0"}

# Test authentication endpoint
curl -X POST http://localhost:8787/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "name": "Test User"
  }'

# If successful, you'll get a JWT token

# Stop local server with Ctrl+C when done testing
```

### Step 3: Deploy to Production

```bash
# Deploy to Cloudflare Workers
wrangler deploy

# You should see:
# Total Upload: XX KiB / gzip: XX KiB
# Uploaded edgelink (X.XX sec)
# Published edgelink (X.XX sec)
#   https://edgelink.your-subdomain.workers.dev

# Your Worker is now live at the URL shown!

# Test production endpoint
curl https://edgelink.your-subdomain.workers.dev/health

# Expected response:
# {"status":"healthy","timestamp":1699372800000,"version":"1.0.0"}
```

### Step 4: Configure Custom Domain (Optional)

```bash
# Add custom route to your worker
wrangler routes list

# Add custom domain route
wrangler routes create api.edgelink.io "*/*"

# Or edit wrangler.toml and add:
# routes = [
#   { pattern = "api.edgelink.io/*", zone_name = "edgelink.io" }
# ]

# Then redeploy
wrangler deploy
```

### Step 5: Set Up Staging Environment (Optional)

```bash
# Deploy to staging
wrangler deploy --env staging

# Update wrangler.toml with staging config:
# [env.staging]
# name = "edgelink-staging"
# vars = { ENVIRONMENT = "staging" }
```

### Step 6: View Logs

```bash
# View real-time logs
wrangler tail

# View logs for specific deployment
wrangler tail --env production

# Filter logs
wrangler tail --format pretty
```

---

## Frontend Deployment

### Step 1: Connect GitHub Repository

```bash
# Make sure your code is pushed to GitHub
cd frontend
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Deploy via Cloudflare Pages

**Option A: Via Cloudflare Dashboard (Recommended for first time)**

1. Go to: https://dash.cloudflare.com/
2. Click **Pages** in the left sidebar
3. Click **Create a project**
4. Click **Connect to Git**
5. Select **GitHub** and authorize Cloudflare
6. Select your **edgelink** repository
7. Configure build settings:
   - **Production branch**: `main`
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
   - **Root directory**: `frontend`
8. Click **Environment variables (advanced)**
   - Add `NEXT_PUBLIC_API_URL`: `https://edgelink.your-subdomain.workers.dev`
   - Add `NEXT_PUBLIC_APP_URL`: `https://edgelink.pages.dev`
9. Click **Save and Deploy**

**Option B: Via Wrangler CLI**

```bash
cd frontend

# Build the project
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy .next

# Follow the prompts:
# ? Enter the name of your new project: edgelink
# ? Enter the production branch name: main

# You should see:
# ✨ Success! Uploaded X files (X.XX sec)
# ✨ Deployment complete! Take a peek over at https://edgelink.pages.dev
```

### Step 3: Configure Environment Variables

```bash
# Via CLI (for production)
npx wrangler pages deployment tail

# Via Dashboard:
# 1. Go to Pages > edgelink > Settings > Environment variables
# 2. Add production variables:
#    - NEXT_PUBLIC_API_URL: https://api.edgelink.io
#    - NEXT_PUBLIC_APP_URL: https://edgelink.io

# Redeploy to apply changes
npx wrangler pages deployment create
```

### Step 4: Set Up Custom Domain

**Via Dashboard:**

1. Go to **Pages** > **edgelink** > **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain: `edgelink.io`
4. Click **Continue**
5. Add the DNS records shown to your domain registrar
6. Wait for DNS propagation (can take up to 24 hours)

**DNS Records to Add:**

```
Type: CNAME
Name: edgelink.io
Target: edgelink.pages.dev
Proxy: Enabled (orange cloud)

Type: CNAME
Name: www
Target: edgelink.pages.dev
Proxy: Enabled (orange cloud)
```

### Step 5: Configure Redirects

Create `_redirects` file in `frontend/public/`:

```bash
cd frontend/public
cat > _redirects << 'EOF'
# Redirect www to non-www
https://www.edgelink.io/* https://edgelink.io/:splat 301!

# SPA fallback
/* /index.html 200
EOF

# Redeploy
cd ..
npm run build
npx wrangler pages deploy .next
```

### Step 6: Enable HTTPS

```bash
# HTTPS is automatic with Cloudflare Pages
# To force HTTPS, add to _redirects:
http://edgelink.io/* https://edgelink.io/:splat 301!
http://www.edgelink.io/* https://edgelink.io/:splat 301!
```

---

## Browser Extension Publishing

### Step 1: Prepare Extension Files

```bash
cd browser-extension

# Create icons (required before publishing)
# You need icons in sizes: 16x16, 32x32, 48x48, 128x128
# Place them in icons/ folder

# Update manifest.json with production API URL
nano manifest.json
# Change API_BASE_URL in lib/api.js to your production URL
```

### Step 2: Create ZIP Package

```bash
# Remove unnecessary files first
rm -rf .DS_Store
rm -rf **/.DS_Store

# Create production ZIP
zip -r edgelink-extension-v1.0.0.zip . \
  -x "*.git*" \
  -x "*.md" \
  -x "node_modules/*" \
  -x ".DS_Store"

# Verify ZIP contents
unzip -l edgelink-extension-v1.0.0.zip

# Expected structure:
# manifest.json
# icons/
# popup/
# background/
# content/
# options/
# lib/
```

### Step 3: Publish to Chrome Web Store

**Prerequisites:**
- Google account
- $5 developer fee (one-time)
- Chrome Web Store developer account

**Steps:**

```bash
# 1. Go to Chrome Web Store Developer Dashboard
# https://chrome.google.com/webstore/devconsole

# 2. Pay $5 developer fee (if first time)

# 3. Click "New Item"

# 4. Upload edgelink-extension-v1.0.0.zip

# 5. Fill in Store Listing:
```

**Store Listing Details:**

```yaml
Product Name: EdgeLink - URL Shortener
Summary: Fast, powerful URL shortener. Shorten links instantly from any page.

Detailed Description: |
  EdgeLink is the fastest way to shorten URLs directly from your browser.

  ✨ Key Features:
  • Instant URL shortening from any page
  • Right-click context menu integration
  • Keyboard shortcut (Ctrl+Shift+S)
  • AI-powered slug suggestions
  • Recent links viewer
  • Advanced options (UTM, password, expiration)
  • Beautiful dark theme
  • Works offline

  🔐 Privacy-First:
  • Your data is yours
  • No tracking or analytics on extension
  • Open source

  🚀 Pro Features:
  • Unlimited links
  • Custom domains
  • Team collaboration
  • Advanced analytics

  Get started for free at edgelink.io

Category: Productivity
Language: English
```

**Screenshots Required:**

```bash
# Take 5+ screenshots (1280x800 or 640x400):
# 1. Popup interface showing URL shortening
# 2. Context menu in action
# 3. Recent links list
# 4. Settings page
# 5. Inline notification on page

# Upload to Store Listing > Screenshots
```

**Privacy Practice Disclosure:**

```yaml
Single Purpose Description: |
  URL shortening and link management directly from the browser.

Permissions Justification:
  - activeTab: Required to read the current page URL for shortening
  - contextMenus: Enables right-click shortening on links
  - storage: Stores user preferences and authentication tokens locally
  - clipboardWrite: Automatically copies shortened URLs to clipboard

Host Permissions:
  - https://*/*: Required to shorten URLs from any website
  - http://*/*: Required to shorten HTTP URLs

Data Usage:
  - Does not collect user data
  - Authentication tokens stored locally only
  - No telemetry or tracking
```

**Submit for Review:**

```bash
# 6. Click "Submit for Review"
# 7. Review time: 1-3 business days
# 8. You'll receive email when approved
# 9. Extension will be live at:
#    https://chrome.google.com/webstore/detail/your-extension-id
```

### Step 4: Publish to Firefox Add-ons

```bash
# 1. Go to Firefox Add-ons Developer Hub
# https://addons.mozilla.org/developers/

# 2. Click "Submit a New Add-on"

# 3. Upload edgelink-extension-v1.0.0.zip

# 4. Fill in listing information (similar to Chrome)

# 5. Additional Firefox Requirements:
#    - Source code review (they may request source)
#    - Detailed description of how extension works
#    - Privacy policy URL

# 6. Submit for review
# Review time: 1-5 business days (manual review)

# 7. Extension will be live at:
# https://addons.mozilla.org/firefox/addon/edgelink/
```

### Step 5: Update Extension

**For updates:**

```bash
# 1. Update version in manifest.json
nano manifest.json
# Change version: "1.0.0" to "1.0.1"

# 2. Create new ZIP
zip -r edgelink-extension-v1.0.1.zip . -x "*.git*" -x "*.md"

# 3. Upload to Chrome Web Store
#    - Go to your extension in dashboard
#    - Click "Package" > "Upload new package"
#    - Upload ZIP
#    - Submit for review

# 4. Upload to Firefox Add-ons
#    - Go to your add-on in dashboard
#    - Click "Upload New Version"
#    - Upload ZIP
#    - Submit for review
```

---

## Custom Domain Setup

### Step 1: Add Domain to Cloudflare

```bash
# 1. Go to Cloudflare Dashboard
# https://dash.cloudflare.com/

# 2. Click "Add Site"

# 3. Enter your domain: edgelink.io

# 4. Select plan (Free is fine for most cases)

# 5. Cloudflare will scan DNS records

# 6. Click "Continue"

# 7. Update nameservers at your registrar:
#    - Remove old nameservers
#    - Add Cloudflare nameservers shown:
#      ns1.cloudflare.com
#      ns2.cloudflare.com

# 8. Wait for DNS propagation (up to 24 hours)
```

### Step 2: Configure DNS Records

**Via Dashboard:**

1. Go to **DNS** > **Records**
2. Add the following records:

```
# Root domain (frontend)
Type: CNAME
Name: @
Target: edgelink.pages.dev
Proxy: Enabled (orange cloud)

# WWW subdomain
Type: CNAME
Name: www
Target: edgelink.pages.dev
Proxy: Enabled (orange cloud)

# API subdomain (backend)
Type: CNAME
Name: api
Target: edgelink.your-subdomain.workers.dev
Proxy: Enabled (orange cloud)

# Link redirects subdomain (backend)
Type: CNAME
Name: go
Target: edgelink.your-subdomain.workers.dev
Proxy: Enabled (orange cloud)
```

**Via CLI:**

```bash
# Using Cloudflare API (requires API token)
export CF_API_TOKEN="your-api-token"
export CF_ZONE_ID="your-zone-id"

# Add root domain
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "@",
    "content": "edgelink.pages.dev",
    "proxied": true
  }'

# Add API subdomain
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "api",
    "content": "edgelink.your-subdomain.workers.dev",
    "proxied": true
  }'
```

### Step 3: Configure SSL/TLS

```bash
# Via Dashboard:
# 1. Go to SSL/TLS > Overview
# 2. Set SSL/TLS encryption mode: Full (strict)
# 3. Go to SSL/TLS > Edge Certificates
# 4. Enable:
#    - Always Use HTTPS: On
#    - HTTP Strict Transport Security (HSTS): On
#    - Minimum TLS Version: TLS 1.2
#    - Opportunistic Encryption: On
#    - Automatic HTTPS Rewrites: On
```

### Step 4: Configure Page Rules

```bash
# 1. Go to Rules > Page Rules
# 2. Create rules:

# Force HTTPS
URL: http://*edgelink.io/*
Settings:
  - Always Use HTTPS: On

# WWW to non-WWW redirect
URL: www.edgelink.io/*
Settings:
  - Forwarding URL: 301 Permanent Redirect
  - Destination: https://edgelink.io/$1

# API cache bypass
URL: api.edgelink.io/*
Settings:
  - Cache Level: Bypass
  - Security Level: Medium
```

### Step 5: Verify Domain Configuration

```bash
# Test DNS propagation
dig edgelink.io
dig api.edgelink.io
dig www.edgelink.io

# Test HTTPS
curl -I https://edgelink.io
# Should return 200 OK with HTTPS

curl -I https://api.edgelink.io/health
# Should return 200 OK with JSON

# Test redirect
curl -I http://edgelink.io
# Should return 301 redirect to HTTPS

curl -I https://www.edgelink.io
# Should return 301 redirect to non-WWW
```

---

## Environment Variables

### Backend (Cloudflare Workers)

**Set via CLI:**

```bash
cd backend

# Production secrets
wrangler secret put JWT_SECRET
wrangler secret put REFRESH_SECRET

# Optional: Email service
wrangler secret put RESEND_API_KEY

# Optional: Analytics
wrangler secret put GOOGLE_ANALYTICS_ID

# List all secrets
wrangler secret list
```

**Set via Dashboard:**

1. Go to **Workers & Pages** > **edgelink**
2. Go to **Settings** > **Variables**
3. Click **Add variable**
4. Add **Environment Variables** (non-secret):
   - `ENVIRONMENT`: `production`
   - `ALLOWED_ORIGINS`: `https://edgelink.io,https://www.edgelink.io`
5. Add **Secrets** (encrypted):
   - `JWT_SECRET`: your-secret-here
   - `REFRESH_SECRET`: your-secret-here

### Frontend (Cloudflare Pages)

**Set via Dashboard:**

1. Go to **Pages** > **edgelink**
2. Go to **Settings** > **Environment variables**
3. Select **Production** environment
4. Add variables:
   - `NEXT_PUBLIC_API_URL`: `https://api.edgelink.io`
   - `NEXT_PUBLIC_APP_URL`: `https://edgelink.io`
   - `NODE_ENV`: `production`

**Set via CLI:**

```bash
# Not directly supported for Pages via CLI
# Must use Dashboard or redeploy with env vars
```

### Browser Extension

**Update in code:**

```bash
cd browser-extension

# Update lib/api.js
nano lib/api.js

# Change:
const API_BASE_URL = 'https://api.edgelink.io';

# Then rebuild and repackage
zip -r edgelink-extension-v1.0.1.zip .
```

---

## Post-Deployment Testing

### 1. Backend API Testing

```bash
# Health check
curl https://api.edgelink.io/health

# Expected: {"status":"healthy",...}

# Test signup
curl -X POST https://api.edgelink.io/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "name": "Test User"
  }'

# Expected: {"access_token":"...","user_id":"usr_..."}

# Save the access_token for next tests
export TOKEN="your-access-token-here"

# Test link shortening
curl -X POST https://api.edgelink.io/api/shorten \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/very/long/url",
    "custom_slug": "test"
  }'

# Expected: {"slug":"test","short_url":"https://edgelink.io/test",...}

# Test redirect
curl -I https://edgelink.io/test
# Expected: 302 redirect to https://example.com/very/long/url

# Test analytics
curl https://api.edgelink.io/api/stats/test \
  -H "Authorization: Bearer $TOKEN"

# Expected: {"slug":"test","total_clicks":1,...}
```

### 2. Frontend Testing

```bash
# Test homepage
curl -I https://edgelink.io
# Expected: 200 OK

# Test dashboard (should redirect if not logged in)
curl -I https://edgelink.io/dashboard
# Expected: 200 OK or 302 redirect

# Test in browser:
# 1. Go to https://edgelink.io
# 2. Click "Sign Up"
# 3. Create an account
# 4. Create a short link
# 5. Test the short link
# 6. View analytics
# 7. Try all features
```

### 3. Browser Extension Testing

**Chrome:**

```bash
# 1. Install from Chrome Web Store
# 2. Click extension icon
# 3. Login with test account
# 4. Shorten current page URL
# 5. Test context menu (right-click)
# 6. Test keyboard shortcut (Ctrl+Shift+S)
# 7. View recent links
# 8. Open settings
# 9. Test all features
```

**Firefox:**

```bash
# Same as Chrome, but install from Firefox Add-ons
```

### 4. End-to-End Testing

```bash
# Complete user flow:
# 1. Visit homepage (https://edgelink.io)
# 2. Sign up for account
# 3. Verify email (if enabled)
# 4. Create first short link
# 5. Test short link redirect
# 6. View analytics
# 7. Install browser extension
# 8. Shorten URL via extension
# 9. View link in dashboard
# 10. Update link settings
# 11. Delete link
# 12. Test account deletion
```

### 5. Performance Testing

```bash
# Test API response time
time curl https://api.edgelink.io/health

# Should be < 100ms

# Test redirect performance
time curl -I https://edgelink.io/test

# Should be < 50ms

# Load testing (optional)
# Install Apache Bench
apt-get install apache2-utils

# Test 1000 requests with 10 concurrent
ab -n 1000 -c 10 https://api.edgelink.io/health

# Should handle without errors
```

---

## Monitoring & Analytics

### 1. Cloudflare Analytics

**Enable via Dashboard:**

```bash
# 1. Go to Analytics & Logs
# 2. View metrics:
#    - Requests
#    - Bandwidth
#    - Status codes
#    - Countries
#    - Cache performance

# 3. Set up alerts:
#    - Go to Notifications
#    - Create notification for:
#      * High error rate (>1% 5xx errors)
#      * Traffic spike (>2x normal)
#      * Security events
```

### 2. Worker Analytics

```bash
# View Worker metrics
wrangler metrics

# Real-time logs
wrangler tail

# Filter by status code
wrangler tail --status=error

# Filter by method
wrangler tail --method=POST
```

### 3. Set Up Grafana Dashboard

```bash
# Import the provided grafana-dashboard.json
# 1. Go to your Grafana instance
# 2. Click "+" > "Import"
# 3. Upload grafana-dashboard.json
# 4. Connect to Cloudflare Analytics API
# 5. View metrics in real-time
```

### 4. Error Tracking (Optional)

**Sentry Integration:**

```bash
# Install Sentry
npm install @sentry/browser

# Add to frontend
# In frontend/src/app/layout.tsx
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: process.env.NODE_ENV,
});

# Add to backend
# In backend/src/index.ts (add error handler)
```

### 5. Uptime Monitoring

**Set up UptimeRobot:**

```bash
# 1. Sign up at https://uptimerobot.com (Free)
# 2. Add monitors:
#    - https://edgelink.io (HTTP)
#    - https://api.edgelink.io/health (HTTP)
# 3. Set check interval: 5 minutes
# 4. Add notification channels:
#    - Email
#    - Slack (optional)
#    - Discord (optional)
```

---

## CI/CD Setup

### GitHub Actions (Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy EdgeLink

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  deploy-backend:
    name: Deploy Backend
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Run tests
        working-directory: ./backend
        run: npm test

      - name: Deploy to Cloudflare Workers
        working-directory: ./backend
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

  deploy-frontend:
    name: Deploy Frontend
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Build
        working-directory: ./frontend
        run: npm run build
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
          NEXT_PUBLIC_APP_URL: ${{ secrets.NEXT_PUBLIC_APP_URL }}

      - name: Deploy to Cloudflare Pages
        working-directory: ./frontend
        run: npx wrangler pages deploy .next
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

**Setup GitHub Secrets:**

```bash
# 1. Go to repository Settings > Secrets and variables > Actions
# 2. Add secrets:
#    - CLOUDFLARE_API_TOKEN: your-cloudflare-api-token
#    - NEXT_PUBLIC_API_URL: https://api.edgelink.io
#    - NEXT_PUBLIC_APP_URL: https://edgelink.io

# Get Cloudflare API token:
# 1. Go to https://dash.cloudflare.com/profile/api-tokens
# 2. Create token with permissions:
#    - Account:Workers:Edit
#    - Zone:Workers Routes:Edit
#    - Account:Pages:Edit
```

### Automated Database Migrations

Create `.github/workflows/db-migrate.yml`:

```yaml
name: Database Migration

on:
  workflow_dispatch:
    inputs:
      migration_file:
        description: 'Migration SQL file path'
        required: true
        default: 'backend/migrations/latest.sql'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Run migration
        run: |
          npx wrangler d1 execute edgelink-production \
            --file=${{ github.event.inputs.migration_file }}
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

---

## Troubleshooting

### Common Issues

**1. Worker Returns 500 Error**

```bash
# Check logs
wrangler tail

# Check secrets are set
wrangler secret list

# Verify database binding
wrangler d1 list

# Test locally first
wrangler dev
```

**2. Database Connection Error**

```bash
# Verify database exists
wrangler d1 list

# Check database ID in wrangler.toml matches
cat wrangler.toml | grep database_id

# Test database query
wrangler d1 execute edgelink-production \
  --command="SELECT COUNT(*) FROM users"
```

**3. Frontend Build Fails**

```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build

# Check environment variables
cat .env.local

# Check for TypeScript errors
npm run type-check
```

**4. Extension Not Loading**

```bash
# Check manifest.json syntax
cat manifest.json | python -m json.tool

# Verify all required files exist
ls -la icons/
ls -la popup/
ls -la background/

# Check console for errors in Chrome DevTools
```

**5. DNS Not Resolving**

```bash
# Check DNS propagation
dig edgelink.io
nslookup edgelink.io

# Flush local DNS cache
# Mac:
sudo dscacheutil -flushcache

# Windows:
ipconfig /flushdns

# Linux:
sudo systemd-resolve --flush-caches
```

**6. SSL Certificate Error**

```bash
# Verify SSL mode in Cloudflare
# Should be "Full (strict)"

# Check certificate status
curl -vI https://edgelink.io 2>&1 | grep -i ssl

# Force SSL renewal (if needed)
# Go to SSL/TLS > Edge Certificates > Disable/Enable Universal SSL
```

---

## Rollback Procedures

### Backend Rollback

```bash
# List deployments
wrangler deployments list

# Rollback to previous deployment
wrangler rollback

# Or rollback to specific version
wrangler rollback --message="Rollback to v1.0.0"
```

### Frontend Rollback

```bash
# Via Dashboard:
# 1. Go to Pages > edgelink > Deployments
# 2. Find previous successful deployment
# 3. Click "..." > "Promote to production"

# Via CLI:
npx wrangler pages deployment list
npx wrangler pages deployment promote <deployment-id>
```

### Database Rollback

```bash
# Create backup first
wrangler d1 export edgelink-production --output=backup.sql

# Restore from backup
wrangler d1 execute edgelink-production --file=backup.sql

# Or run rollback migration
wrangler d1 execute edgelink-production --file=rollback.sql
```

---

## Production Checklist

Before going live, verify:

### Backend
- [ ] Database schema deployed
- [ ] Secrets configured (JWT_SECRET, REFRESH_SECRET)
- [ ] Worker deployed successfully
- [ ] Health endpoint returns 200
- [ ] Custom domain configured (api.edgelink.io)
- [ ] CORS headers configured
- [ ] Rate limiting enabled
- [ ] Logs are being collected

### Frontend
- [ ] Environment variables set
- [ ] Production build successful
- [ ] Custom domain configured (edgelink.io)
- [ ] SSL certificate active
- [ ] Redirects configured (www → non-www)
- [ ] 404 page working
- [ ] All pages load correctly

### Browser Extension
- [ ] Icons created (all sizes)
- [ ] Manifest.json updated with production URLs
- [ ] ZIP package created
- [ ] Chrome Web Store listing complete
- [ ] Firefox Add-ons listing complete
- [ ] Extension tested in both browsers

### Security
- [ ] HTTPS enforced everywhere
- [ ] HSTS enabled
- [ ] JWT secrets rotated from defaults
- [ ] API rate limiting configured
- [ ] CORS properly configured
- [ ] SQL injection protection verified
- [ ] XSS protection enabled

### Monitoring
- [ ] Cloudflare Analytics enabled
- [ ] Error tracking configured (Sentry)
- [ ] Uptime monitoring configured
- [ ] Alert notifications set up
- [ ] Grafana dashboard imported
- [ ] Logs being collected

### Testing
- [ ] End-to-end user flow tested
- [ ] Link creation works
- [ ] Link redirection works
- [ ] Analytics tracking works
- [ ] Browser extension works
- [ ] Account deletion works
- [ ] All critical features tested

---

## Support & Resources

### Documentation
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- Cloudflare Pages: https://developers.cloudflare.com/pages/
- Cloudflare D1: https://developers.cloudflare.com/d1/
- Next.js: https://nextjs.org/docs
- Chrome Extensions: https://developer.chrome.com/docs/extensions/
- Firefox Add-ons: https://extensionworkshop.com/

### Community
- EdgeLink GitHub: https://github.com/ajithvnr2001/edgelink
- Cloudflare Discord: https://discord.gg/cloudflaredev
- Cloudflare Community: https://community.cloudflare.com/

### Support
- Email: support@edgelink.io
- GitHub Issues: https://github.com/ajithvnr2001/edgelink/issues

---

**Deployment Guide Version**: 1.0.0
**Last Updated**: November 7, 2025
**Status**: Production Ready ✅

---

## Quick Reference Commands

```bash
# Backend
wrangler login
wrangler d1 create edgelink-production
wrangler d1 execute edgelink-production --file=schema.sql
wrangler secret put JWT_SECRET
wrangler deploy
wrangler tail

# Frontend
npm run build
npx wrangler pages deploy .next

# Database
wrangler d1 list
wrangler d1 execute DB --command="SELECT * FROM users"
wrangler d1 export edgelink-production --output=backup.sql

# Monitoring
wrangler tail
wrangler deployments list
wrangler rollback

# Testing
curl https://api.edgelink.io/health
curl -X POST https://api.edgelink.io/auth/signup -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"Test123!"}'
```

---

**Ready to deploy EdgeLink to production!** 🚀
