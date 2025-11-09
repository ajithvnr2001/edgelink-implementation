# Production Environment Deployment Guide

This guide covers deploying EdgeLink to a **production environment** after successful testing in the development environment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Production Checklist](#pre-production-checklist)
3. [Production Environment Setup](#production-environment-setup)
4. [Database Setup (D1 - Production)](#database-setup-d1---production)
5. [Backend Deployment (Cloudflare Workers - Production)](#backend-deployment-cloudflare-workers---production)
6. [Frontend Deployment (Cloudflare Pages - Production)](#frontend-deployment-cloudflare-pages---production)
7. [Browser Extension Publishing](#browser-extension-publishing)
8. [Custom Domain Configuration](#custom-domain-configuration)
9. [SSL/TLS Configuration](#ssltls-configuration)
10. [Production Monitoring](#production-monitoring)
11. [Security Hardening](#security-hardening)
12. [Performance Optimization](#performance-optimization)
13. [Backup & Disaster Recovery](#backup--disaster-recovery)
14. [CI/CD Pipeline Setup](#cicd-pipeline-setup)
15. [Production Rollback Procedures](#production-rollback-procedures)
16. [Post-Deployment Verification](#post-deployment-verification)
17. [Maintenance & Updates](#maintenance--updates)

---

## Prerequisites

### Required Accounts (Production-Ready)

1. **Cloudflare Account** (Paid Plan Recommended)
   - Sign up at https://dash.cloudflare.com/sign-up
   - **Recommended**: Workers Paid plan ($5/month) for:
     - No request limits
     - Longer CPU time
     - Better support
   - Add payment method for production use

2. **Domain Name**
   - Purchase from registrar (Namecheap, Google Domains, etc.)
   - Or transfer domain to Cloudflare Registrar
   - Example: `edgelink.com` or `yourdomain.com`

3. **GitHub Account**
   - Organization account recommended for production
   - Set up team access controls
   - Enable 2FA for all team members

4. **Email Service** (for transactional emails)
   - SendGrid, Mailgun, or similar
   - SMTP credentials ready

5. **Monitoring Service** (Optional but Recommended)
   - Sentry for error tracking
   - DataDog, New Relic, or similar for APM

### Required Tools

```bash
# Verify all tools are installed
node --version  # v18 or higher
npm --version
wrangler --version
git --version

# Install additional production tools
npm install -g web-ext  # For Firefox extension

# Install security scanning tools
npm install -g snyk
npm install -g npm-audit
```

---

## Pre-Production Checklist

Before deploying to production, ensure:

### ✅ Development Testing Complete
- [ ] All features tested in dev environment
- [ ] All automated tests passing
- [ ] Manual testing checklist completed
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Load testing completed (if applicable)

### ✅ Code Review
- [ ] All code reviewed by team members
- [ ] No TODO or FIXME comments in critical paths
- [ ] Code follows style guide
- [ ] Documentation is complete and accurate

### ✅ Security Audit
- [ ] No hardcoded secrets or credentials
- [ ] All dependencies updated to latest secure versions
- [ ] Vulnerability scan completed (npm audit, Snyk)
- [ ] OWASP Top 10 vulnerabilities addressed
- [ ] Rate limiting configured appropriately
- [ ] CORS properly configured

### ✅ Legal & Compliance
- [ ] Terms of Service finalized
- [ ] Privacy Policy finalized
- [ ] GDPR compliance verified
- [ ] CCPA compliance verified
- [ ] Cookie consent implemented (if applicable)

### ✅ Infrastructure
- [ ] Domain purchased and ready
- [ ] SSL certificates ready (or will use Cloudflare SSL)
- [ ] Monitoring tools configured
- [ ] Backup strategy defined
- [ ] Disaster recovery plan documented

### ✅ Documentation
- [ ] API documentation complete
- [ ] Deployment runbook ready
- [ ] Rollback procedures documented
- [ ] Incident response plan ready
- [ ] Team contact information up to date

---

## Production Environment Setup

### 1. Clone Repository (Production Branch)

```bash
# Clone repository
git clone https://github.com/ajithvnr2001/edgelink.git
cd edgelink

# Create and checkout production branch
git checkout -b production

# Or checkout existing production branch
git checkout production

# Pull latest stable code
git pull origin main

# Install dependencies with production flag
npm ci --production
```

### 2. Configure Wrangler for Production

```bash
cd backend

# Authenticate with Cloudflare
wrangler login
```

Create `wrangler.prod.toml`:

```bash
cat > wrangler.prod.toml << 'EOF'
name = "edgelink"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.production]
name = "edgelink"
workers_dev = false
route = "api.yourdomain.com/*"

[[env.production.d1_databases]]
binding = "DB"
database_name = "edgelink-production"
database_id = "YOUR_PROD_DB_ID"

[env.production.vars]
ENVIRONMENT = "production"
LOG_LEVEL = "error"
FRONTEND_URL = "https://yourdomain.com"
ALLOW_REGISTRATION = "true"
NODE_ENV = "production"

# Production rate limiting
[env.production.limits]
cpu_ms = 50

# Custom domain routes
[[env.production.routes]]
pattern = "api.yourdomain.com/*"
zone_name = "yourdomain.com"

# Durable Objects (if using)
# [[env.production.durable_objects.bindings]]
# name = "RATE_LIMITER"
# class_name = "RateLimiter"

# KV Namespaces (if using)
# [[env.production.kv_namespaces]]
# binding = "CACHE"
# id = "your-kv-namespace-id"
EOF

echo "Created wrangler.prod.toml"
```

**Important**: Replace `yourdomain.com` with your actual domain.

### 3. Generate Strong Production Secrets

```bash
# Generate strong JWT secret (64 characters)
openssl rand -base64 48

# Generate strong refresh token secret
openssl rand -base64 48

# Generate database encryption key (if needed)
openssl rand -base64 32

# Save these securely - you'll need them for deployment
echo "Save these secrets in a secure password manager"
```

**CRITICAL**: Never commit these secrets to Git. Store them in:
- Password manager (1Password, LastPass, Bitwarden)
- Cloudflare secrets (set via wrangler)
- Encrypted vault

---

## Database Setup (D1 - Production)

### 1. Create Production Database

```bash
cd backend

# Create production database
wrangler d1 create edgelink-production

# Output will show:
# [[d1_databases]]
# binding = "DB"
# database_name = "edgelink-production"
# database_id = "xxxx-xxxx-xxxx-xxxx"

# SAVE THE DATABASE_ID - you'll need it
```

### 2. Update Production Configuration

```bash
# Update wrangler.prod.toml with the database_id
nano wrangler.prod.toml

# Replace YOUR_PROD_DB_ID with the actual ID from step 1
```

### 3. Initialize Production Schema

```bash
# Execute schema on production database
wrangler d1 execute edgelink-production --file=./schema.sql

# Verify all tables created
wrangler d1 execute edgelink-production --command="SELECT name FROM sqlite_master WHERE type='table';"

# Expected tables (15+):
# users, urls, analytics, api_keys, webhooks, qr_codes,
# ab_tests, ab_test_events, analytics_archive, team_members,
# team_invitations, custom_domains, url_metadata, etc.
```

### 4. Create Production Database Backup

```bash
# Create initial backup
wrangler d1 export edgelink-production --output=backup-prod-initial-$(date +%Y%m%d).sql

# Store backup securely
# Upload to S3, Google Drive, or secure storage
```

### 5. Set Up Automated Backups

Create `backup-prod.sh`:

```bash
cat > backup-prod.sh << 'EOF'
#!/bin/bash

# Production Database Backup Script

set -e

BACKUP_DIR="/backups/edgelink"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/edgelink-prod-$TIMESTAMP.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Export database
echo "Starting backup at $(date)..."
wrangler d1 export edgelink-production --output="$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "edgelink-prod-*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"

# Optional: Upload to cloud storage
# aws s3 cp "$BACKUP_FILE.gz" s3://your-backup-bucket/
# or
# gsutil cp "$BACKUP_FILE.gz" gs://your-backup-bucket/

# Optional: Send notification
# curl -X POST https://your-notification-service.com/backup-complete
EOF

chmod +x backup-prod.sh

echo "Created backup-prod.sh"
```

Set up daily cron job:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/user/edgelink/backup-prod.sh >> /var/log/edgelink-backup.log 2>&1
```

---

## Backend Deployment (Cloudflare Workers - Production)

### 1. Security Audit Before Deployment

```bash
cd backend

# Run npm audit
npm audit

# Fix any high/critical vulnerabilities
npm audit fix

# Run Snyk scan (if installed)
snyk test

# Check for outdated dependencies
npm outdated
```

### 2. Set Production Secrets

```bash
# Set JWT secret (use the 64-char secret generated earlier)
wrangler secret put JWT_SECRET --env production
# Enter the strong secret when prompted

# Set refresh token secret
wrangler secret put REFRESH_TOKEN_SECRET --env production
# Enter the strong secret when prompted

# Set database encryption key (if using)
wrangler secret put DB_ENCRYPTION_KEY --env production

# Set email service credentials (if using)
wrangler secret put SENDGRID_API_KEY --env production
# or
wrangler secret put SMTP_PASSWORD --env production

# Set any third-party API keys
wrangler secret put STRIPE_SECRET_KEY --env production  # If using payments
wrangler secret put SENTRY_DSN --env production  # If using Sentry

# List all secrets (values are hidden)
wrangler secret list --env production
```

### 3. Build Backend for Production

```bash
# Clean previous builds
rm -rf dist .wrangler

# Install production dependencies only
npm ci --production

# Build TypeScript
npm run build

# Verify build
ls -la dist/
```

### 4. Deploy to Production

```bash
# Deploy to Cloudflare Workers (production)
wrangler deploy --env production

# Expected output:
# ⛅️ wrangler 3.x.x
# Total Upload: XX.XX KiB / gzip: XX.XX KiB
# Uploaded edgelink (X.XX sec)
# Published edgelink (X.XX sec)
#   https://edgelink.YOUR_SUBDOMAIN.workers.dev
#   api.yourdomain.com/*
# Current Deployment ID: xxxx-xxxx-xxxx-xxxx

# Save the Deployment ID for potential rollback
```

### 5. Verify Backend Deployment

```bash
# Test health endpoint
curl https://api.yourdomain.com/api/health

# Expected response:
# {"status":"ok","timestamp":"2024-11-08T20:00:00.000Z","environment":"production"}

# Test with verbose output
curl -v https://api.yourdomain.com/api/health

# Check response headers for security headers:
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
# - Content-Security-Policy: ...
# - Strict-Transport-Security: max-age=31536000
```

### 6. Monitor Deployment

```bash
# Tail production logs
wrangler tail --env production

# In another terminal, make test requests
curl https://api.yourdomain.com/api/health
curl https://api.yourdomain.com/api/stats

# Check for any errors in logs
# Verify response times are acceptable
```

---

## Frontend Deployment (Cloudflare Pages - Production)

### 1. Configure Production Environment Variables

Create `.env.production`:

```bash
cd ../frontend

cat > .env.production << 'EOF'
# Production Environment Variables

# Backend API URL (your custom domain)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# Frontend URL
NEXT_PUBLIC_FRONTEND_URL=https://yourdomain.com

# Environment
NEXT_PUBLIC_ENVIRONMENT=production

# Feature Flags (disable what's not ready)
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_AB_TESTING=true
NEXT_PUBLIC_ENABLE_WEBHOOKS=true
NEXT_PUBLIC_ENABLE_TEAMS=true
NEXT_PUBLIC_ENABLE_ACCOUNT_DELETION=true

# Debug mode (MUST be false in production)
NEXT_PUBLIC_DEBUG=false

# Analytics (if using)
NEXT_PUBLIC_GA_TRACKING_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Short URL domain
NEXT_PUBLIC_SHORT_URL_DOMAIN=yourdomain.com
EOF

echo "Created .env.production"
```

**Important**: Replace all placeholder values with actual production values.

### 2. Build Frontend for Production

```bash
# Clean previous builds
rm -rf .next

# Install production dependencies
npm ci --production

# Build with production environment
NODE_ENV=production npm run build

# Expected output:
# Route (app)                              Size     First Load JS
# ┌ ○ /                                    X kB          XX kB
# ├ ○ /dashboard                           X kB          XX kB
# ├ ○ /login                               X kB          XX kB
# ...
#
# ○  (Static)  automatically rendered as static HTML
# ●  (SSG)     automatically generated as static HTML + JSON
# λ  (Server)  server-side renders at runtime

# Verify build size is optimized
du -sh .next
```

### 3. Create Production Pages Project

```bash
# Create Pages project for production
npx wrangler pages project create edgelink

# Choose:
# - Production branch: main (or production)
# - Preview branches: dev, staging
```

### 4. Deploy Frontend to Production

```bash
# Deploy to Cloudflare Pages
npx wrangler pages deploy .next --project-name=edgelink --branch=main

# Expected output:
# ✨ Success! Uploaded X files (X.XX sec)
# ✨ Deployment complete! Take a peek over at
#    https://xxxxxxxx.edgelink.pages.dev
#
# Note: It may take a few minutes for the site to become available

# Save the deployment URL
```

### 5. Configure Pages Environment Variables

```bash
# Set production environment variables
wrangler pages secret put NEXT_PUBLIC_API_URL --project-name=edgelink
# Enter: https://api.yourdomain.com

wrangler pages secret put NEXT_PUBLIC_FRONTEND_URL --project-name=edgelink
# Enter: https://yourdomain.com

wrangler pages secret put NEXT_PUBLIC_ENVIRONMENT --project-name=edgelink
# Enter: production

wrangler pages secret put NEXT_PUBLIC_DEBUG --project-name=edgelink
# Enter: false

wrangler pages secret put NEXT_PUBLIC_SHORT_URL_DOMAIN --project-name=edgelink
# Enter: yourdomain.com

# If using analytics
wrangler pages secret put NEXT_PUBLIC_GA_TRACKING_ID --project-name=edgelink
wrangler pages secret put NEXT_PUBLIC_SENTRY_DSN --project-name=edgelink

# List all environment variables
wrangler pages secret list --project-name=edgelink
```

### 6. Verify Frontend Deployment

```bash
# Test deployed frontend
curl https://xxxxxxxx.edgelink.pages.dev

# Open in browser and test:
# - Registration flow
# - Login flow
# - Dashboard loads
# - URL shortening works
# - Analytics display correctly
```

---

## Browser Extension Publishing

### 1. Prepare Extension for Production

```bash
cd ../browser-extension

# Update manifest.json for production
cat > manifest.json << 'EOF'
{
  "manifest_version": 3,
  "name": "EdgeLink - URL Shortener",
  "version": "1.0.0",
  "description": "Shorten URLs instantly with EdgeLink. Right-click any link or use Ctrl+Shift+S to create short URLs with analytics.",
  "permissions": [
    "activeTab",
    "contextMenus",
    "storage",
    "clipboardWrite",
    "notifications"
  ],
  "host_permissions": [
    "https://api.yourdomain.com/*",
    "https://yourdomain.com/*"
  ],
  "background": {
    "service_worker": "background/background.js"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "options_page": "options/options.html",
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"],
      "run_at": "document_end"
    }
  ],
  "commands": {
    "shorten-current-url": {
      "suggested_key": {
        "default": "Ctrl+Shift+S"
      },
      "description": "Shorten the current page URL"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "edgelink@yourdomain.com",
      "strict_min_version": "109.0"
    }
  }
}
EOF
```

### 2. Update Extension API Configuration

```bash
# Update lib/api.js with production API URL
nano lib/api.js

# Change API_BASE_URL to:
# const API_BASE_URL = 'https://api.yourdomain.com';
```

### 3. Create Production Extension Package

```bash
# Create production build directory
mkdir -p ../extension-prod-build
cp -r * ../extension-prod-build/
cd ../extension-prod-build

# Remove development files
rm -rf .git .gitignore *.md

# Create ZIP for Chrome Web Store
zip -r edgelink-chrome-v1.0.0.zip . -x "*.DS_Store" "*.git*"

echo "Chrome extension package created: edgelink-chrome-v1.0.0.zip"
```

### 4. Publish to Chrome Web Store

**Preparation**:
1. Create Chrome Web Store developer account: https://chrome.google.com/webstore/devconsole
2. Pay one-time $5 registration fee
3. Prepare store listing assets:
   - Icon: 128x128px PNG
   - Promotional images: 1280x800px (at least 1)
   - Small tile: 440x280px
   - Screenshots: 1280x800px or 640x400px (at least 1)

**Publishing Steps**:

```bash
# 1. Go to Chrome Web Store Developer Dashboard
# https://chrome.google.com/webstore/devconsole

# 2. Click "New Item"

# 3. Upload edgelink-chrome-v1.0.0.zip

# 4. Fill in store listing:
# - Name: EdgeLink - URL Shortener
# - Summary: Shorten URLs instantly with one click
# - Description: (Detailed description from WEEK12_SUMMARY.md)
# - Category: Productivity
# - Language: English

# 5. Upload promotional images and screenshots

# 6. Set privacy policy URL: https://yourdomain.com/privacy

# 7. Set pricing: Free

# 8. Select regions: All regions (or specific ones)

# 9. Click "Submit for Review"

# Expected review time: 1-3 business days
```

**Store Listing Example**:

```
Name: EdgeLink - URL Shortener

Summary: Shorten URLs instantly with analytics, QR codes, and A/B testing

Description:
EdgeLink is the fastest way to create short URLs with powerful analytics and management features.

Features:
✓ One-click URL shortening
✓ Custom short codes
✓ Real-time analytics
✓ QR code generation
✓ A/B testing for URLs
✓ Team collaboration
✓ API access
✓ Webhooks

Perfect for:
- Marketers tracking campaign performance
- Developers sharing links
- Social media managers
- Content creators
- Anyone who shares links regularly

Privacy:
We respect your privacy. We only collect data necessary to provide the service.
Full privacy policy: https://yourdomain.com/privacy

Support:
Email: support@yourdomain.com
Website: https://yourdomain.com
```

### 5. Publish to Firefox Add-ons

```bash
cd ../browser-extension

# Build for Firefox (uses web-ext)
web-ext build --overwrite-dest

# This creates: web-ext-artifacts/edgelink-1.0.0.zip
```

**Publishing Steps**:

```bash
# 1. Go to Firefox Add-on Developer Hub
# https://addons.mozilla.org/developers/

# 2. Click "Submit a New Add-on"

# 3. Upload web-ext-artifacts/edgelink-1.0.0.zip

# 4. Select distribution: "On this site"

# 5. Fill in listing:
# - Name: EdgeLink - URL Shortener
# - Summary: (same as Chrome)
# - Description: (same as Chrome)
# - Categories: Productivity, Web Development

# 6. Upload icon and screenshots

# 7. Set privacy policy URL

# 8. Submit for review

# Expected review time: 1-5 business days
```

### 6. Post-Publishing

```bash
# Monitor reviews and ratings
# Respond to user feedback
# Track crash reports
# Prepare updates for any issues

# Create a changelog file
cat > CHANGELOG.md << 'EOF'
# Changelog

## [1.0.0] - 2024-11-08

### Added
- Initial release
- URL shortening with custom slugs
- Real-time analytics
- QR code generation
- A/B testing
- Team collaboration
- Browser context menu integration
- Keyboard shortcuts (Ctrl+Shift+S)

### Security
- JWT authentication
- Secure token storage
- HTTPS-only communication
EOF
```

---

## Custom Domain Configuration

### 1. Add Domain to Cloudflare

If your domain is not already on Cloudflare:

```bash
# 1. Go to Cloudflare Dashboard
# https://dash.cloudflare.com/

# 2. Click "Add a Site"

# 3. Enter your domain: yourdomain.com

# 4. Select plan (Free is fine, Pro recommended)

# 5. Cloudflare will scan DNS records

# 6. Review and confirm DNS records

# 7. Update nameservers at your registrar:
#    - Remove old nameservers
#    - Add Cloudflare nameservers:
#      ns1.cloudflare.com
#      ns2.cloudflare.com
#      (exact nameservers shown in dashboard)

# 8. Wait for DNS propagation (up to 24 hours)

# Check nameserver status
dig NS yourdomain.com +short

# Should show:
# ns1.cloudflare.com
# ns2.cloudflare.com
```

### 2. Configure DNS Records

```bash
# In Cloudflare Dashboard → DNS → Records

# Add A record for root domain (if using Cloudflare Pages directly)
# Type: CNAME
# Name: @
# Content: edgelink.pages.dev
# Proxy: Enabled (orange cloud)

# Add A record for www
# Type: CNAME
# Name: www
# Content: edgelink.pages.dev
# Proxy: Enabled

# Add A record for API subdomain
# Type: CNAME
# Name: api
# Content: edgelink.workers.dev (or your custom route)
# Proxy: Enabled

# DNS records should look like:
# @ (root)     CNAME   edgelink.pages.dev     Proxied
# www          CNAME   edgelink.pages.dev     Proxied
# api          CNAME   edgelink.workers.dev   Proxied
```

### 3. Configure Custom Domain for Workers (Backend)

```bash
cd backend

# Update wrangler.prod.toml
nano wrangler.prod.toml

# Add custom domain route:
# [[env.production.routes]]
# pattern = "api.yourdomain.com/*"
# zone_name = "yourdomain.com"

# Redeploy to apply custom domain
wrangler deploy --env production

# Verify deployment
curl https://api.yourdomain.com/api/health
```

### 4. Configure Custom Domain for Pages (Frontend)

**Via Cloudflare Dashboard**:

```bash
# 1. Go to Workers & Pages → edgelink (Pages project)

# 2. Click "Custom domains" tab

# 3. Click "Set up a custom domain"

# 4. Enter: yourdomain.com

# 5. Click "Continue"

# 6. Cloudflare will automatically configure DNS

# 7. Wait for SSL certificate provisioning (1-5 minutes)

# 8. Add www subdomain:
#    - Click "Set up a custom domain"
#    - Enter: www.yourdomain.com
#    - Click "Continue"

# 9. Verify both domains work:
curl -I https://yourdomain.com
curl -I https://www.yourdomain.com
```

### 5. Configure URL Redirects

```bash
# Create Page Rules for redirects

# 1. Go to Cloudflare Dashboard → Rules → Page Rules

# 2. Create rule: Redirect www to non-www (or vice versa)
# If URL matches: www.yourdomain.com/*
# Then the settings are:
#   Forwarding URL: 301 - Permanent Redirect
#   Destination URL: https://yourdomain.com/$1

# 3. Create rule: Force HTTPS
# If URL matches: http://*yourdomain.com/*
# Then the settings are:
#   Always Use HTTPS: On

# 4. Save and deploy
```

---

## SSL/TLS Configuration

### 1. Configure SSL/TLS Mode

```bash
# In Cloudflare Dashboard → SSL/TLS

# Set SSL/TLS encryption mode:
# - Full (strict) - Recommended for production

# This ensures:
# - Client → Cloudflare: HTTPS
# - Cloudflare → Origin: HTTPS with valid cert
```

### 2. Enable HSTS (HTTP Strict Transport Security)

```bash
# In Cloudflare Dashboard → SSL/TLS → Edge Certificates

# Enable HSTS:
# - Status: Enabled
# - Max Age Header: 6 months (15768000)
# - Apply HSTS to subdomains: Yes
# - Preload: Yes (optional, submit to browsers)
# - No-Sniff Header: Yes

# This adds header:
# Strict-Transport-Security: max-age=15768000; includeSubDomains; preload
```

### 3. Enable Always Use HTTPS

```bash
# In Cloudflare Dashboard → SSL/TLS → Edge Certificates

# Enable "Always Use HTTPS": On

# This automatically redirects all HTTP requests to HTTPS
```

### 4. Configure Minimum TLS Version

```bash
# In Cloudflare Dashboard → SSL/TLS → Edge Certificates

# Set Minimum TLS Version: 1.2 or higher

# Disable old protocols:
# - TLS 1.0: Disabled
# - TLS 1.1: Disabled
# - TLS 1.2: Enabled
# - TLS 1.3: Enabled
```

### 5. Enable Opportunistic Encryption

```bash
# In Cloudflare Dashboard → SSL/TLS → Edge Certificates

# Enable:
# - Opportunistic Encryption: On
# - TLS 1.3: On
# - Automatic HTTPS Rewrites: On
```

### 6. Verify SSL Configuration

```bash
# Test SSL configuration
curl -I https://yourdomain.com

# Check for security headers:
# Strict-Transport-Security: max-age=15768000; includeSubDomains; preload
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY

# Test with SSL Labs
# https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com

# Aim for A+ rating
```

---

## Production Monitoring

### 1. Cloudflare Analytics

```bash
# Enable Analytics

# In Cloudflare Dashboard → Analytics & Logs

# Available metrics:
# - Requests per second
# - Bandwidth usage
# - Threats blocked
# - Response codes
# - Top countries
# - Top URLs

# Configure alerts:
# - High error rate (>5%)
# - Traffic spikes (>500% increase)
# - Downtime detection
```

### 2. Set Up Cloudflare Logpush (Recommended for Production)

```bash
# Enable Logpush for detailed logs

# In Cloudflare Dashboard → Analytics & Logs → Logpush

# Create Logpush job:
# 1. Select dataset: HTTP requests
# 2. Select destination: S3, GCS, or Cloudflare R2
# 3. Configure fields to include
# 4. Enable job

# Or via wrangler:
wrangler logpush create \
  --name="edgelink-production-logs" \
  --destination="s3://your-bucket/logs/" \
  --dataset="http_requests" \
  --fields="all"
```

### 3. Set Up Error Tracking (Sentry)

```bash
# Install Sentry SDK in backend
cd backend
npm install @sentry/node @sentry/tracing

# Configure Sentry in src/index.ts
# Add to top of file:
# import * as Sentry from "@sentry/node";
#
# Sentry.init({
#   dsn: env.SENTRY_DSN,
#   environment: "production",
#   tracesSampleRate: 0.1,
# });

# Set Sentry DSN secret
wrangler secret put SENTRY_DSN --env production
# Enter your Sentry DSN

# Install Sentry SDK in frontend
cd ../frontend
npm install @sentry/nextjs

# Initialize Sentry
npx @sentry/wizard@latest -i nextjs

# Follow prompts to configure
```

### 4. Set Up Uptime Monitoring

```bash
# Use external uptime monitoring service

# Recommended services:
# - UptimeRobot (free)
# - Pingdom
# - StatusCake
# - Cloudflare Health Checks (paid)

# Configure monitors for:
# - https://yourdomain.com (HTTP 200)
# - https://api.yourdomain.com/api/health (HTTP 200)
# - Check interval: 5 minutes
# - Alert if down for: 2 consecutive checks

# Example with UptimeRobot:
# 1. Sign up at https://uptimerobot.com
# 2. Add New Monitor
# 3. Monitor Type: HTTP(s)
# 4. Friendly Name: EdgeLink Frontend
# 5. URL: https://yourdomain.com
# 6. Monitoring Interval: 5 minutes
# 7. Alert Contacts: your-email@domain.com
```

Create monitoring script for self-hosting:

```bash
cat > monitor-prod.sh << 'EOF'
#!/bin/bash

# Production Uptime Monitor

PROD_FRONTEND="https://yourdomain.com"
PROD_API="https://api.yourdomain.com"
ALERT_EMAIL="alerts@yourdomain.com"
ALERT_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

check_endpoint() {
  local name=$1
  local url=$2
  local expected_code=$3

  response=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10)

  if [ "$response" -eq "$expected_code" ]; then
    echo "[$(date)] ✓ $name is UP (HTTP $response)"
    return 0
  else
    echo "[$(date)] ✗ $name is DOWN (HTTP $response)"

    # Send alert
    curl -X POST "$ALERT_WEBHOOK" \
      -H 'Content-Type: application/json' \
      -d "{\"text\":\"🚨 ALERT: $name is DOWN (HTTP $response)\"}" \
      2>/dev/null

    return 1
  fi
}

# Check frontend
check_endpoint "Frontend" "$PROD_FRONTEND" 200

# Check API health
check_endpoint "API Health" "$PROD_API/api/health" 200

# Check API functionality (optional)
check_endpoint "API Stats" "$PROD_API/api/stats" 200
EOF

chmod +x monitor-prod.sh

# Run via cron every 5 minutes
# crontab -e
# */5 * * * * /home/user/edgelink/monitor-prod.sh >> /var/log/edgelink-monitor.log 2>&1
```

### 5. Set Up Performance Monitoring

```bash
# Configure Cloudflare Web Analytics (free)

# In Cloudflare Dashboard → Web Analytics

# 1. Add site: yourdomain.com
# 2. Copy the JavaScript snippet
# 3. Add to frontend layout (app/layout.tsx):

# Add before </body>:
# <script defer src='https://static.cloudflareinsights.com/beacon.min.js'
#   data-cf-beacon='{"token": "YOUR_TOKEN"}'></script>

# Metrics tracked:
# - Page views
# - Unique visitors
# - Time on site
# - Bounce rate
# - Core Web Vitals (LCP, FID, CLS)
```

---

## Security Hardening

### 1. Configure Security Headers

Update backend to include security headers:

```typescript
// backend/src/middleware/securityHeaders.ts
export function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  // Prevent clickjacking
  headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME sniffing
  headers.set('X-Content-Type-Options', 'nosniff');

  // XSS Protection
  headers.set('X-XSS-Protection', '1; mode=block');

  // Content Security Policy
  headers.set('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://api.yourdomain.com; " +
    "frame-ancestors 'none';"
  );

  // HSTS (if not using Cloudflare HSTS)
  headers.set('Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // Referrer Policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  headers.set('Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
```

### 2. Enable Rate Limiting

```bash
# Configure Cloudflare Rate Limiting

# In Cloudflare Dashboard → Security → WAF → Rate limiting rules

# Create rule: API Rate Limiting
# If incoming requests match:
#   URI Path contains "/api/"
# Then:
#   Action: Block
#   Duration: 60 seconds
#   Requests: 100 requests per minute
#   Characteristics: IP Address

# Create rule: Login Rate Limiting
# If incoming requests match:
#   URI Path equals "/api/auth/login"
# Then:
#   Action: Challenge (Managed Challenge)
#   Duration: 300 seconds
#   Requests: 5 requests per 5 minutes
#   Characteristics: IP Address
```

### 3. Enable WAF (Web Application Firewall)

```bash
# In Cloudflare Dashboard → Security → WAF

# Enable Managed Rules:
# - Cloudflare Managed Ruleset: On
# - Cloudflare OWASP Core Ruleset: On
# - Cloudflare Exposed Credentials Check: On

# Configure sensitivity: Medium or High

# Create custom rules if needed
```

### 4. Enable DDoS Protection

```bash
# In Cloudflare Dashboard → Security → DDoS

# Enable:
# - HTTP DDoS Attack Protection: On
# - Advanced TCP Protection: On (if available)
# - Advanced DNS Protection: On (if available)

# Configure sensitivity: High
```

### 5. Enable Bot Management

```bash
# In Cloudflare Dashboard → Security → Bots

# Configure Bot Fight Mode: On (Free)
# Or use Super Bot Fight Mode (Paid)

# This blocks:
# - Known malicious bots
# - Automated traffic
# - Scraping attempts
```

### 6. Configure Firewall Rules

```bash
# In Cloudflare Dashboard → Security → WAF → Firewall rules

# Create rule: Block known bad IPs
# If IP Address is in [known_bad_ips_list]
# Then: Block

# Create rule: Allow only from specific countries (optional)
# If Country is not in [US, UK, CA, AU, ...]
# Then: Challenge

# Create rule: Block user agents
# If User Agent contains "curl" or "wget" or "python-requests"
# And URI Path does not start with "/api/"
# Then: Block
```

---

## Performance Optimization

### 1. Enable Cloudflare Caching

```bash
# In Cloudflare Dashboard → Caching → Configuration

# Caching Level: Standard

# Browser Cache TTL: 4 hours

# Always Online: On

# Development Mode: Off (make sure it's off in prod!)
```

### 2. Configure Cache Rules

```bash
# In Cloudflare Dashboard → Caching → Cache Rules

# Create rule: Cache static assets
# If URI Path matches:
#   .*\.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$
# Then:
#   Cache Level: Cache Everything
#   Edge TTL: 1 month
#   Browser TTL: 1 week

# Create rule: Don't cache API
# If URI Path starts with: /api/
# Then:
#   Cache Level: Bypass
```

### 3. Enable Auto Minify

```bash
# In Cloudflare Dashboard → Speed → Optimization

# Enable Auto Minify:
# - JavaScript: On
# - CSS: On
# - HTML: On

# Enable Brotli: On

# Enable Early Hints: On (if available)
```

### 4. Enable Argo Smart Routing (Paid)

```bash
# In Cloudflare Dashboard → Traffic → Argo

# Enable Argo Smart Routing

# This routes traffic through Cloudflare's fastest paths
# Typical improvement: 30% faster

# Cost: $5/month + $0.10/GB
```

### 5. Optimize Images

```bash
# In Cloudflare Dashboard → Speed → Optimization

# Enable:
# - Polish: Lossless (or Lossy for smaller files)
# - WebP: On
# - Mirage: On (paid feature)

# For frontend, use Next.js Image component
# It automatically optimizes images
```

### 6. Enable HTTP/3 (QUIC)

```bash
# In Cloudflare Dashboard → Network

# Enable HTTP/3 (with QUIC): On

# This provides:
# - Faster connection establishment
# - Better performance on mobile
# - Improved reliability
```

---

## Backup & Disaster Recovery

### 1. Database Backup Strategy

```bash
# Automated daily backups (already configured in backup-prod.sh)

# Manual backup before major changes:
cd backend
wrangler d1 export edgelink-production --output=backup-before-update-$(date +%Y%m%d).sql

# Store in multiple locations:
# - Local: /backups/edgelink/
# - Cloud: S3, Google Cloud Storage, or Cloudflare R2
# - Version control: Git (for schema only, not data)
```

Create `backup-to-cloud.sh`:

```bash
cat > backup-to-cloud.sh << 'EOF'
#!/bin/bash

# Backup to Cloud Storage

set -e

BACKUP_FILE="backup-prod-$(date +%Y%m%d-%H%M%S).sql"

# Create backup
echo "Creating backup..."
wrangler d1 export edgelink-production --output="$BACKUP_FILE"

# Compress
echo "Compressing backup..."
gzip "$BACKUP_FILE"

# Upload to S3 (if using AWS)
if command -v aws &> /dev/null; then
  echo "Uploading to S3..."
  aws s3 cp "$BACKUP_FILE.gz" "s3://your-backup-bucket/edgelink/$BACKUP_FILE.gz"
fi

# Upload to Google Cloud Storage (if using GCP)
if command -v gsutil &> /dev/null; then
  echo "Uploading to GCS..."
  gsutil cp "$BACKUP_FILE.gz" "gs://your-backup-bucket/edgelink/$BACKUP_FILE.gz"
fi

# Upload to Cloudflare R2 (if using)
if command -v rclone &> /dev/null; then
  echo "Uploading to R2..."
  rclone copy "$BACKUP_FILE.gz" r2:your-backup-bucket/edgelink/
fi

echo "Backup complete: $BACKUP_FILE.gz"

# Cleanup local file (optional)
# rm "$BACKUP_FILE.gz"
EOF

chmod +x backup-to-cloud.sh
```

### 2. Configuration Backup

```bash
# Backup all configuration files

cat > backup-config.sh << 'EOF'
#!/bin/bash

CONFIG_BACKUP="config-backup-$(date +%Y%m%d-%H%M%S).tar.gz"

tar -czf "$CONFIG_BACKUP" \
  backend/wrangler.prod.toml \
  frontend/.env.production \
  browser-extension/manifest.json \
  *.md \
  scripts/*.sh

echo "Configuration backed up to: $CONFIG_BACKUP"
EOF

chmod +x backup-config.sh
```

### 3. Disaster Recovery Plan

Create `DISASTER_RECOVERY.md`:

```bash
cat > DISASTER_RECOVERY.md << 'EOF'
# Disaster Recovery Plan

## Scenarios and Procedures

### Scenario 1: Database Corruption or Data Loss

**Recovery Steps**:

1. Stop all write operations (if possible)
2. Assess extent of data loss
3. Retrieve latest backup:
   ```bash
   aws s3 cp s3://your-backup-bucket/edgelink/backup-prod-YYYYMMDD.sql.gz .
   gunzip backup-prod-YYYYMMDD.sql.gz
   ```
4. Restore database:
   ```bash
   wrangler d1 execute edgelink-production --file=backup-prod-YYYYMMDD.sql
   ```
5. Verify data integrity
6. Resume operations
7. Investigate root cause

**Recovery Time Objective (RTO)**: 30 minutes
**Recovery Point Objective (RPO)**: 24 hours (daily backups)

### Scenario 2: Worker Deployment Failure

**Recovery Steps**:

1. Identify failed deployment ID
2. Rollback to previous version:
   ```bash
   wrangler rollback --env production <previous-deployment-id>
   ```
3. Verify rollback successful:
   ```bash
   curl https://api.yourdomain.com/api/health
   ```
4. Investigate deployment failure
5. Fix issues and redeploy

**RTO**: 5 minutes
**RPO**: 0 (no data loss)

### Scenario 3: Pages Deployment Failure

**Recovery Steps**:

1. Go to Cloudflare Dashboard → Pages → edgelink
2. Find previous successful deployment
3. Click "Rollback to this deployment"
4. Verify frontend is working
5. Fix deployment issues
6. Redeploy

**RTO**: 10 minutes
**RPO**: 0

### Scenario 4: DNS Issues

**Recovery Steps**:

1. Verify DNS configuration:
   ```bash
   dig yourdomain.com
   dig api.yourdomain.com
   ```
2. Check Cloudflare Dashboard → DNS
3. Verify nameservers:
   ```bash
   dig NS yourdomain.com
   ```
4. If records are missing, restore from backup
5. Wait for DNS propagation (up to 24 hours)

**RTO**: 24 hours (DNS propagation)
**RPO**: 0

### Scenario 5: Complete Service Outage

**Recovery Steps**:

1. Check Cloudflare Status: https://www.cloudflarestatus.com/
2. Verify all services:
   - Workers: Check dashboard
   - Pages: Check dashboard
   - D1: Check dashboard
3. If Cloudflare issue: Wait for resolution
4. If our issue:
   - Check recent deployments
   - Review logs
   - Rollback if needed
   - Contact support if necessary

**RTO**: 1 hour
**RPO**: 24 hours

## Contact Information

**Primary Contact**: Your Name (your-email@domain.com)
**Secondary Contact**: Team Member (team-email@domain.com)
**Cloudflare Support**: Enterprise customers have phone support
**Status Page**: https://status.yourdomain.com (if you have one)

## Post-Incident Review

After any incident:
1. Document what happened
2. Document what was done
3. Identify root cause
4. Create action items to prevent recurrence
5. Update this document with lessons learned
EOF
```

---

## CI/CD Pipeline Setup

### 1. Create GitHub Actions Workflow

```bash
mkdir -p .github/workflows

cat > .github/workflows/deploy-production.yml << 'EOF'
name: Deploy to Production

on:
  push:
    branches:
      - main
      - production
  workflow_dispatch:  # Allow manual trigger

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Security audit
        run: npm audit --audit-level=moderate

  deploy-backend:
    name: Deploy Backend to Production
    needs: test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd backend
          npm ci --production

      - name: Build backend
        run: |
          cd backend
          npm run build

      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: 'backend'
          command: deploy --env production

  deploy-frontend:
    name: Deploy Frontend to Production
    needs: test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd frontend
          npm ci --production

      - name: Build frontend
        run: |
          cd frontend
          npm run build
        env:
          NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
          NEXT_PUBLIC_ENVIRONMENT: production

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: 'frontend'
          command: pages deploy .next --project-name=edgelink

  notify:
    name: Send Deployment Notification
    needs: [deploy-backend, deploy-frontend]
    runs-on: ubuntu-latest
    if: always()

    steps:
      - name: Send Slack notification
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()
EOF

echo "Created GitHub Actions workflow"
```

### 2. Configure GitHub Secrets

```bash
# Add these secrets to GitHub:
# Settings → Secrets and variables → Actions → New repository secret

# Required secrets:
# - CLOUDFLARE_API_TOKEN: Your Cloudflare API token
# - NEXT_PUBLIC_API_URL: https://api.yourdomain.com
# - SLACK_WEBHOOK: Your Slack webhook URL (optional)

# To get Cloudflare API token:
# 1. Go to https://dash.cloudflare.com/profile/api-tokens
# 2. Create Token
# 3. Use template "Edit Cloudflare Workers"
# 4. Add permissions: Workers Scripts (Edit), Pages (Edit), D1 (Edit)
# 5. Copy token and add to GitHub secrets
```

### 3. Create Staging Workflow (Optional)

```bash
cat > .github/workflows/deploy-staging.yml << 'EOF'
name: Deploy to Staging

on:
  push:
    branches:
      - develop
      - staging

jobs:
  deploy-staging:
    name: Deploy to Staging Environment
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Deploy backend to staging
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: 'backend'
          command: deploy --env staging

      - name: Deploy frontend to staging
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: 'frontend'
          command: pages deploy .next --project-name=edgelink-staging
EOF
```

---

## Production Rollback Procedures

### 1. Backend Rollback

```bash
# List recent deployments
wrangler deployments list --env production

# Output:
# Created         ID                       Version
# 2 hours ago     abcd-1234-current        v3
# 1 day ago       wxyz-5678-previous       v2
# 2 days ago      efgh-9012-older          v1

# Rollback to previous deployment
wrangler rollback --env production wxyz-5678-previous

# Verify rollback
curl https://api.yourdomain.com/api/health

# Check logs
wrangler tail --env production
```

### 2. Frontend Rollback

**Via Cloudflare Dashboard**:
1. Go to Workers & Pages → edgelink
2. Click "Deployments" tab
3. Find the previous successful deployment
4. Click three dots (⋯) → "Rollback to this deployment"
5. Confirm rollback
6. Verify: `curl https://yourdomain.com`

**Via Command Line**:
```bash
# Redeploy previous commit
git checkout <previous-commit-hash>
cd frontend
npm run build
npx wrangler pages deploy .next --project-name=edgelink --branch=main
```

### 3. Database Rollback

```bash
# Restore from backup
cd backend

# List available backups
ls -lh /backups/edgelink/ | grep "backup-prod"

# Or list from cloud storage
aws s3 ls s3://your-backup-bucket/edgelink/

# Download and restore
aws s3 cp s3://your-backup-bucket/edgelink/backup-prod-20241107.sql.gz .
gunzip backup-prod-20241107.sql.gz

# Restore database
wrangler d1 execute edgelink-production --file=backup-prod-20241107.sql

# Verify restoration
wrangler d1 execute edgelink-production --command="SELECT COUNT(*) FROM users;"
```

---

## Post-Deployment Verification

### 1. Run Production Tests

```bash
cd ..

# Create production test script
cat > test-prod.sh << 'EOF'
#!/bin/bash

set -e

PROD_API="https://api.yourdomain.com"
PROD_FRONTEND="https://yourdomain.com"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

PASSED=0
FAILED=0

test_endpoint() {
  local name=$1
  local url=$2
  local expected=$3

  response=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10)

  if [ "$response" -eq "$expected" ]; then
    echo -e "${GREEN}✓${NC} $name (HTTP $response)"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗${NC} $name (HTTP $response, expected $expected)"
    FAILED=$((FAILED + 1))
  fi
}

echo "Production Verification Tests"
echo "=============================="

# Health checks
test_endpoint "API Health" "$PROD_API/api/health" 200
test_endpoint "Frontend" "$PROD_FRONTEND" 200

# SSL/TLS checks
echo ""
echo "SSL/TLS Configuration:"
ssl_grade=$(curl -s "https://api.ssllabs.com/api/v3/analyze?host=yourdomain.com" | grep -o '"grade":"[^"]*"' | head -1)
echo "  SSL Labs Grade: $ssl_grade"

# Security headers
echo ""
echo "Security Headers:"
headers=$(curl -sI "$PROD_FRONTEND")
echo "$headers" | grep -i "strict-transport-security" || echo "  ✗ Missing HSTS"
echo "$headers" | grep -i "x-frame-options" || echo "  ✗ Missing X-Frame-Options"
echo "$headers" | grep -i "x-content-type-options" || echo "  ✗ Missing X-Content-Type-Options"

echo ""
echo "=============================="
echo "Passed: $PASSED"
echo "Failed: $FAILED"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
fi
EOF

chmod +x test-prod.sh

# Run tests
./test-prod.sh
```

### 2. Manual Verification Checklist

```markdown
## Production Deployment Verification

Date: ___________
Deployed by: ___________

### Infrastructure
- [ ] Backend deployed successfully
- [ ] Frontend deployed successfully
- [ ] Database migrated/seeded
- [ ] Custom domains working
- [ ] SSL certificates valid
- [ ] DNS records correct

### Functionality
- [ ] User registration works
- [ ] User login works
- [ ] URL shortening works
- [ ] URL redirection works
- [ ] Analytics tracking works
- [ ] QR code generation works
- [ ] API keys work
- [ ] Webhooks deliver
- [ ] Account deletion works

### Performance
- [ ] Frontend loads in < 3 seconds
- [ ] API responds in < 500ms
- [ ] No console errors in browser
- [ ] Mobile responsive

### Security
- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] Rate limiting active
- [ ] CORS properly configured
- [ ] JWT authentication working

### Monitoring
- [ ] Cloudflare Analytics enabled
- [ ] Logs accessible
- [ ] Error tracking active (Sentry)
- [ ] Uptime monitoring active
- [ ] Alerts configured

### Browser Extension
- [ ] Chrome version submitted
- [ ] Firefox version submitted
- [ ] Store listings complete

### Documentation
- [ ] Deployment documented
- [ ] Rollback procedures tested
- [ ] Team notified

Verified by: ___________
Date: ___________
```

---

## Maintenance & Updates

### 1. Regular Maintenance Tasks

**Weekly**:
```bash
# Check for security updates
npm audit

# Review error logs
wrangler tail --env production | grep ERROR

# Check uptime status
curl https://api.yourdomain.com/api/health
```

**Monthly**:
```bash
# Update dependencies
npm update
npm audit fix

# Review analytics
# Check Cloudflare Dashboard for usage trends

# Verify backups
ls -lh /backups/edgelink/ | tail -5

# Test disaster recovery (in staging)
```

**Quarterly**:
```bash
# Security audit
npm audit
snyk test

# Performance audit
# Run Lighthouse on frontend
npm install -g lighthouse
lighthouse https://yourdomain.com

# Review and update documentation
# Review and update disaster recovery plan
```

### 2. Updating Production

```bash
# Never update production directly!
# Always test in dev/staging first

# 1. Deploy to dev
git checkout dev
git pull origin main
# Test thoroughly

# 2. Deploy to staging (if available)
git checkout staging
git pull origin main
# Test thoroughly

# 3. Deploy to production
git checkout production
git pull origin main
git push origin production  # Triggers CI/CD

# Or manual deployment:
cd backend
wrangler deploy --env production

cd ../frontend
npm run build
npx wrangler pages deploy .next --project-name=edgelink
```

### 3. Monitoring Costs

```bash
# Monitor Cloudflare usage and costs

# Workers usage:
# - Free tier: 100,000 requests/day
# - Paid: $5/month + $0.50/million requests

# Pages usage:
# - Free tier: 500 builds/month
# - Paid: Unlimited builds

# D1 usage:
# - Free tier: 100,000 reads/day, 1,000 writes/day
# - Paid: Higher limits

# Check current usage:
# Cloudflare Dashboard → Account Home → Workers & Pages → Usage

# Set up billing alerts:
# Account Home → Billing → Set up notifications
```

---

## Support & Resources

### Cloudflare Resources
- Workers Docs: https://developers.cloudflare.com/workers/
- Pages Docs: https://developers.cloudflare.com/pages/
- D1 Docs: https://developers.cloudflare.com/d1/
- Community: https://community.cloudflare.com/

### EdgeLink Resources
- Repository: https://github.com/ajithvnr2001/edgelink
- Documentation: See README.md and WEEK*.md files
- Support: support@yourdomain.com

### Emergency Contacts
- Primary: [Your name] - [email]
- Secondary: [Team member] - [email]
- Cloudflare Support: Enterprise customers have 24/7 phone support

---

**Last Updated**: November 8, 2024
**Version**: 1.0.0
**Environment**: Production

**Deployment Checklist**: Complete all items in [Pre-Production Checklist](#pre-production-checklist) before deploying

**Next Steps**: After deployment, monitor closely for 24-48 hours and address any issues immediately.
