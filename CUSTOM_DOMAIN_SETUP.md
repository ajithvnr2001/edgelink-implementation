# Setting Up Custom Domain (go.shortedbro.xyz)

## Current Status

✅ **Domain Purchased:** shortedbro.xyz
⚠️ **Custom Domain Not Yet Configured:** go.shortedbro.xyz

Currently, the application uses the default Cloudflare Workers URL:
- **Production Backend:** `https://edgelink-production.quoteviral.workers.dev`

Once configured, you'll use:
- **Frontend:** `https://shortedbro.xyz`
- **API:** `https://go.shortedbro.xyz`
- **Short Links:** `https://go.shortedbro.xyz/{slug}`

---

## Prerequisites

1. Domain: `shortedbro.xyz` (already purchased ✅)
2. Cloudflare account with Workers deployed
3. Access to domain DNS settings

---

## Step 1: Add Custom Domain to Cloudflare Workers

### Option A: Using Cloudflare Dashboard

1. **Go to Cloudflare Dashboard**
   - Navigate to: https://dash.cloudflare.com/
   - Select your Workers & Pages

2. **Open Your Worker**
   - Click on `edgelink-production` worker

3. **Add Custom Domain**
   - Click on **Triggers** tab
   - Under **Custom Domains**, click **Add Custom Domain**
   - Enter: `go.shortedbro.xyz`
   - Click **Add Custom Domain**

4. **Cloudflare Will:**
   - Automatically create DNS records
   - Issue SSL certificate
   - Configure routing

### Option B: Using Wrangler CLI

```bash
cd edgelink/backend

# Add custom domain to production worker
wrangler domains add go.shortedbro.xyz --env production
```

---

## Step 2: Verify DNS Configuration

1. **Check DNS Records** (if manual setup needed)

   Add these records to your `shortedbro.xyz` domain:

   ```
   Type: CNAME
   Name: go
   Target: edgelink-production.quoteviral.workers.dev
   Proxy: Enabled (Orange Cloud)
   ```

2. **Verify DNS Propagation**

   ```bash
   # Check if DNS is resolving
   nslookup go.shortedbro.xyz

   # Or use dig
   dig go.shortedbro.xyz
   ```

---

## Step 3: Test the Custom Domain

Once DNS propagates (usually 5-10 minutes):

```bash
# Test health endpoint
curl https://go.shortedbro.xyz/health

# Should return:
# {"status":"healthy","timestamp":...,"version":"1.0.0"}
```

---

## Step 4: Update Environment Variables

Once the custom domain is working, update these files:

### 1. Frontend Production Config

**File:** `edgelink/frontend/.env.production`

```env
# Change from:
NEXT_PUBLIC_API_URL=https://edgelink-production.quoteviral.workers.dev

# To:
NEXT_PUBLIC_API_URL=https://go.shortedbro.xyz
```

### 2. Backend Handlers

**Files to update:**
- `edgelink/backend/src/handlers/shorten.ts`
- `edgelink/backend/src/handlers/links.ts`
- `edgelink/backend/src/handlers/bulk-import.ts`

**Change default domain from:**
```typescript
'edgelink-production.quoteviral.workers.dev'
```

**To:**
```typescript
'go.shortedbro.xyz'
```

### 3. Frontend Components

**Files to update:**
- `edgelink/frontend/src/app/dashboard/page.tsx`
- `edgelink/frontend/src/app/create/page.tsx`

**Change fallback URLs to use the new domain.**

---

## Step 5: Deploy Updated Configuration

### Deploy Backend

```bash
cd edgelink/backend
wrangler deploy --config wrangler.prod.toml --env production
```

### Deploy Frontend

```bash
cd edgelink/frontend

# Set environment variables in Cloudflare Pages
wrangler pages deployment create edgelink-production --env production

# Or rebuild and deploy
npm run build
wrangler pages deploy .next --project-name=edgelink-production
```

---

## Step 6: Configure Frontend Domain (shortedbro.xyz)

### Add Frontend Custom Domain

1. **Go to Cloudflare Pages**
   - Navigate to Workers & Pages
   - Select `edgelink-production` Pages project

2. **Add Custom Domain**
   - Click **Custom domains**
   - Add: `shortedbro.xyz`
   - Add: `www.shortedbro.xyz` (optional)

3. **DNS Records** (Cloudflare will auto-create)
   ```
   Type: CNAME
   Name: @ (or shortedbro.xyz)
   Target: edgelink-production.pages.dev
   Proxy: Enabled
   ```

---

## Verification Checklist

After setup is complete:

- [ ] `https://go.shortedbro.xyz/health` returns healthy status
- [ ] `https://shortedbro.xyz` loads the frontend
- [ ] Login/Signup works without "failed to fetch" error
- [ ] Creating a short link returns URL with `go.shortedbro.xyz`
- [ ] Short links redirect properly: `https://go.shortedbro.xyz/{slug}`
- [ ] SSL certificate is valid (no browser warnings)

---

## Troubleshooting

### "Failed to Fetch" Still Occurs

**Issue:** Frontend can't reach backend

**Solutions:**

1. **Verify DNS**
   ```bash
   curl https://go.shortedbro.xyz/health
   ```

2. **Check SSL Certificate**
   - Visit https://go.shortedbro.xyz in browser
   - Verify no SSL errors

3. **Check CORS**
   - Backend already configured to allow all origins
   - No changes needed

4. **Verify Environment Variables**
   ```bash
   # In frontend, check .env.production
   cat edgelink/frontend/.env.production | grep API_URL
   ```

### DNS Not Propagating

**Wait 5-30 minutes for DNS to propagate globally**

Check status:
- https://dnschecker.org/ (enter: go.shortedbro.xyz)

### SSL Certificate Issues

Cloudflare automatically issues certificates. If issues persist:

1. Go to Cloudflare Dashboard → SSL/TLS
2. Set to **Full (strict)**
3. Wait 5-10 minutes

### Custom Domain Shows "1016 Error"

**Issue:** DNS record not found

**Solution:**
1. Verify CNAME record exists
2. Enable Cloudflare proxy (orange cloud)
3. Wait for DNS propagation

---

## Rollback (If Needed)

If custom domain setup fails, the application will continue working with:
- `https://edgelink-production.quoteviral.workers.dev`

No downtime will occur during setup.

---

## Support

For Cloudflare-specific issues:
- Cloudflare Docs: https://developers.cloudflare.com/workers/platform/triggers/custom-domains/
- Cloudflare Community: https://community.cloudflare.com/

For application issues:
- Check [LOCAL_DEVELOPMENT_GUIDE.md](LOCAL_DEVELOPMENT_GUIDE.md)
- Review [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

---

## Next Steps After Setup

Once custom domains are configured:

1. **Update Documentation**
   - All docs reference the old domain
   - Run global find/replace for domain references

2. **Update Browser Extension**
   - `edgelink/browser-extension/lib/api.js`
   - Change API_BASE_URL to `https://go.shortedbro.xyz`

3. **Test All Features**
   - Login/Signup
   - Link creation
   - Link redirection
   - QR code generation
   - Analytics

---

**Last Updated:** November 12, 2025
