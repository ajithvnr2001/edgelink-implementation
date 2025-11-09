# Quick Start: Production Deployment

This guide will help you deploy EdgeLink to Cloudflare production in 15 minutes.

## Prerequisites

1. **Cloudflare Account** (Free tier is fine, Paid recommended)
   - Sign up at https://dash.cloudflare.com/sign-up
   - Add payment method for production use

2. **Domain Name** (Optional but recommended)
   - Can use Cloudflare Workers subdomain initially
   - Add custom domain later

3. **System Requirements**
   - Node.js v18 or higher
   - npm v8 or higher
   - Git

## Quick Deployment

### Option 1: Automated Script (Recommended)

Run the automated deployment script:

```bash
# From project root
./deploy-production.sh
```

The script will guide you through:
1. ✓ Checking prerequisites
2. ✓ Cloudflare authentication
3. ✓ Creating production database
4. ✓ Creating KV namespace
5. ✓ Creating R2 bucket
6. ✓ Generating and setting secrets
7. ✓ Deploying backend
8. ✓ Deploying frontend

### Option 2: Manual Deployment

If you prefer manual deployment, follow these steps:

#### Step 1: Authenticate with Cloudflare

```bash
wrangler login
```

This opens a browser window for authentication.

#### Step 2: Create Production Database

```bash
cd backend

# Create D1 database
wrangler d1 create edgelink-production

# Copy the database_id from output
# Update wrangler.prod.toml with the database_id

# Initialize schema
wrangler d1 execute edgelink-production --file=./schema.sql

# Verify
wrangler d1 execute edgelink-production --command="SELECT name FROM sqlite_master WHERE type='table';"
```

#### Step 3: Create KV Namespace

```bash
# Create KV namespace for link storage
wrangler kv:namespace create "LINKS_KV" --env production

# Copy the id from output
# Update wrangler.prod.toml with the KV namespace id
```

#### Step 4: Create R2 Bucket

```bash
# Create R2 bucket for file storage
wrangler r2 bucket create edgelink-production-storage
```

#### Step 5: Generate and Set Secrets

```bash
# Generate strong secrets
JWT_SECRET=$(openssl rand -base64 48)
REFRESH_TOKEN_SECRET=$(openssl rand -base64 48)

# Save these securely!
echo "JWT_SECRET: $JWT_SECRET"
echo "REFRESH_TOKEN_SECRET: $REFRESH_TOKEN_SECRET"

# Set secrets in Cloudflare
echo "$JWT_SECRET" | wrangler secret put JWT_SECRET --env production
echo "$REFRESH_TOKEN_SECRET" | wrangler secret put REFRESH_TOKEN_SECRET --env production

# Verify secrets are set
wrangler secret list --env production
```

#### Step 6: Deploy Backend

```bash
# Install dependencies
npm ci --production

# Deploy to Cloudflare Workers
wrangler deploy --env production

# Note the deployed URL (e.g., https://edgelink-production.YOUR_SUBDOMAIN.workers.dev)
```

#### Step 7: Configure Frontend

```bash
cd ../frontend

# Edit .env.production
nano .env.production

# Set:
# NEXT_PUBLIC_API_URL=https://edgelink-production.YOUR_SUBDOMAIN.workers.dev
# NEXT_PUBLIC_FRONTEND_URL=https://your-pages-url.pages.dev
```

#### Step 8: Deploy Frontend

```bash
# Install dependencies
npm ci --production

# Build
NODE_ENV=production npm run build

# Create Pages project
wrangler pages project create edgelink-production

# Deploy
wrangler pages deploy .next --project-name=edgelink-production --branch=main

# Note the deployed URL
```

## Verify Deployment

Test your deployment:

```bash
# Test backend health
curl https://edgelink-production.YOUR_SUBDOMAIN.workers.dev/api/health

# Expected: {"status":"ok","environment":"production"}

# Test frontend
curl https://YOUR_PROJECT.pages.dev

# Should return HTML
```

## Post-Deployment

### 1. Configure Custom Domain (Optional)

**Backend (Workers)**:
1. Go to Cloudflare Dashboard → Workers & Pages
2. Click on `edgelink-production`
3. Go to Settings → Triggers
4. Add Custom Domain: `api.yourdomain.com`

**Frontend (Pages)**:
1. Go to Cloudflare Dashboard → Workers & Pages
2. Click on `edgelink-production` (Pages project)
3. Go to Custom domains
4. Add Custom Domain: `yourdomain.com`

### 2. Update Environment Variables

After adding custom domains, update `.env.production`:

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_FRONTEND_URL=https://yourdomain.com
NEXT_PUBLIC_SHORT_URL_DOMAIN=yourdomain.com
```

Redeploy frontend:

```bash
cd frontend
npm run build
wrangler pages deploy .next --project-name=edgelink-production --branch=main
```

### 3. Configure CORS (if using custom domain)

Update backend `src/index.ts` if needed to allow your custom domain:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourdomain.com',
  // ... other headers
};
```

Redeploy backend:

```bash
cd backend
wrangler deploy --env production
```

### 4. Set Up Monitoring

- **Cloudflare Dashboard**: Monitor requests, errors, CPU time
- **Uptime Monitoring**: Use UptimeRobot or similar
- **Error Tracking**: Set up Sentry (optional)

### 5. Create First Admin User

Use the registration endpoint to create your admin account:

```bash
curl -X POST https://api.yourdomain.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "SecurePassword123!",
    "name": "Admin User"
  }'
```

## Troubleshooting

### Backend deployment fails

```bash
# Check configuration
cat backend/wrangler.prod.toml

# Check secrets
cd backend
wrangler secret list --env production

# View logs
wrangler tail --env production
```

### Frontend deployment fails

```bash
# Check build
cd frontend
npm run build

# Check environment variables
cat .env.production

# Try deploying to a different branch first
wrangler pages deploy .next --project-name=edgelink-production --branch=staging
```

### Database connection errors

```bash
# Verify database exists
wrangler d1 list

# Verify tables
wrangler d1 execute edgelink-production --command="SELECT name FROM sqlite_master WHERE type='table';"

# Check database ID in wrangler.prod.toml matches
```

### CORS errors

- Make sure `NEXT_PUBLIC_API_URL` in frontend matches backend URL
- Check CORS headers in backend `src/index.ts`
- Verify custom domains are configured correctly

## Rollback

If something goes wrong:

```bash
# Backend rollback
cd backend
wrangler deployments list --env production
wrangler rollback --env production <deployment-id>

# Frontend rollback
# Go to Cloudflare Dashboard → Pages → Deployments
# Click on previous deployment → Rollback
```

## Security Checklist

- [ ] Strong JWT secrets set (64+ characters)
- [ ] HTTPS enforced (automatic with Cloudflare)
- [ ] Rate limiting configured
- [ ] CORS properly configured for your domain
- [ ] No secrets in code or environment files
- [ ] Database backups scheduled

## Production Monitoring

Monitor these metrics:

1. **Request Rate**: Should be within Workers free tier (100k/day) or paid plan
2. **Error Rate**: Should be < 1%
3. **Response Time**: Should be < 500ms for API
4. **Database Size**: Monitor D1 storage usage

## Cost Estimation

**Free Tier**:
- Workers: 100,000 requests/day
- Pages: Unlimited requests, 500 builds/month
- D1: 5GB storage, 5 million reads/day
- R2: 10GB storage, 1 million writes/month

**Paid (If needed)**:
- Workers: $5/month + $0.50/million requests
- Pages: $20/month for advanced features
- D1: $5/month for more capacity
- R2: $0.015/GB storage

## Next Steps

1. **Set up CI/CD**: See `.github/workflows/` for GitHub Actions
2. **Add monitoring**: Set up Sentry, DataDog, or similar
3. **Create backups**: Set up automated database backups
4. **Documentation**: Update API docs with your domain
5. **Browser Extension**: Configure extension to use production API

## Support

- **Documentation**: See PROD_DEPLOYMENT.md for detailed guide
- **Issues**: https://github.com/ajithvnr2001/edgelink/issues
- **Cloudflare Docs**: https://developers.cloudflare.com/

---

**Deployment Time**: ~15 minutes
**Cost**: Free tier available, ~$10-20/month for production scale
**Difficulty**: Easy with automated script, Moderate manually

🚀 Happy deploying!
