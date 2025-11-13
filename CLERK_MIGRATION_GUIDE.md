# Clerk Authentication Migration Guide

This guide explains how to complete the Clerk authentication migration for EdgeLink. I've implemented the code changes, but you need to complete several configuration steps on your end.

## 🎯 What Has Been Done

I've successfully implemented:

✅ **Frontend Changes:**
- Installed `@clerk/nextjs` package
- Wrapped the app with `ClerkProvider` in `layout.tsx`
- Created Clerk middleware for route protection
- Created new sign-in page at `/sign-in` with Clerk components
- Created new sign-up page at `/sign-up` with Clerk components
- Created new API client (`clerk-api.ts`) that uses Clerk session tokens
- Updated home page navigation to point to new auth pages

✅ **Backend Changes:**
- Installed `@clerk/backend` and `svix` packages
- Created Clerk authentication middleware (`clerk-auth.ts`)
- Created Clerk webhook handler for user sync (`clerk-webhook.ts`)
- Created database migration script (`schema-clerk-migration.sql`)
- Maintained backward compatibility with API keys

## 🔧 What You Need To Do

### Step 1: Create a Clerk Account

1. Go to [https://clerk.com](https://clerk.com)
2. Sign up for a free account
3. Create a new application (choose "Next.js" as the framework)

### Step 2: Get Your Clerk Keys

From your Clerk Dashboard:

1. Go to **API Keys** section
2. Copy the following keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_test_` or `pk_live_`)
   - `CLERK_SECRET_KEY` (starts with `sk_test_` or `sk_live_`)

### Step 3: Configure Environment Variables

#### Frontend Environment Variables

Create `/edgelink/frontend/.env.local`:

```env
# Clerk Authentication Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here

# Clerk URLs (use defaults)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8787
```

#### Backend Environment Variables (Cloudflare Workers)

Add these to your Cloudflare Workers environment:

```bash
# For development (wrangler.toml)
wrangler secret put CLERK_SECRET_KEY
# Paste your sk_test_... key when prompted

# For production
wrangler secret put CLERK_SECRET_KEY --env production
# Paste your sk_live_... key when prompted
```

### Step 4: Configure Clerk Webhooks

Webhooks keep your database in sync with Clerk user events.

1. **In Clerk Dashboard:**
   - Go to **Webhooks** section
   - Click **Add Endpoint**

2. **Endpoint URL:**
   - Development: `http://localhost:8787/webhooks/clerk`
   - Production: `https://your-worker-domain.com/webhooks/clerk`

3. **Select Events:**
   - `user.created`
   - `user.updated`
   - `user.deleted`

4. **Get Webhook Secret:**
   - After creating the endpoint, copy the **Signing Secret** (starts with `whsec_`)
   - Add it to your backend environment:

```bash
wrangler secret put CLERK_WEBHOOK_SECRET
# Paste your whsec_... secret when prompted
```

### Step 5: Run Database Migration

Apply the Clerk migration to your database:

```bash
# For D1 Database (Cloudflare)
cd edgelink/backend
wrangler d1 execute edgelink-db --file=schema-clerk-migration.sql

# For production
wrangler d1 execute edgelink-db --file=schema-clerk-migration.sql --env production
```

This adds:
- `clerk_user_id` column to users table
- `clerk_metadata` column for storing Clerk data
- Index on `clerk_user_id` for fast lookups

### Step 6: Update Backend Worker Routes

You need to add the Clerk webhook endpoint to your worker's routing.

**File to update:** `edgelink/backend/src/index.ts`

Add this route handler:

```typescript
import { handleClerkWebhook } from './handlers/clerk-webhook'

// Add to your router
if (url.pathname === '/webhooks/clerk' && request.method === 'POST') {
  return handleClerkWebhook(request, env)
}
```

### Step 7: Update Protected Routes

You need to update your backend routes to use the new Clerk authentication middleware.

**Example:**

```typescript
// Old way (custom JWT)
import { requireAuth } from './middleware/auth'

// New way (Clerk)
import { requireClerkAuth } from './middleware/clerk-auth'

// In your route handler
const { user, error } = await requireClerkAuth(request, env)
if (error) return error

// user now contains: { user_id, clerk_user_id, email, plan }
```

### Step 8: Update Dashboard and Protected Pages

The dashboard and other protected frontend pages need to be updated to use Clerk hooks.

**Example for dashboard page:**

```typescript
'use client'

import { useAuth, useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { getLinks } from '@/lib/clerk-api'

export default function DashboardPage() {
  const { getToken, userId } = useAuth()
  const { user } = useUser()
  const [links, setLinks] = useState([])

  useEffect(() => {
    async function loadData() {
      const token = await getToken()
      const data = await getLinks(token)
      setLinks(data.links)
    }

    if (userId) {
      loadData()
    }
  }, [userId])

  if (!userId) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>Welcome, {user?.firstName}!</h1>
      {/* Rest of dashboard */}
    </div>
  )
}
```

### Step 9: Configure Clerk Appearance (Optional)

Customize the look and feel of Clerk components to match EdgeLink:

In `layout.tsx`:

```typescript
<ClerkProvider
  appearance={{
    baseTheme: dark,
    elements: {
      rootBox: 'mx-auto',
      card: 'bg-gray-800 shadow-xl border border-gray-700',
      headerTitle: 'text-white',
      headerSubtitle: 'text-gray-400',
      formButtonPrimary: 'bg-primary-500 hover:bg-primary-600',
      formFieldInput: 'bg-gray-700 border-gray-600 text-white',
      footerActionLink: 'text-primary-500 hover:text-primary-400',
    },
  }}
>
  {/* ... */}
</ClerkProvider>
```

### Step 10: Test the Implementation

1. **Start Development Servers:**
```bash
npm run dev
```

2. **Test Sign Up:**
   - Go to `http://localhost:3000/sign-up`
   - Create a new account
   - Verify you can sign up successfully
   - Check your database - a new user should be created with `clerk_user_id`

3. **Test Sign In:**
   - Go to `http://localhost:3000/sign-in`
   - Sign in with your account
   - Verify you're redirected to `/dashboard`

4. **Test Protected Routes:**
   - Try accessing `/dashboard` without being signed in
   - Should redirect to `/sign-in`

5. **Test API Calls:**
   - Create a short link from the dashboard
   - Verify the Clerk token is being sent to the backend
   - Check backend logs for successful authentication

6. **Test Webhooks:**
   - Update your profile in Clerk Dashboard
   - Check your database - the user should be updated
   - Check webhook logs in Clerk Dashboard

## 🔒 Security Considerations

1. **Never commit `.env.local` files** - Add to `.gitignore`
2. **Use different keys** for development and production
3. **Rotate secrets** if they're ever exposed
4. **Enable MFA** in Clerk Dashboard for your admin account
5. **Monitor webhook logs** for suspicious activity

## 🚀 Deployment

### Frontend (Next.js on Cloudflare Pages)

```bash
cd edgelink/frontend
npm run build
wrangler pages deploy .next --project-name=edgelink-production
```

Set environment variables in Cloudflare Pages dashboard:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- Other Clerk config variables

### Backend (Cloudflare Workers)

```bash
cd edgelink/backend
wrangler deploy --env production
```

Secrets are already set via `wrangler secret put`.

## 📊 Monitoring

Monitor these in Clerk Dashboard:
- **User Growth**: Track sign-ups over time
- **Active Sessions**: See who's currently logged in
- **Webhook Deliveries**: Ensure sync is working
- **Authentication Events**: Monitor sign-ins and sign-ups

## 🆘 Troubleshooting

### Issue: "Clerk: Missing publishable key"
**Solution:** Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set in `.env.local`

### Issue: "Webhook verification failed"
**Solution:** Check that `CLERK_WEBHOOK_SECRET` matches the secret in Clerk Dashboard

### Issue: "User not found in database"
**Solution:** Check webhook logs - webhook may not be firing or failing

### Issue: "Authentication required" error
**Solution:** Verify token is being passed correctly from frontend to backend

### Issue: Old login/signup pages still exist
**Solution:** You can safely delete:
- `edgelink/frontend/src/app/login/page.tsx`
- `edgelink/frontend/src/app/signup/page.tsx`
- `edgelink/frontend/src/lib/api.ts` (replaced by `clerk-api.ts`)

## 🔄 Backward Compatibility

The system maintains backward compatibility:

✅ **API Keys still work** - Existing API key users won't be affected
✅ **Existing users can migrate** - Add their Clerk ID when they first sign in with Clerk
✅ **Gradual rollout** - You can run both auth systems in parallel during migration

## 📝 Migration Checklist

Use this checklist to track your progress:

- [ ] Created Clerk account
- [ ] Got Clerk API keys
- [ ] Set frontend environment variables
- [ ] Set backend environment variables (secrets)
- [ ] Configured Clerk webhooks
- [ ] Ran database migration
- [ ] Updated backend route handlers
- [ ] Updated dashboard to use Clerk hooks
- [ ] Updated other protected pages
- [ ] Tested sign up flow
- [ ] Tested sign in flow
- [ ] Tested protected routes
- [ ] Tested API calls with Clerk token
- [ ] Tested webhooks
- [ ] Deployed to production
- [ ] Verified production deployment

## 🎓 Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Next.js Quickstart](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk Webhooks Guide](https://clerk.com/docs/integrations/webhooks)
- [Clerk API Reference](https://clerk.com/docs/reference/backend-api)

## 💬 Need Help?

If you encounter issues:
1. Check Clerk Dashboard logs
2. Check browser console for frontend errors
3. Check Cloudflare Workers logs for backend errors
4. Review webhook delivery logs in Clerk Dashboard

---

**Note:** This migration maintains full backward compatibility. Your existing API key users will continue to work without any changes.
