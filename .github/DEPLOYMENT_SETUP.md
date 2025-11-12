# GitHub Actions Deployment Setup

This guide explains how to set up automatic deployments for EdgeLink using GitHub Actions.

## 📋 Prerequisites

1. GitHub repository with code pushed
2. Cloudflare account with Workers and Pages access
3. Cloudflare API token with appropriate permissions

---

## 🔑 Step 1: Create Cloudflare API Token

### 1.1 Go to Cloudflare Dashboard
```
https://dash.cloudflare.com/profile/api-tokens
```

### 1.2 Create Token
1. Click **"Create Token"**
2. Use template: **"Edit Cloudflare Workers"** 
3. Or create custom token with these permissions:

**Account Permissions:**
- Workers Scripts: Edit
- Workers KV Storage: Edit
- D1: Edit
- Pages: Edit
- Account Settings: Read

**Zone Permissions:**
- Workers Routes: Edit
- Zone: Read
- DNS: Edit

### 1.3 Copy the Token
- Save it securely (you won't see it again!)

---

## 🔐 Step 2: Set Up GitHub Secrets

### 2.1 Go to Repository Settings
```
Your Repo → Settings → Secrets and variables → Actions
```

### 2.2 Add Required Secrets

Click **"New repository secret"** and add:

#### Secret 1: CLOUDFLARE_API_TOKEN
```
Name: CLOUDFLARE_API_TOKEN
Value: <paste your Cloudflare API token>
```

#### Secret 2: CLOUDFLARE_ACCOUNT_ID
```
Name: CLOUDFLARE_ACCOUNT_ID
Value: <your Cloudflare account ID>
```

**To find your Account ID:**
1. Go to: https://dash.cloudflare.com/
2. Select any site
3. Scroll down right sidebar
4. Copy "Account ID"

Or run:
```bash
wrangler whoami
```

---

## 🚀 Step 3: Enable Workflows

The repository has 3 deployment workflows:

### 1. Backend Only (`deploy-backend.yml`)
- **Triggers:** Push to main/master branch, or backend code changes
- **Deploys:** Cloudflare Workers backend
- **URL:** https://go.shortedbro.xyz

### 2. Frontend Only (`deploy-frontend.yml`)
- **Triggers:** Push to main/master branch, or frontend code changes
- **Deploys:** Cloudflare Pages frontend
- **URL:** https://shortedbro.xyz

### 3. Full Stack (`deploy-full-stack.yml`)
- **Triggers:** Push to main/master branch
- **Deploys:** Backend first, then frontend
- **Best for:** Complete deployments

---

## ✅ Step 4: Test Deployment

### Option 1: Push to Main Branch
```bash
git checkout main
git push origin main
```

### Option 2: Manual Trigger
1. Go to: `Actions` tab in GitHub
2. Select workflow (e.g., "Deploy Full Stack")
3. Click **"Run workflow"**
4. Select branch and click **"Run workflow"**

### Check Deployment Status
- Go to `Actions` tab in your repository
- Click on the running workflow
- Watch the progress in real-time

---

## 🎯 Deployment Behavior

### Automatic Triggers

**Full Stack Deployment** runs on:
- Push to `main` or `master` branch

**Backend Deployment** runs on:
- Changes to `edgelink/backend/**` files
- Changes to backend workflow file

**Frontend Deployment** runs on:
- Changes to `edgelink/frontend/**` files
- Changes to frontend workflow file

### Manual Deployment

All workflows support manual triggering:
- Go to `Actions` → Select workflow → `Run workflow`

---

## 🔍 Verify Deployment

After deployment completes:

### Backend
```bash
curl https://go.shortedbro.xyz/health
```

Expected response:
```json
{"status":"healthy","timestamp":1234567890,"version":"1.0.0"}
```

### Frontend
Visit in browser:
```
https://shortedbro.xyz
```

### Test Full Flow
1. Go to https://shortedbro.xyz
2. Sign up / Log in
3. Create a short link
4. Verify link uses `go.shortedbro.xyz`

---

## 🐛 Troubleshooting

### "Error: Invalid API token"

**Solution:**
1. Verify token has correct permissions
2. Check token hasn't expired
3. Regenerate token in Cloudflare dashboard
4. Update GitHub secret

### "Error: Account ID not found"

**Solution:**
1. Run `wrangler whoami` to get correct Account ID
2. Update `CLOUDFLARE_ACCOUNT_ID` secret

### Deployment Succeeds But Site Doesn't Update

**Backend:**
```bash
# Check if worker is actually deployed
wrangler deployments list --env production
```

**Frontend:**
```bash
# Check Cloudflare Pages deployment
wrangler pages deployment list --project-name=edgelink-production
```

### Build Fails

**Common Issues:**
1. **Node modules not installing:** Check `package-lock.json` exists
2. **Build errors:** Check logs in GitHub Actions
3. **Environment variables:** Verify they're set in workflow

---

## 📊 Monitoring Deployments

### View Deployment History
```
GitHub → Actions tab → Select workflow → View runs
```

### View Deployment Logs
```
Click on any workflow run → Click on job → View detailed logs
```

### Cloudflare Dashboard
**Workers:**
- Dashboard → Workers & Pages → edgelink-production

**Pages:**
- Dashboard → Workers & Pages → edgelink-production (Pages)

---

## 🔄 Deployment Strategy

### Development Flow
```
1. Make changes locally
2. Test locally (npm run dev)
3. Commit and push to feature branch
4. Create Pull Request
5. Merge to main
6. Auto-deployment triggers
7. Verify in production
```

### Rollback Strategy

If deployment breaks production:

**Option 1: Revert Commit**
```bash
git revert <commit-hash>
git push origin main
```

**Option 2: Redeploy Previous Version**
```bash
# Backend
cd edgelink/backend
wrangler rollback --env production

# Frontend - redeploy previous commit
git checkout <previous-commit>
git push origin main --force
```

---

## 🎉 You're All Set!

Your EdgeLink deployment is now automated:
- ✅ Push to main → Auto-deploy
- ✅ Backend updates → Auto-deploy backend
- ✅ Frontend updates → Auto-deploy frontend
- ✅ Manual deployments available anytime

**Next Steps:**
1. Make a small change
2. Push to main
3. Watch it deploy automatically
4. Verify at https://shortedbro.xyz

---

**Questions or Issues?**
Check the deployment logs in GitHub Actions for detailed error messages.
