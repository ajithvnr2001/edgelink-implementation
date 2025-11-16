# Frontend Deployment Guide

The frontend needs to be deployed to Cloudflare Pages so the verification email links work correctly.

## What's New

I've added these email verification pages:

1. **`/verify-email`** - Handles email verification from links in emails
2. **`/request-reset`** - Request password reset email
3. **`/reset-password`** - Set new password with reset token
4. **Updated `/login`** - Added "Forgot password?" link

## Deployment Steps

### Option 1: Deploy via Cloudflare Dashboard (Recommended)

1. **Go to Cloudflare Pages**
   - Visit https://dash.cloudflare.com/
   - Go to Pages
   - Click "Create application" → "Connect to Git"

2. **Connect Your Repository**
   - Select your GitHub repository: `ajithvnr2001/edgelink-implementation`
   - Click "Begin setup"

3. **Configure Build Settings**
   ```
   Project name: edgelink-frontend (or shortedbro)
   Production branch: main (or your branch)
   Framework preset: Next.js
   Build command: cd edgelink/frontend && npm install && npm run build
   Build output directory: edgelink/frontend/.next
   Root directory: /
   ```

4. **Environment Variables**
   Add these in Cloudflare Pages settings:
   ```
   NEXT_PUBLIC_API_URL=https://go.shortedbro.xyz
   NEXT_PUBLIC_FRONTEND_URL=https://shortedbro.xyz
   NEXT_PUBLIC_ENVIRONMENT=production
   NEXT_PUBLIC_SHORT_URL_DOMAIN=go.shortedbro.xyz
   ```

5. **Custom Domain**
   - After deployment, go to "Custom domains"
   - Add `shortedbro.xyz`
   - DNS records will be automatically configured

6. **Deploy**
   - Click "Save and Deploy"
   - Wait for build to complete (~2-5 minutes)

### Option 2: Deploy via CLI

```bash
cd edgelink/frontend

# Install dependencies
npm install

# Build the project
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy .next --project-name=edgelink-frontend
```

## Testing the Email Flow

### 1. Test Signup & Verification

```bash
# Sign up a new user
curl -X POST https://go.shortedbro.xyz/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'
```

**Expected:**
- Returns 201 with access token
- Email sent to test@example.com
- Email contains link: `https://shortedbro.xyz/verify-email?token=...`

### 2. Click Verification Link

- Open email and click the verification link
- Should redirect to `https://shortedbro.xyz/verify-email?token=xxx`
- Page should show "Verifying your email..." → "Email Verified!" → Redirect to dashboard

### 3. Test Password Reset

1. **Request reset:**
   ```bash
   curl -X POST https://go.shortedbro.xyz/auth/request-reset \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```

2. **Click reset link in email:**
   - Link format: `https://shortedbro.xyz/reset-password?token=...`
   - Enter new password
   - Click "Reset password"
   - Should show success and redirect to login

## Verification Checklist

After deployment, verify these work:

- [ ] Frontend loads at `https://shortedbro.xyz`
- [ ] Signup creates account and sends email
- [ ] Verification link in email points to `https://shortedbro.xyz/verify-email?token=...`
- [ ] Clicking verification link verifies email and redirects to dashboard
- [ ] "Forgot password?" link on login page works
- [ ] Password reset flow completes successfully
- [ ] All pages load without 404 errors

## Troubleshooting

### Issue: 404 on /verify-email

**Cause:** Frontend not deployed or build failed

**Fix:**
1. Check Cloudflare Pages deployment status
2. Verify build completed successfully
3. Check build logs for errors

### Issue: Email link points to wrong URL

**Cause:** Backend `FRONTEND_URL` environment variable incorrect

**Fix:**
```bash
cd edgelink/backend
# Check current value
npx wrangler secret list

# Verify wrangler.toml has correct FRONTEND_URL
cat wrangler.toml | grep FRONTEND_URL
# Should show: FRONTEND_URL = "https://shortedbro.xyz"

# Redeploy backend
npx wrangler deploy
```

### Issue: Verification token invalid

**Cause:** Token expired (48 hours) or already used

**Fix:**
- User should click "Resend Verification Email" on the verify-email page
- Or request new signup

### Issue: Pages not styled correctly

**Cause:** CSS not loaded or build issue

**Fix:**
1. Clear cache and hard reload (Ctrl+Shift+R)
2. Rebuild and redeploy:
   ```bash
   cd edgelink/frontend
   rm -rf .next
   npm run build
   npx wrangler pages deploy .next --project-name=edgelink-frontend
   ```

## API Endpoints Used by Frontend

The new pages call these backend endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/verify-email` | POST | Verify email with token |
| `/auth/resend-verification` | POST | Resend verification email |
| `/auth/request-reset` | POST | Request password reset |
| `/auth/reset-password` | POST | Reset password with token |

All endpoints are already implemented and deployed on the backend.

## Current URLs

- **Frontend**: https://shortedbro.xyz
- **Backend API**: https://go.shortedbro.xyz
- **Email From**: noreply@go.shortedbro.xyz
- **Verification Links**: https://shortedbro.xyz/verify-email?token=...
- **Reset Links**: https://shortedbro.xyz/reset-password?token=...

## Next Steps

1. ✅ Backend email configuration fixed
2. ✅ Frontend pages created
3. 🔄 **Deploy frontend to Cloudflare Pages** ← You are here
4. ⏳ Test complete email verification flow
5. ⏳ Configure DodoPayments webhook (if needed)
6. ⏳ Configure Resend webhook (optional)

## Quick Deploy Command

```bash
cd edgelink/frontend
npm install && npm run build && npx wrangler pages deploy .next --project-name=edgelink-frontend
```

After deployment completes, test the verification flow end-to-end!
