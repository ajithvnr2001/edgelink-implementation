# Custom Domain Setup - Quick Reference

## Domain Breakdown

Your EdgeLink application uses TWO domains:

1. **`shortedbro.xyz`** - Frontend (Users see this in browser)
2. **`go.shortedbro.xyz`** - Backend API (For short links and API calls)

---

## Setup Order (IMPORTANT: Follow This Sequence!)

### Step 1: Configure Backend Domain (`go.shortedbro.xyz`)

#### 1.1 Add to Cloudflare Workers Dashboard
```
1. Go to: https://dash.cloudflare.com/
2. Click: Workers & Pages
3. Click: edgelink-production (your worker)
4. Click: Triggers tab
5. Under "Custom Domains", click: Add Custom Domain
6. Enter: go.shortedbro.xyz
7. Click: Add Custom Domain
8. Wait 5-10 minutes for DNS propagation
```

#### 1.2 Test It Works
```bash
# Should return healthy status
curl https://go.shortedbro.xyz/health

# Expected response:
# {"status":"healthy","timestamp":...,"version":"1.0.0"}
```

#### 1.3 Update Code After Verification

**Only update these files AFTER the domain is working!**

**Backend Files:**
```typescript
// edgelink/backend/src/handlers/shorten.ts (3 locations)
// Line 79, 188, 192
'go.shortedbro.xyz'  // Replace workers.dev URL

// edgelink/backend/src/handlers/links.ts
// Line 567
'go.shortedbro.xyz'  // Replace workers.dev URL

// edgelink/backend/src/handlers/bulk-import.ts
// Line 360
'go.shortedbro.xyz'  // Replace workers.dev URL
```

**Frontend Files:**
```env
# edgelink/frontend/.env.production
NEXT_PUBLIC_API_URL=https://go.shortedbro.xyz
NEXT_PUBLIC_SHORT_URL_DOMAIN=go.shortedbro.xyz
```

```typescript
// edgelink/frontend/src/app/dashboard/page.tsx
// Lines 209, 270, 720, 725
'go.shortedbro.xyz'  // Replace workers.dev URL

// edgelink/frontend/src/app/create/page.tsx
// Line 329
Default (go.shortedbro.xyz)  // Update dropdown text
```

---

### Step 2: Configure Frontend Domain (`shortedbro.xyz`)

#### 2.1 Add to Cloudflare Pages Dashboard
```
1. Go to: https://dash.cloudflare.com/
2. Click: Workers & Pages
3. Click: edgelink-production (your Pages project)
4. Click: Custom domains tab
5. Click: Set up a custom domain
6. Enter: shortedbro.xyz
7. Click: Activate domain
8. Wait 5-10 minutes for DNS propagation
```

#### 2.2 Update Code After Verification

**Backend File:**
```toml
# edgelink/backend/wrangler.prod.toml
[env.production.vars]
FRONTEND_URL = "https://shortedbro.xyz"
```

**Frontend File:**
```env
# edgelink/frontend/.env.production
NEXT_PUBLIC_FRONTEND_URL=https://shortedbro.xyz
```

---

## Current vs. Target Configuration

### CURRENT (Working Now):
```
Backend API:     https://edgelink-production.quoteviral.workers.dev
Frontend:        https://edgelink-production.pages.dev
Short Links:     https://edgelink-production.quoteviral.workers.dev/{slug}
```

### TARGET (After Setup):
```
Backend API:     https://go.shortedbro.xyz
Frontend:        https://shortedbro.xyz
Short Links:     https://go.shortedbro.xyz/{slug}
```

---

## Files to Update Summary

### Backend Domain (`go.shortedbro.xyz`)

| Location | File | What to Change |
|----------|------|----------------|
| **Cloudflare** | Workers Dashboard | Add custom domain |
| Backend | `src/handlers/shorten.ts` | Default domain in 3 places |
| Backend | `src/handlers/links.ts` | Default domain for QR codes |
| Backend | `src/handlers/bulk-import.ts` | Import response URLs |
| Frontend | `.env.production` | `NEXT_PUBLIC_API_URL` |
| Frontend | `.env.production` | `NEXT_PUBLIC_SHORT_URL_DOMAIN` |
| Frontend | `src/app/dashboard/page.tsx` | Fallback URLs (4 places) |
| Frontend | `src/app/create/page.tsx` | Dropdown default text |

### Frontend Domain (`shortedbro.xyz`)

| Location | File | What to Change |
|----------|------|----------------|
| **Cloudflare** | Pages Dashboard | Add custom domain |
| Backend | `wrangler.prod.toml` | `FRONTEND_URL` variable |
| Frontend | `.env.production` | `NEXT_PUBLIC_FRONTEND_URL` |

---

## Verification Checklist

After configuring `go.shortedbro.xyz`:
- [ ] `curl https://go.shortedbro.xyz/health` returns healthy
- [ ] Backend code updated with new domain
- [ ] Frontend `.env.production` updated
- [ ] Backend redeployed: `wrangler deploy --config wrangler.prod.toml --env production`
- [ ] Frontend rebuilt and redeployed

After configuring `shortedbro.xyz`:
- [ ] `https://shortedbro.xyz` loads the frontend
- [ ] CORS allows API calls from new domain
- [ ] Login/signup works without errors
- [ ] Short links are created with `go.shortedbro.xyz`

---

## Important Notes

⚠️ **DO NOT update code before configuring domains in Cloudflare!**
- Configure in Cloudflare Dashboard FIRST
- Verify with curl/browser SECOND
- Update code THIRD
- Deploy LAST

⚠️ **The order matters!**
1. Set up `go.shortedbro.xyz` first (backend API)
2. Then set up `shortedbro.xyz` (frontend)

⚠️ **Old URLs will continue working**
- Workers URL keeps working even after custom domain is added
- No downtime during migration
- Can test custom domain before switching code

---

## Quick Commands

### Test Backend Domain
```bash
curl https://go.shortedbro.xyz/health
curl https://go.shortedbro.xyz/auth/signup -X POST -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"Test123"}'
```

### Deploy Backend
```bash
cd edgelink/backend
wrangler deploy --config wrangler.prod.toml --env production
```

### Deploy Frontend
```bash
cd edgelink/frontend
npm run build
wrangler pages deploy .next --project-name=edgelink-production
```

---

## If Something Goes Wrong

**Problem:** "Failed to fetch" after updating domains

**Solution:**
1. Verify domain is working: `curl https://go.shortedbro.xyz/health`
2. Check DNS: https://dnschecker.org/ (enter: go.shortedbro.xyz)
3. If not working, revert code to use `edgelink-production.quoteviral.workers.dev`
4. Wait longer for DNS propagation (can take up to 24 hours in rare cases)

**Problem:** SSL certificate error

**Solution:**
1. Go to Cloudflare Dashboard → SSL/TLS
2. Set encryption mode to "Full (strict)"
3. Wait 5-10 minutes for certificate issuance

---

**Last Updated:** November 12, 2025
