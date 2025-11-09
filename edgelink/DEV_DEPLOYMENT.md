# Development Environment Deployment Guide

This guide covers deploying EdgeLink to a **development environment** for testing and validation before production deployment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Environment Setup](#development-environment-setup)
3. [Database Setup (D1 - Dev)](#database-setup-d1---dev)
4. [Backend Deployment (Cloudflare Workers - Dev)](#backend-deployment-cloudflare-workers---dev)
5. [Frontend Deployment (Cloudflare Pages - Dev)](#frontend-deployment-cloudflare-pages---dev)
6. [Browser Extension Testing](#browser-extension-testing)
7. [Development Testing](#development-testing)
8. [Development Monitoring](#development-monitoring)
9. [Troubleshooting Dev Issues](#troubleshooting-dev-issues)
10. [Rolling Back Dev Changes](#rolling-back-dev-changes)
11. [Dev to Prod Checklist](#dev-to-prod-checklist)

---

## Prerequisites

### Required Accounts

1. **Cloudflare Account**
   - Sign up at https://dash.cloudflare.com/sign-up
   - Free tier is sufficient for dev environment
   - No payment method required for dev

2. **GitHub Account**
   - For source code management
   - Fork or clone the repository

3. **Domain (Optional for Dev)**
   - You can use Cloudflare-provided URLs for dev
   - Example: `edgelink-dev.workers.dev` and `edgelink-dev.pages.dev`

### Required Tools

```bash
# Install Node.js (v18 or higher)
node --version  # Should show v18.x or higher

# Install npm (comes with Node.js)
npm --version

# Install Wrangler CLI
npm install -g wrangler

# Verify Wrangler installation
wrangler --version

# Install Git
git --version
```

### Clone Repository

```bash
# Clone the repository
git clone https://github.com/ajithvnr2001/edgelink.git
cd edgelink

# Create a dev branch
git checkout -b dev-deployment

# Install all dependencies
npm install
```

---

## Development Environment Setup

### 1. Configure Wrangler for Dev

```bash
# Login to Cloudflare
wrangler login

# This will open a browser window for authentication
# Authorize Wrangler to access your Cloudflare account
```

### 2. Create Development Configuration Files

Create `wrangler.dev.toml` in the `backend` directory:

```bash
cd backend
cat > wrangler.dev.toml << 'EOF'
name = "edgelink-dev"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.dev]
name = "edgelink-dev"
workers_dev = true

[[env.dev.d1_databases]]
binding = "DB"
database_name = "edgelink-dev"
database_id = "YOUR_DEV_DB_ID"

[env.dev.vars]
ENVIRONMENT = "development"
LOG_LEVEL = "debug"
FRONTEND_URL = "http://localhost:3000"
ALLOW_REGISTRATION = "true"

# Rate limiting (relaxed for dev)
[env.dev.limits]
cpu_ms = 50
EOF

echo "Created wrangler.dev.toml"
```

Create `.dev.vars` file in the `backend` directory for secrets:

```bash
cat > .dev.vars << 'EOF'
JWT_SECRET=dev-secret-change-me-12345678901234567890
REFRESH_TOKEN_SECRET=dev-refresh-secret-12345678901234567890
JWT_EXPIRY=7d
REFRESH_TOKEN_EXPIRY=30d
EOF

echo "Created .dev.vars file"
```

**Important**: The `.dev.vars` file should be in `.gitignore` (it already is).

---

## Database Setup (D1 - Dev)

### 1. Create Development Database

```bash
cd backend

# Create a new D1 database for development
wrangler d1 create edgelink-dev

# Output will show:
# [[d1_databases]]
# binding = "DB"
# database_name = "edgelink-dev"
# database_id = "xxxx-xxxx-xxxx-xxxx"

# Copy the database_id and update wrangler.dev.toml
```

Update the `database_id` in `wrangler.dev.toml`:

```bash
# Edit wrangler.dev.toml and replace YOUR_DEV_DB_ID with the actual ID
nano wrangler.dev.toml
# or
vim wrangler.dev.toml
```

### 2. Initialize Database Schema

```bash
# Execute the schema on the dev database
wrangler d1 execute edgelink-dev --file=./schema.sql

# Expected output:
# 🌀 Mapping SQL input into an array of statements
# 🌀 Executing on edgelink-dev (xxxx-xxxx-xxxx-xxxx):
# 🚣 Executed X commands in Y.ZZms
```

### 3. Verify Database Setup

```bash
# List all tables
wrangler d1 execute edgelink-dev --command="SELECT name FROM sqlite_master WHERE type='table';"

# Expected tables:
# - users
# - urls
# - analytics
# - api_keys
# - webhooks
# - qr_codes
# - ab_tests
# - ab_test_events
# - analytics_archive
# - team_members
# - team_invitations
```

### 4. Seed Development Data (Optional)

Create `seed-dev.sql`:

```bash
cat > seed-dev.sql << 'EOF'
-- Insert test user (password: TestPass123!)
INSERT INTO users (id, email, password_hash, first_name, last_name, is_verified, created_at)
VALUES (
  'dev-user-001',
  'dev@test.com',
  '$2a$10$rB8Y9YNOLqZ6nqFqy5YyYeXKLh5M7HqL8YyQY5YyQY5YyQY5YyQY5',
  'Dev',
  'User',
  1,
  datetime('now')
);

-- Insert test URL
INSERT INTO urls (id, user_id, original_url, short_code, title, created_at)
VALUES (
  'dev-url-001',
  'dev-user-001',
  'https://example.com/test',
  'devtest',
  'Development Test URL',
  datetime('now')
);

-- Insert test API key
INSERT INTO api_keys (id, user_id, key, name, created_at)
VALUES (
  'dev-key-001',
  'dev-user-001',
  'dev_test_key_12345',
  'Development Test Key',
  datetime('now')
);
EOF

# Execute seed data
wrangler d1 execute edgelink-dev --file=./seed-dev.sql

echo "Development database seeded with test data"
```

### 5. Database Backup (Dev)

```bash
# Create a backup of dev database
wrangler d1 export edgelink-dev --output=backup-dev-$(date +%Y%m%d-%H%M%S).sql

# Example output: backup-dev-20241108-143022.sql
```

---

## Backend Deployment (Cloudflare Workers - Dev)

### 1. Install Backend Dependencies

```bash
cd backend
npm install

# Verify TypeScript compilation
npm run build
```

### 2. Set Development Secrets

```bash
# Secrets are loaded from .dev.vars automatically for local dev
# For deployed dev worker, set them explicitly:

# Set JWT secret for dev
wrangler secret put JWT_SECRET --env dev
# When prompted, enter: dev-secret-change-me-12345678901234567890

# Set refresh token secret for dev
wrangler secret put REFRESH_TOKEN_SECRET --env dev
# When prompted, enter: dev-refresh-secret-12345678901234567890

# Verify secrets are set
wrangler secret list --env dev
```

### 3. Test Backend Locally

```bash
# Start local development server
npm run dev
# or
wrangler dev --env dev --local

# The API will be available at: http://localhost:8787

# In a new terminal, test the API:
curl http://localhost:8787/api/health

# Expected response:
# {"status":"ok","timestamp":"2024-11-08T20:00:00.000Z"}
```

### 4. Deploy Backend to Dev Environment

```bash
# Deploy to Cloudflare Workers (dev environment)
wrangler deploy --env dev

# Expected output:
# ⛅️ wrangler 3.x.x
# Total Upload: XX.XX KiB / gzip: XX.XX KiB
# Uploaded edgelink-dev (X.XX sec)
# Published edgelink-dev (X.XX sec)
#   https://edgelink-dev.YOUR_SUBDOMAIN.workers.dev
# Current Deployment ID: xxxx-xxxx-xxxx-xxxx
```

### 5. Verify Backend Deployment

```bash
# Test health endpoint
curl https://edgelink-dev.YOUR_SUBDOMAIN.workers.dev/api/health

# Test registration endpoint
curl -X POST https://edgelink-dev.YOUR_SUBDOMAIN.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Expected response:
# {"message":"User registered successfully","userId":"..."}

# Test login endpoint
curl -X POST https://edgelink-dev.YOUR_SUBDOMAIN.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'

# Expected response with tokens
```

### 6. View Backend Logs (Dev)

```bash
# View real-time logs
wrangler tail --env dev

# In another terminal, make requests to see logs:
curl https://edgelink-dev.YOUR_SUBDOMAIN.workers.dev/api/health

# Logs will appear in the tail terminal with debug information
```

---

## Frontend Deployment (Cloudflare Pages - Dev)

### 1. Configure Frontend Environment

Create `.env.local` for local development:

```bash
cd ../frontend

cat > .env.local << 'EOF'
# Development Environment Variables

# Backend API URL (from Workers deployment)
NEXT_PUBLIC_API_URL=https://edgelink-dev.YOUR_SUBDOMAIN.workers.dev

# Frontend URL
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000

# Environment
NEXT_PUBLIC_ENVIRONMENT=development

# Feature Flags (all enabled for dev)
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_AB_TESTING=true
NEXT_PUBLIC_ENABLE_WEBHOOKS=true
NEXT_PUBLIC_ENABLE_TEAMS=true
NEXT_PUBLIC_ENABLE_ACCOUNT_DELETION=true

# Debug mode
NEXT_PUBLIC_DEBUG=true
EOF

echo "Created .env.local"
```

**Important**: Replace `YOUR_SUBDOMAIN` with your actual Workers subdomain from step 4 above.

### 2. Install Frontend Dependencies

```bash
npm install

# Verify Next.js installation
npx next --version
```

### 3. Test Frontend Locally

```bash
# Start development server
npm run dev

# The frontend will be available at: http://localhost:3000

# Open in browser:
# - Visit http://localhost:3000
# - Test registration
# - Test login
# - Test creating a short URL
```

### 4. Build Frontend for Dev Deployment

```bash
# Build the production version
npm run build

# This creates a .next directory with the built application
# Build time: 1-3 minutes depending on your system

# Expected output:
# Route (app)                              Size     First Load JS
# ┌ ○ /                                    X kB          XX kB
# ├ ○ /dashboard                           X kB          XX kB
# ├ ○ /login                               X kB          XX kB
# └ ○ /register                            X kB          XX kB
```

### 5. Deploy Frontend to Cloudflare Pages (Dev)

```bash
# First, create a Pages project
npx wrangler pages project create edgelink-dev

# Choose:
# - Production branch: dev
# - Preview branches: (leave empty for dev)

# Deploy to Pages
npx wrangler pages deploy .next --project-name=edgelink-dev --branch=dev

# Expected output:
# ✨ Success! Uploaded X files (X.XX sec)
# ✨ Deployment complete! Take a peek over at
#    https://xxxxxxxx.edgelink-dev.pages.dev
```

### 6. Configure Pages Environment Variables

```bash
# Set environment variables for Pages
wrangler pages secret put NEXT_PUBLIC_API_URL --project-name=edgelink-dev
# When prompted, enter: https://edgelink-dev.YOUR_SUBDOMAIN.workers.dev

wrangler pages secret put NEXT_PUBLIC_ENVIRONMENT --project-name=edgelink-dev
# When prompted, enter: development

wrangler pages secret put NEXT_PUBLIC_DEBUG --project-name=edgelink-dev
# When prompted, enter: true

# List all environment variables
wrangler pages secret list --project-name=edgelink-dev
```

### 7. Verify Frontend Deployment

```bash
# Test the deployed frontend
curl https://xxxxxxxx.edgelink-dev.pages.dev

# Open in browser:
# Visit https://xxxxxxxx.edgelink-dev.pages.dev
# Test all features:
# - Registration
# - Login
# - Dashboard
# - URL shortening
# - Analytics
# - Account deletion
```

### 8. Update Backend CORS for Frontend

Update the backend to allow requests from the dev frontend:

```bash
cd ../backend

# Update wrangler.dev.toml
cat >> wrangler.dev.toml << 'EOF'

[env.dev.vars]
FRONTEND_URL = "https://xxxxxxxx.edgelink-dev.pages.dev"
EOF

# Redeploy backend with new CORS settings
wrangler deploy --env dev
```

**Important**: Replace `xxxxxxxx` with your actual Pages deployment URL.

---

## Browser Extension Testing

### 1. Prepare Extension for Dev Testing

```bash
cd ../browser-extension

# Update manifest.json with dev API endpoint
cat > manifest.json << 'EOF'
{
  "manifest_version": 3,
  "name": "EdgeLink - Dev",
  "version": "1.0.0-dev",
  "description": "Development version of EdgeLink URL Shortener",
  "permissions": [
    "activeTab",
    "contextMenus",
    "storage",
    "clipboardWrite",
    "notifications"
  ],
  "host_permissions": [
    "http://localhost:8787/*",
    "https://edgelink-dev.*.workers.dev/*"
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
  }
}
EOF

echo "Updated manifest.json for dev"
```

### 2. Update Extension API Configuration

```bash
# Update lib/api.js with dev API URL
nano lib/api.js
# or
vim lib/api.js

# Change the API_BASE_URL to:
# const API_BASE_URL = 'https://edgelink-dev.YOUR_SUBDOMAIN.workers.dev';
```

### 3. Load Extension in Chrome (Dev Mode)

```bash
# Create a dev build
mkdir -p ../extension-dev-build
cp -r * ../extension-dev-build/

echo "Extension dev build ready at: $(pwd)/../extension-dev-build"
```

**Load in Chrome**:

1. Open Chrome and navigate to: `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `extension-dev-build` folder
5. The extension will appear in your extensions list

### 4. Test Extension Features

```bash
# Test checklist:
echo "Extension Testing Checklist:"
echo "1. [ ] Click extension icon - popup should open"
echo "2. [ ] Login with dev credentials"
echo "3. [ ] Shorten current page URL"
echo "4. [ ] Use context menu to shorten selected text"
echo "5. [ ] Use keyboard shortcut Ctrl+Shift+S"
echo "6. [ ] View recent links"
echo "7. [ ] Test QR code generation"
echo "8. [ ] Test custom slugs"
echo "9. [ ] Test analytics view"
echo "10. [ ] Test account deletion in options"
echo "11. [ ] Test export data"
echo "12. [ ] Check notifications appear correctly"
```

### 5. View Extension Logs

**In Chrome**:
1. Right-click the extension icon
2. Click "Inspect popup" (for popup debugging)
3. Or go to `chrome://extensions/` → Details → "Inspect views: service worker" (for background script)

**Console logs will show**:
- API requests
- Authentication status
- Errors and warnings

### 6. Load Extension in Firefox (Dev Mode)

```bash
# Firefox requires web-ext tool
npm install -g web-ext

cd ../extension-dev-build

# Run extension in Firefox
web-ext run --firefox-profile=dev-profile

# This will:
# - Create a temporary Firefox profile
# - Load the extension
# - Open Firefox with the extension installed

# Or for persistent testing:
web-ext run --firefox-profile=/path/to/your/firefox/profile --keep-profile-changes
```

**Manual Loading in Firefox**:
1. Open Firefox and navigate to: `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select any file in the `extension-dev-build` folder (e.g., `manifest.json`)
4. The extension will be loaded until you close Firefox

---

## Development Testing

### 1. End-to-End Testing Script

Create `test-dev.sh`:

```bash
cd ..
cat > test-dev.sh << 'EOF'
#!/bin/bash

# Development Environment E2E Test Script

set -e

echo "🧪 Starting EdgeLink Development Tests..."

DEV_API="https://edgelink-dev.YOUR_SUBDOMAIN.workers.dev"
DEV_FRONTEND="https://xxxxxxxx.edgelink-dev.pages.dev"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test API endpoint
test_endpoint() {
  local name=$1
  local url=$2
  local method=$3
  local data=$4

  echo -n "Testing $name... "

  if [ "$method" = "POST" ]; then
    response=$(curl -s -X POST "$url" \
      -H "Content-Type: application/json" \
      -d "$data" \
      -w "\n%{http_code}")
  else
    response=$(curl -s "$url" -w "\n%{http_code}")
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ FAILED${NC} (HTTP $http_code)"
    echo "Response: $body"
    FAILED=$((FAILED + 1))
  fi
}

# Test 1: Health Check
test_endpoint "Health Check" "$DEV_API/api/health" "GET"

# Test 2: User Registration
RANDOM_EMAIL="test-$(date +%s)@dev.test"
test_endpoint "User Registration" "$DEV_API/api/auth/register" "POST" \
  "{\"email\":\"$RANDOM_EMAIL\",\"password\":\"TestPass123!\",\"firstName\":\"Test\",\"lastName\":\"User\"}"

# Test 3: User Login
LOGIN_RESPONSE=$(curl -s -X POST "$DEV_API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$RANDOM_EMAIL\",\"password\":\"TestPass123!\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo -e "Testing User Login... ${GREEN}✓ PASSED${NC} (Token received)"
  PASSED=$((PASSED + 1))
else
  echo -e "Testing User Login... ${RED}✗ FAILED${NC} (No token)"
  FAILED=$((FAILED + 1))
fi

# Test 4: Create Short URL (requires authentication)
test_endpoint "Create Short URL" "$DEV_API/api/urls" "POST" \
  "{\"url\":\"https://example.com/test-$(date +%s)\"}"

# Test 5: Frontend Availability
echo -n "Testing Frontend Availability... "
frontend_status=$(curl -s -o /dev/null -w "%{http_code}" "$DEV_FRONTEND")
if [ "$frontend_status" -eq 200 ]; then
  echo -e "${GREEN}✓ PASSED${NC} (HTTP $frontend_status)"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}✗ FAILED${NC} (HTTP $frontend_status)"
  FAILED=$((FAILED + 1))
fi

# Test Summary
echo ""
echo "======================================"
echo "Test Results:"
echo "  Passed: $PASSED"
echo "  Failed: $FAILED"
echo "======================================"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed.${NC}"
  exit 1
fi
EOF

chmod +x test-dev.sh

echo "Created test-dev.sh"
```

**Important**: Update `DEV_API` and `DEV_FRONTEND` with your actual URLs.

### 2. Run Development Tests

```bash
# Run the test script
./test-dev.sh

# Expected output:
# 🧪 Starting EdgeLink Development Tests...
# Testing Health Check... ✓ PASSED (HTTP 200)
# Testing User Registration... ✓ PASSED (HTTP 201)
# Testing User Login... ✓ PASSED (Token received)
# Testing Create Short URL... ✓ PASSED (HTTP 201)
# Testing Frontend Availability... ✓ PASSED (HTTP 200)
#
# ======================================
# Test Results:
#   Passed: 5
#   Failed: 0
# ======================================
# All tests passed!
```

### 3. Manual Testing Checklist

Create `MANUAL_TEST_CHECKLIST.md`:

```bash
cat > MANUAL_TEST_CHECKLIST.md << 'EOF'
# Manual Testing Checklist - Development Environment

## Authentication
- [ ] Register new user
- [ ] Login with email/password
- [ ] Logout
- [ ] Remember me functionality
- [ ] Password validation (min 8 chars, uppercase, lowercase, number)

## URL Shortening
- [ ] Shorten URL with auto-generated slug
- [ ] Shorten URL with custom slug
- [ ] Validate URL format
- [ ] Handle duplicate slugs
- [ ] Test with various URL types (http, https, with/without www)

## Dashboard
- [ ] View list of shortened URLs
- [ ] Copy short URL to clipboard
- [ ] Edit URL details
- [ ] Delete URL
- [ ] View analytics for each URL
- [ ] Filter/search URLs

## Analytics
- [ ] View click analytics
- [ ] View geographic data
- [ ] View referrer data
- [ ] View device/browser data
- [ ] Export analytics data
- [ ] Date range filtering

## QR Codes
- [ ] Generate QR code for URL
- [ ] Download QR code
- [ ] Scan QR code with mobile device
- [ ] QR code redirects correctly

## A/B Testing
- [ ] Create A/B test
- [ ] View A/B test results
- [ ] Edit A/B test
- [ ] Delete A/B test
- [ ] Test variant distribution

## API Keys
- [ ] Generate API key
- [ ] Test API with key
- [ ] Revoke API key
- [ ] List all API keys

## Webhooks
- [ ] Create webhook
- [ ] Test webhook delivery
- [ ] View webhook logs
- [ ] Delete webhook

## Teams
- [ ] Create team
- [ ] Invite team member
- [ ] Accept invitation
- [ ] Remove team member
- [ ] Transfer team ownership

## Account Management
- [ ] View profile
- [ ] Edit profile
- [ ] Export user data
- [ ] Schedule account deletion
- [ ] Cancel account deletion
- [ ] Immediate account deletion

## Browser Extension
- [ ] Install extension
- [ ] Login via extension
- [ ] Shorten current page
- [ ] Use context menu
- [ ] Use keyboard shortcut
- [ ] View recent links
- [ ] Extension settings
- [ ] Account deletion via extension

## Error Handling
- [ ] Invalid credentials
- [ ] Network errors
- [ ] Server errors (simulate)
- [ ] Validation errors
- [ ] Rate limiting (test high volume)

## Security
- [ ] XSS prevention (test with malicious input)
- [ ] SQL injection prevention
- [ ] CSRF protection
- [ ] Token expiration handling
- [ ] Refresh token flow

## Performance
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] Large dataset handling (1000+ URLs)
- [ ] Concurrent requests handling

## Mobile Responsiveness
- [ ] Test on mobile viewport
- [ ] Touch interactions
- [ ] Mobile menu navigation
- [ ] Forms on mobile

## Browser Compatibility
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (if available)
- [ ] Edge

## Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Color contrast
- [ ] Focus indicators
EOF

echo "Created MANUAL_TEST_CHECKLIST.md"
```

---

## Development Monitoring

### 1. View Real-Time Logs

```bash
# Backend logs
cd backend
wrangler tail --env dev

# This shows:
# - API requests
# - Errors and exceptions
# - Database queries
# - Performance metrics
```

### 2. Cloudflare Dashboard Monitoring

**For Workers (Backend)**:
1. Go to: https://dash.cloudflare.com/
2. Select your account
3. Click "Workers & Pages"
4. Click "edgelink-dev"
5. View metrics:
   - Requests per second
   - Error rate
   - CPU time
   - Success rate

**For Pages (Frontend)**:
1. Go to: https://dash.cloudflare.com/
2. Select your account
3. Click "Workers & Pages"
4. Click "edgelink-dev" (Pages project)
5. View metrics:
   - Deployments
   - Analytics
   - Build logs

**For D1 (Database)**:
1. Go to: https://dash.cloudflare.com/
2. Select your account
3. Click "Storage & Databases" → "D1"
4. Click "edgelink-dev"
5. View metrics:
   - Total rows
   - Database size
   - Query count
   - Read/write operations

### 3. Set Up Development Alerts

```bash
# Create a monitoring script
cat > monitor-dev.sh << 'EOF'
#!/bin/bash

# Simple uptime monitoring for dev environment

DEV_API="https://edgelink-dev.YOUR_SUBDOMAIN.workers.dev"

while true; do
  response=$(curl -s -o /dev/null -w "%{http_code}" "$DEV_API/api/health")
  timestamp=$(date '+%Y-%m-%d %H:%M:%S')

  if [ "$response" -eq 200 ]; then
    echo "[$timestamp] ✓ API is UP (HTTP $response)"
  else
    echo "[$timestamp] ✗ API is DOWN (HTTP $response)"
    # Send notification (optional)
    # curl -X POST https://your-notification-service.com/alert \
    #   -d "Dev API is down: HTTP $response"
  fi

  # Check every 5 minutes
  sleep 300
done
EOF

chmod +x monitor-dev.sh

# Run in background
# nohup ./monitor-dev.sh > monitor-dev.log 2>&1 &
```

---

## Troubleshooting Dev Issues

### Common Issues and Solutions

#### Issue 1: "Database not found" Error

**Symptom**: API returns 500 error, logs show "Database binding not found"

**Solution**:
```bash
# Verify database binding in wrangler.dev.toml
cd backend
cat wrangler.dev.toml | grep -A 3 "d1_databases"

# If database_id is wrong, get the correct one:
wrangler d1 list | grep edgelink-dev

# Update wrangler.dev.toml with correct database_id
# Redeploy
wrangler deploy --env dev
```

#### Issue 2: CORS Errors in Frontend

**Symptom**: Browser console shows "CORS policy" errors

**Solution**:
```bash
# Update backend CORS settings
cd backend
nano wrangler.dev.toml

# Add/update:
# [env.dev.vars]
# FRONTEND_URL = "https://your-pages-url.pages.dev"

# Redeploy backend
wrangler deploy --env dev
```

#### Issue 3: JWT Token Errors

**Symptom**: "Invalid token" or "Token expired" errors

**Solution**:
```bash
# Check if JWT_SECRET is set
cd backend
wrangler secret list --env dev

# If not listed, set it:
wrangler secret put JWT_SECRET --env dev
# Enter: dev-secret-change-me-12345678901234567890

# Clear browser storage and login again
# Or use browser console:
# localStorage.clear()
# sessionStorage.clear()
```

#### Issue 4: Extension Not Loading

**Symptom**: Extension shows errors or doesn't load

**Solution**:
```bash
# Check manifest.json is valid
cd browser-extension
cat manifest.json | python -m json.tool

# Check permissions are correct
# Make sure host_permissions includes your dev API URL

# Reload extension:
# Chrome: chrome://extensions/ → Click reload icon
# Firefox: about:debugging → Click reload
```

#### Issue 5: Database Schema Out of Date

**Symptom**: SQL errors mentioning missing columns/tables

**Solution**:
```bash
# Export current data
cd backend
wrangler d1 export edgelink-dev --output=backup-before-schema-update.sql

# Re-run schema
wrangler d1 execute edgelink-dev --file=./schema.sql

# If needed, restore data
wrangler d1 execute edgelink-dev --file=backup-before-schema-update.sql
```

#### Issue 6: Build Failures

**Symptom**: `npm run build` fails

**Solution**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache (frontend)
cd frontend
rm -rf .next
npm run build

# Clear Wrangler cache (backend)
cd ../backend
rm -rf dist .wrangler
npm run build
```

#### Issue 7: Rate Limiting in Dev

**Symptom**: "Too many requests" errors during testing

**Solution**:
```bash
# Temporarily disable rate limiting for dev
cd backend
nano src/middleware/rateLimiter.ts

# Comment out rate limiting logic
# Or increase limits significantly for dev

# Redeploy
wrangler deploy --env dev
```

---

## Rolling Back Dev Changes

### 1. Rollback Backend (Workers)

```bash
cd backend

# List recent deployments
wrangler deployments list --env dev

# Output shows:
# Created         ID                       Version
# X minutes ago   abcd-1234-5678-90ef     v1

# Rollback to specific deployment
wrangler rollback --env dev <deployment-id>

# Or rollback to previous version
wrangler rollback --env dev
```

### 2. Rollback Frontend (Pages)

```bash
cd frontend

# List deployments
npx wrangler pages deployment list --project-name=edgelink-dev

# Rollback via dashboard:
# 1. Go to Cloudflare Dashboard → Workers & Pages → edgelink-dev
# 2. Click "View details" on a previous deployment
# 3. Click "Rollback to this deployment"

# Or redeploy a previous build
git checkout <previous-commit>
npm run build
npx wrangler pages deploy .next --project-name=edgelink-dev --branch=dev
```

### 3. Rollback Database

```bash
cd backend

# Restore from backup
wrangler d1 execute edgelink-dev --file=backup-dev-YYYYMMDD-HHMMSS.sql

# Or if you need to drop and recreate:
wrangler d1 execute edgelink-dev --command="DROP TABLE IF EXISTS urls;"
wrangler d1 execute edgelink-dev --file=./schema.sql
wrangler d1 execute edgelink-dev --file=backup-dev-YYYYMMDD-HHMMSS.sql
```

---

## Dev to Prod Checklist

Before deploying to production, verify all items:

### ✅ Functionality
- [ ] All authentication flows work correctly
- [ ] URL shortening and redirection work
- [ ] Analytics tracking is accurate
- [ ] QR code generation works
- [ ] A/B testing functions correctly
- [ ] API keys work with proper rate limiting
- [ ] Webhooks deliver successfully
- [ ] Team features work (invites, roles, permissions)
- [ ] Account deletion works (immediate and scheduled)
- [ ] Data export works

### ✅ Security
- [ ] No hardcoded secrets or API keys in code
- [ ] JWT secrets are strong and unique
- [ ] CORS is properly configured
- [ ] Rate limiting is active and tested
- [ ] SQL injection prevention tested
- [ ] XSS prevention tested
- [ ] CSRF protection enabled
- [ ] All user inputs are validated
- [ ] Passwords are properly hashed
- [ ] API endpoints require proper authentication

### ✅ Performance
- [ ] Page load times are acceptable (< 3 seconds)
- [ ] API response times are fast (< 500ms average)
- [ ] Database queries are optimized
- [ ] No N+1 query problems
- [ ] Caching is implemented where appropriate
- [ ] Images are optimized
- [ ] JavaScript bundles are minimized

### ✅ Testing
- [ ] All automated tests pass
- [ ] Manual testing checklist completed
- [ ] Extension tested in Chrome
- [ ] Extension tested in Firefox
- [ ] Tested on mobile devices
- [ ] Tested with slow network (3G simulation)
- [ ] Error handling tested
- [ ] Edge cases tested

### ✅ Documentation
- [ ] README.md is up to date
- [ ] API documentation is complete
- [ ] Code comments are clear
- [ ] Architecture diagrams are current
- [ ] Deployment guides reviewed

### ✅ Monitoring
- [ ] Logging is comprehensive
- [ ] Error tracking is set up
- [ ] Performance monitoring is active
- [ ] Alerts are configured
- [ ] Dashboard access is set up

### ✅ Compliance
- [ ] GDPR compliance verified
- [ ] CCPA compliance verified
- [ ] Terms of Service reviewed
- [ ] Privacy Policy reviewed
- [ ] Data retention policies implemented

### ✅ Backup & Recovery
- [ ] Database backup strategy defined
- [ ] Recovery procedures documented
- [ ] Rollback procedures tested
- [ ] Backup restoration tested

### ✅ Infrastructure
- [ ] Custom domains ready (if using)
- [ ] SSL/TLS certificates configured
- [ ] DNS records prepared
- [ ] CDN configured
- [ ] Email service configured (for notifications)

---

## Next Steps

Once development testing is complete and all checklist items are verified:

1. **Document any issues found** and their resolutions
2. **Create a deployment summary** with key metrics and test results
3. **Schedule production deployment** with stakeholders
4. **Follow the Production Deployment Guide** (PROD_DEPLOYMENT.md)
5. **Set up production monitoring** and alerts
6. **Prepare rollback plan** for production

---

## Development Best Practices

### 1. Keep Dev Environment Updated

```bash
# Weekly update routine
cd /home/user/edgelink

# Pull latest changes
git pull origin dev

# Update dependencies
cd backend && npm update && cd ..
cd frontend && npm update && cd ..

# Rebuild
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..

# Redeploy
cd backend && wrangler deploy --env dev && cd ..
cd frontend && npx wrangler pages deploy .next --project-name=edgelink-dev --branch=dev
```

### 2. Use Feature Branches

```bash
# Create feature branch
git checkout -b feature/new-feature-name

# Make changes
# Test locally
npm run dev

# Commit and push
git add .
git commit -m "feat: Add new feature"
git push origin feature/new-feature-name

# Deploy to dev for testing
wrangler deploy --env dev

# After testing, merge to dev
git checkout dev
git merge feature/new-feature-name
```

### 3. Keep Dev and Prod Separate

- **Always** test in dev first
- **Never** use production credentials in dev
- **Never** point dev to production database
- **Always** use different subdomains/URLs
- **Always** label dev deployments clearly

### 4. Monitor Resource Usage

```bash
# Check Workers usage
wrangler tail --env dev --format=pretty | grep "CPU time"

# Check D1 usage
wrangler d1 info edgelink-dev

# Check Pages bandwidth
# View in Cloudflare Dashboard
```

---

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting-dev-issues) section
2. Review Cloudflare Workers documentation: https://developers.cloudflare.com/workers/
3. Review Cloudflare Pages documentation: https://developers.cloudflare.com/pages/
4. Check GitHub issues: https://github.com/ajithvnr2001/edgelink/issues
5. Contact the development team

---

**Last Updated**: November 8, 2024
**Version**: 1.0.0
**Environment**: Development
