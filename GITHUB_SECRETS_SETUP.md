# GitHub Secrets Setup Guide

The GitHub Actions workflow now automatically sets `RESEND_API_KEY` in Cloudflare Workers during deployment. You just need to add the secret to your GitHub repository once.

## 🔑 Add RESEND_API_KEY to GitHub Secrets (One-Time Setup)

### Step 1: Go to Repository Settings

1. Open your repository: https://github.com/ajithvnr2001/edgelink-implementation
2. Click **Settings** (top right)
3. In the left sidebar, click **Secrets and variables** → **Actions**

### Step 2: Add New Repository Secret

1. Click **New repository secret** button
2. Fill in the form:
   - **Name**: `RESEND_API_KEY`
   - **Secret**: `re_WBFqfUGb_7qzNQJFPwAaTi1AVp8w9VB7Y`
3. Click **Add secret**

### Step 3: Verify Secret is Added

You should see `RESEND_API_KEY` in your secrets list:

```
Repository secrets
├─ CLOUDFLARE_API_TOKEN
├─ CLOUDFLARE_ACCOUNT_ID
└─ RESEND_API_KEY  ✅ (newly added)
```

---

## ✅ How It Works

### Before (Manual)
```bash
# Had to run manually after each deployment
npx wrangler secret put RESEND_API_KEY
```

### After (Automatic)
```yaml
# GitHub Actions now runs this automatically
- name: Set RESEND_API_KEY Secret
  run: |
    echo "$RESEND_API_KEY" | npx wrangler secret put RESEND_API_KEY --env production
```

---

## 🚀 Test the Workflow

### Option 1: Push to Main Branch

Merge your branch to main and the workflow will run automatically:

```bash
git checkout main
git merge claude/implement-email-dodopayments-01Tt9DyBJRBY2bgcW3FHsbU6
git push origin main
```

### Option 2: Manual Workflow Dispatch

1. Go to **Actions** tab in your repository
2. Click **Deploy Backend to Cloudflare Workers**
3. Click **Run workflow** → **Run workflow**
4. Watch the deployment logs

---

## 📊 Verify Deployment Success

After the workflow completes:

1. **Check workflow logs** for:
   ```
   ✅ Backend deployed successfully to production!
   🌐 API URL: https://go.shortedbro.xyz
   ```

2. **Check secret was set**:
   Look for the "Set RESEND_API_KEY Secret" step in logs

3. **Test email verification**:
   - Sign up: https://shortedbro.xyz/signup
   - Check email from `noreply@go.shortedbro.xyz`
   - Click verification link
   - Should work! ✅

---

## 🔒 Security Best Practices

✅ **Do:**
- Store secrets in GitHub Secrets (encrypted)
- Use `continue-on-error: true` for secret setting (in case already set)
- Rotate API keys periodically

❌ **Don't:**
- Commit API keys to git
- Share API keys in plain text
- Use production keys in development

---

## 🐛 Troubleshooting

### Secret not being set

**Symptom:** Workflow runs but emails still don't send

**Fix:**
1. Check GitHub Actions logs for the "Set RESEND_API_KEY Secret" step
2. Look for any errors in that step
3. Verify the secret exists in GitHub: Settings → Secrets and variables → Actions

### Secret already exists

**Symptom:** Workflow shows error "secret already exists"

**Fix:**
This is normal and harmless. The workflow uses `continue-on-error: true` so it won't fail if the secret already exists.

### Need to update the secret

**Fix:**
1. Go to GitHub Settings → Secrets and variables → Actions
2. Click on `RESEND_API_KEY`
3. Click **Update secret**
4. Enter new value
5. Re-run the workflow

---

## 📋 Complete Secrets Checklist

Your GitHub repository should have these secrets configured:

- [x] `CLOUDFLARE_API_TOKEN` (for deploying)
- [x] `CLOUDFLARE_ACCOUNT_ID` (for deploying)
- [ ] `RESEND_API_KEY` ← **Add this now!**

---

## 🎯 Next Steps

1. **Add `RESEND_API_KEY` to GitHub Secrets** (follow Step 1-3 above)
2. **Trigger deployment** (push to main or manual dispatch)
3. **Test email verification** (signup and click verification link)
4. **Celebrate!** 🎉 Everything should work automatically now

---

## Quick Reference

| What | Where | Value |
|------|-------|-------|
| GitHub Secrets | Repository → Settings → Secrets and variables → Actions | Add `RESEND_API_KEY` |
| Resend API Key | https://resend.com/api-keys | `re_WBFqfUGb_...` |
| Workflow File | `.github/workflows/deploy-backend.yml` | Auto-sets secret |
| Test URL | https://shortedbro.xyz/signup | Sign up to test |

---

**Once you add the secret to GitHub, all future deployments will automatically configure the RESEND_API_KEY!**
