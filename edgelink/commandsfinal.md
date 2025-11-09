# EdgeLink Production Deployment Commands

Complete guide for deploying EdgeLink to Cloudflare Workers and Pages.

---

## ✅ Prerequisites

1. **Cloudflare Account**: Active account with Workers and Pages access
2. **Wrangler CLI**: Installed and authenticated
3. **Node.js**: Version 18+ installed
4. **Git**: For version control

### Check Prerequisites

```bash
# Verify wrangler is installed and authenticated
wrangler whoami

# Check Node.js version
node --version

# Verify you're in the project directory
cd D:\Edgelink\edgelink
```

---

## 🔧 Backend Deployment (Cloudflare Workers)

### Step 1: Configure Backend

```bash
# Navigate to backend directory
cd backend

# Verify wrangler.toml configuration
cat wrangler.toml
```

**Required Configuration in `backend/wrangler.toml`:**
```toml
name = "edgelink-production"

[[d1_databases]]
binding = "DB"
database_name = "edgelink-production"
database_id = "d5f676e0-b43f-4ac9-ab2c-acd1ddcda86b"

[[kv_namespaces]]
binding = "LINKS_KV"
id = "d343d816e5904857b49d35938c7f39cf"
preview_id = "46db878aed4b40b6b1dce78fab668170"
```

### Step 2: Apply Database Schema

```bash
# From backend directory
wrangler d1 execute edgelink-production --remote --file=schema.sql
```

**Expected Output:**
```
✅ 40 commands executed successfully
✅ 14 tables created
✅ Database size: 0.25 MB
```

### Step 3: Set JWT Secret

```bash
# Generate secure secret (32 bytes base64)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Set the secret (replace YOUR_SECRET with generated value)
echo "YOUR_SECRET_HERE" | wrangler secret put JWT_SECRET
```

**Example:**
```bash
echo "Hsuz2X0WW7bchPXuI8YG/t6tHQQdqgpwwUXHVe0eLGw=" | wrangler secret put JWT_SECRET
```

### Step 4: Deploy Backend Worker

```bash
# From backend directory
npm run deploy

# OR manually
wrangler deploy
```

**Expected Output:**
```
✅ Uploaded edgelink-production
✅ Deployed to: https://edgelink-production.quoteviral.workers.dev
✅ Version ID: f3ac765c-fc7f-4939-8229-119ca059900c
```

### Step 5: Verify Backend

```bash
# Test signup endpoint
curl -X POST https://edgelink-production.quoteviral.workers.dev/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123","name":"Test User"}'

# Test login endpoint
curl -X POST https://edgelink-production.quoteviral.workers.dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}'
```

---

## 🎨 Frontend Deployment (Cloudflare Pages)

### Step 1: Configure Frontend Environment

```bash
# Navigate to frontend directory
cd frontend

# Create .env.local for local development
cat > .env.local << 'EOF'
# Local Development Environment
NEXT_PUBLIC_API_URL=https://edgelink-production.quoteviral.workers.dev
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_DEBUG=true
NEXT_PUBLIC_SHORT_URL_DOMAIN=edgelink-production.quoteviral.workers.dev
EOF

# Verify .env.production exists
cat .env.production
```

### Step 2: Install Dependencies

```bash
# From frontend directory
npm install
```

### Step 3: Build Frontend

```bash
# Build for production
npm run build
```

**Expected Output:**
```
✓ Compiled successfully
✓ Generating static pages (14/14)
✓ Finalizing page optimization
```

### Step 4: Clean Build Artifacts

```bash
# Remove cache to reduce deployment size
rm -rf .next/cache

# Verify build directory
ls -la .next/
```

### Step 5: Deploy to Cloudflare Pages

```bash
# Deploy complete .next directory
wrangler pages deploy .next --project-name=edgelink-production --commit-dirty=true
```

**Expected Output:**
```
✨ Success! Uploaded 272 files (4.22 sec)
🌎 Deploying...
✨ Deployment complete! Take a peek over at https://11dda019.edgelink-production.pages.dev
✨ Deployment alias URL: https://master.edgelink-production.pages.dev
```

### Step 6: Verify Frontend Deployment

```bash
# Check main site
curl -I https://edgelink-production.pages.dev

# Check /create page exists
curl -s "https://edgelink-production.pages.dev/create/" | grep -i "Destination URL"

# Check /dashboard page
curl -I "https://edgelink-production.pages.dev/dashboard/"
```

---

## 🔄 Complete Deployment Process (Fresh Deploy)

```bash
# 1. Backend Setup
cd backend
wrangler d1 execute edgelink-production --remote --file=schema.sql
echo "YOUR_JWT_SECRET" | wrangler secret put JWT_SECRET
npm run deploy

# 2. Frontend Setup
cd ../frontend
npm install
npm run build
rm -rf .next/cache
wrangler pages deploy .next --project-name=edgelink-production --commit-dirty=true

# 3. Verification
curl -X POST https://edgelink-production.quoteviral.workers.dev/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"verify@test.com","password":"Test123","name":"Verify User"}'
```

---

## 🚀 Quick Redeploy (After Code Changes)

### Backend Only

```bash
cd backend
npm run deploy
```

### Frontend Only

```bash
cd frontend
npm run build
rm -rf .next/cache
wrangler pages deploy .next --project-name=edgelink-production --commit-dirty=true
```

### Both Backend + Frontend

```bash
# Backend
cd backend && npm run deploy && cd ..

# Frontend
cd frontend && npm run build && rm -rf .next/cache && wrangler pages deploy .next --project-name=edgelink-production --commit-dirty=true && cd ..
```

---

## 📦 Git Deployment Workflow

### Commit and Push Changes

```bash
# Check status
git status

# Add specific files
git add frontend/src/app/create/page.tsx frontend/src/app/dashboard/page.tsx

# Commit with message
git commit -m "Fix: Authentication and routing improvements"

# Push to GitHub
git push origin master
```

### Auto-Deploy Setup (Optional - Recommended)

To enable automatic deployments on every push:

1. Go to Cloudflare Dashboard: https://dash.cloudflare.com/pages
2. Select "edgelink-production" project
3. Settings → Builds & deployments → "Connect to Git"
4. Select repository: `ajithvnr2001/edgelink-implementation`
5. Configure:
   - **Build command**: `cd frontend && npm install && npm run build && rm -rf .next/cache`
   - **Build output directory**: `frontend/.next`
   - **Root directory**: `/`
   - **Branch**: `master`

---

## 🔍 Troubleshooting Commands

### Backend Issues

```bash
# Check D1 database tables
wrangler d1 execute edgelink-production --remote --command "SELECT name FROM sqlite_master WHERE type='table'"

# View secrets
wrangler secret list

# Check worker logs (live)
wrangler tail edgelink-production

# Check recent deployments
wrangler deployments list
```

### Frontend Issues

```bash
# List Pages deployments
wrangler pages deployment list --project-name=edgelink-production

# Check build output
npm run build 2>&1 | tee build.log

# Test locally before deploy
npm run dev
# Visit http://localhost:3000
```

### Database Reset (if needed)

```bash
# Drop and recreate tables
cd backend
wrangler d1 execute edgelink-production --remote --command "DROP TABLE IF EXISTS users"
wrangler d1 execute edgelink-production --remote --file=schema.sql
```

---

## 📊 Production URLs

| Service | URL |
|---------|-----|
| **Frontend (Production)** | https://edgelink-production.pages.dev |
| **Frontend (Master Branch)** | https://master.edgelink-production.pages.dev |
| **Backend API** | https://edgelink-production.quoteviral.workers.dev |
| **Cloudflare Dashboard** | https://dash.cloudflare.com |
| **GitHub Repository** | https://github.com/ajithvnr2001/edgelink-implementation |

---

## 🧪 Test Complete Flow

```bash
# 1. Test signup
curl -X POST https://edgelink-production.quoteviral.workers.dev/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"SecurePass123","name":"Demo User"}'

# 2. Test login
curl -X POST https://edgelink-production.quoteviral.workers.dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"SecurePass123"}'

# 3. Test frontend (open in browser)
# Visit: https://edgelink-production.pages.dev
# - Click "Login"
# - Enter credentials
# - Click "Create New Link"
# - Should see create form (not login page)
```

---

## 📝 Deployment Checklist

### Backend
- [x] Database schema applied
- [x] JWT_SECRET configured
- [x] Worker deployed
- [x] Authentication endpoints tested

### Frontend
- [x] Dependencies installed
- [x] Environment variables configured
- [x] Build successful
- [x] Cache removed
- [x] Deployed to Pages
- [x] All routes accessible

### Verification
- [x] Can signup new user
- [x] Can login existing user
- [x] Dashboard loads
- [x] Create link page shows form
- [x] Auth protection working

---

## 🎯 Common Issues & Solutions

### Issue: "Database has 0 tables"
**Solution:**
```bash
cd backend
wrangler d1 execute edgelink-production --remote --file=schema.sql
```

### Issue: "JWT verification failed"
**Solution:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
echo "GENERATED_SECRET" | wrangler secret put JWT_SECRET
```

### Issue: "/create page not found"
**Solution:**
```bash
cd frontend
npm run build
rm -rf .next/cache
wrangler pages deploy .next --project-name=edgelink-production --commit-dirty=true
```

### Issue: "Module not found" or build errors
**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 🔐 Security Notes

1. **JWT Secret**: Never commit to Git, store securely
2. **Environment Variables**: Use `.env.local` for local dev (gitignored)
3. **API Keys**: Rotate periodically
4. **Database**: Regular backups recommended
5. **CORS**: Configured for production domain only

---

## 📚 Additional Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Wrangler Docs**: https://developers.cloudflare.com/workers/wrangler/
- **Cloudflare Pages**: https://developers.cloudflare.com/pages/
- **D1 Database**: https://developers.cloudflare.com/d1/

---

**Last Updated**: November 9, 2025
**Status**: ✅ Production Deployment Working
**Version**: 1.0
