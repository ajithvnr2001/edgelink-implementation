# How to Check Cloudflare Pages Logs

## Method 1: Cloudflare Dashboard (Real-time Logs)

1. Go to Cloudflare Dashboard: https://dash.cloudflare.com
2. Navigate to: **Workers & Pages** (left sidebar)
3. Click on your project: **edgelink-production**
4. Click on the **latest deployment** (top of the list)
5. Scroll down to **"Deployment details"**
6. Click **"View logs"** or **"Functions"** tab
7. You'll see real-time logs for all requests

## Method 2: Check Build Logs (GitHub Actions)

1. Go to: https://github.com/ajithvnr2001/edgelink-implementation/actions
2. Click on the latest **"Deploy Frontend to Cloudflare Pages"** workflow
3. Click on the **"deploy"** job
4. Expand each step to see detailed logs
5. Look for errors in the "Build with @cloudflare/next-on-pages" step

## Method 3: Cloudflare Pages CLI (Local)

```bash
# List recent deployments
cd edgelink/frontend
npx wrangler pages deployment list --project-name=edgelink-production

# View specific deployment details
npx wrangler pages deployment tail --project-name=edgelink-production
```

## Method 4: Browser DevTools Network Tab

1. Open your site: https://shortedbro.xyz/sign-in
2. Open DevTools (F12)
3. Go to **Network** tab
4. Try to sign in
5. Click on the failed `/sign-in/factor-one` request
6. Check:
   - **Headers** tab: See request/response headers
   - **Response** tab: See the actual error response
   - **Timing** tab: See if the request even reached your server

## What to Look For:

- **403 errors**: Cloudflare security blocking requests
- **404 errors**: Routing not configured properly
- **500 errors**: Application code errors
- **Build errors**: Check GitHub Actions logs

## Common Issues:

1. **"Access denied" (403)**: Cloudflare Pages Access Policy is enabled
2. **"Not Found" (404)**: Routes not generated correctly by @cloudflare/next-on-pages
3. **Build failures**: Check GitHub Actions for Google Fonts or other errors
