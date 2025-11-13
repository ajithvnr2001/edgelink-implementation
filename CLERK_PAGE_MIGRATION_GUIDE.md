# Clerk Page Migration Guide

This guide explains how to complete the migration of all protected pages to use Clerk authentication.

## ✅ What's Already Done

### Frontend
- ✅ **`/sign-in`** - New Clerk sign-in page (with Edge Runtime)
- ✅ **`/sign-up`** - New Clerk sign-up page (with Edge Runtime)
- ✅ **`/login`** - Redirects to `/sign-in` (backward compatibility)
- ✅ **`/signup`** - Redirects to `/sign-up` (backward compatibility)
- ✅ **`/dashboard`** - Partial Clerk integration:
  - ✅ Uses `useAuth()` and `useUser()` hooks
  - ✅ Clerk-based authentication check
  - ✅ Clerk-based logout
  - ✅ `loadLinks()` uses Clerk token
  - ⚠️ Other API calls still use old `@/lib/api` functions

### Backend
- ✅ **Clerk authentication middleware** (`clerk-auth.ts`)
- ✅ **Clerk webhook handler** (`clerk-webhook.ts`) for user sync
- ✅ **Webhook route** at `POST /webhooks/clerk`
- ✅ **Database migration script** for Clerk support
- ✅ **Backward compatibility** with API keys maintained

### Documentation
- ✅ **CLERK_MIGRATION_GUIDE.md** - Initial setup guide
- ✅ **SECRETS_SETUP.md** - Backend secrets configuration
- ✅ **Environment variable templates** created

## ⚠️ What Still Needs To Be Done

### Dashboard API Calls (Priority 1)
The dashboard still uses old API client functions. You need to update:
- `handleDelete()` - Currently uses `deleteLink()` from `@/lib/api`
- `handleEditSubmit()` - Currently uses `updateLink()` from `@/lib/api`
- `handleGenerateQR()` - Uses `getAccessToken()` instead of `getToken()`
- `openRoutingModal()` - Uses `getRouting()` from `@/lib/api`
- `handleSaveRouting()` - Uses `setDeviceRouting()` from `@/lib/api`
- `handleDeleteRouting()` - Uses `deleteRouting()` from `@/lib/api`
- `openGeoRoutingModal()` - Uses `getRouting()` from `@/lib/api`
- `handleSaveGeoRouting()` - Uses `setGeoRouting()` from `@/lib/api`
- `openReferrerRoutingModal()` - Uses `getRouting()` from `@/lib/api`
- `handleSaveReferrerRouting()` - Uses `setReferrerRouting()` from `@/lib/api`

### Other Protected Pages (Priority 2)
These pages need full Clerk migration:
1. **`/create`** - Link creation page
2. **`/import-export`** - Import/export functionality
3. **`/domains`** - Custom domain management
4. **`/apikeys`** - API key management
5. **`/webhooks`** - Webhook management
6. **`/analytics/[slug]`** - Analytics page

### Backend Integration (Priority 3)
- Update all backend routes to use `requireClerkAuth` instead of `requireAuth`
- Test Clerk token verification in production
- Set up Clerk webhook in production (currently only configured for dev)

---

## 📋 Detailed Migration Status

### Dashboard (`/dashboard`) - 30% Complete
**What works:**
- ✅ Clerk authentication check
- ✅ User display (email, plan)
- ✅ Logout functionality
- ✅ Loading links list

**What needs updating:**
- ❌ Delete link function
- ❌ Edit link function
- ❌ QR code generation
- ❌ Device routing
- ❌ Geographic routing
- ❌ Referrer routing
- ❌ All modal functions

**Estimated effort:** 2-3 hours

### Other Pages - 0% Complete
1. **`/create`** - Needs full migration (~30 min)
2. **`/import-export`** - Needs full migration (~45 min)
3. **`/domains`** - Needs full migration (~1 hour)
4. **`/apikeys`** - Needs full migration (~30 min)
5. **`/webhooks`** - Needs full migration (~30 min)
6. **`/analytics/[slug]`** - Needs full migration (~45 min)

**Total estimated effort:** 6-8 hours for complete migration

---

## 🔧 Step-by-Step Migration for Each Page

For each protected page, follow these steps:

### Step 1: Update Imports

**OLD:**
```typescript
import { getUser, logout, getAccessToken } from '@/lib/api'
```

**NEW:**
```typescript
import { useAuth, useUser } from '@clerk/nextjs'
```

### Step 2: Replace Authentication Hooks

**OLD:**
```typescript
export default function MyPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)
    loadData()
  }, [router])
```

**NEW:**
```typescript
export default function MyPage() {
  const router = useRouter()
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth()
  const { user: clerkUser } = useUser()

  // Map Clerk user to expected format
  const user = clerkUser ? {
    email: clerkUser.primaryEmailAddress?.emailAddress || '',
    plan: 'free' as 'free' | 'pro', // TODO: Fetch from backend
    user_id: clerkUser.id
  } : null

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      router.push('/sign-in')
      return
    }
    if (clerkUser) {
      loadData()
    }
  }, [isLoaded, isSignedIn, clerkUser, router])
```

### Step 3: Update Logout Function

**OLD:**
```typescript
const handleLogout = async () => {
  await logout()
  router.push('/')
}
```

**NEW:**
```typescript
const handleLogout = async () => {
  await signOut()
  router.push('/')
}
```

### Step 4: Update API Calls to Use Clerk Tokens

**OLD (using getAccessToken):**
```typescript
import { getAccessToken } from '@/lib/api'

const token = getAccessToken()
const response = await fetch(`${API_URL}/api/links`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

**NEW (using Clerk's getToken):**
```typescript
// getToken from useAuth() hook
const token = await getToken()
const response = await fetch(`${API_URL}/api/links`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

### Step 5: Update All API Function Calls

For every function that makes an API call, you need to:

1. Get the token using `getToken()` from the `useAuth()` hook
2. Pass it to the API call

**Example - Old deleteLink call:**
```typescript
import { deleteLink } from '@/lib/api'

const handleDelete = async (slug: string) => {
  await deleteLink(slug)
}
```

**Example - New deleteLink call:**
```typescript
const handleDelete = async (slug: string) => {
  const token = await getToken()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://go.shortedbro.xyz'

  const response = await fetch(`${API_URL}/api/links/${slug}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) throw new Error('Failed to delete link')
}
```

---

## 🔧 Dashboard API Call Updates

### Example 1: Update handleDelete Function

**Current Code (line ~125-133):**
```typescript
const handleDelete = async (slug: string) => {
  if (!confirm('Are you sure you want to delete this link?')) {
    return
  }

  try {
    await deleteLink(slug) // ❌ Old API client
    setLinks(links.filter(link => link.slug !== slug))
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to delete link')
  }
}
```

**Updated Code:**
```typescript
const handleDelete = async (slug: string) => {
  if (!confirm('Are you sure you want to delete this link? This action cannot be undone.')) {
    return
  }

  try {
    const token = await getToken() // ✅ Get Clerk token
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://go.shortedbro.xyz'

    const response = await fetch(`${API_URL}/api/links/${slug}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete link')
    }

    setLinks(links.filter(link => link.slug !== slug))
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to delete link')
  }
}
```

### Example 2: Update handleEditSubmit Function

**Find this section around line ~138-193:**
```typescript
const handleEditSubmit = async () => {
  // ... validation code ...

  try {
    const response = await updateLink( // ❌ Old API client
      editingLink.slug,
      editDestination,
      slugChanged ? editSlug : undefined
    )
    // ...
  }
}
```

**Update to:**
```typescript
const handleEditSubmit = async () => {
  if (!editingLink || !editDestination.trim()) return

  // Validation code remains the same...

  setEditLoading(true)
  try {
    const token = await getToken() // ✅ Get Clerk token
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://go.shortedbro.xyz'

    const response = await fetch(`${API_URL}/api/links/${editingLink.slug}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        destination: editDestination,
        new_slug: slugChanged ? editSlug : undefined
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update link')
    }

    // Update local state...
    setLinks(links.map(link =>
      link.slug === editingLink.slug
        ? { ...link, slug: slugChanged ? editSlug : link.slug, destination: editDestination }
        : link
    ))

    closeEditModal()

    if (slugChanged) {
      alert(`Short code successfully changed from "${editingLink.slug}" to "${editSlug}"`)
    }
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to update link')
  } finally {
    setEditLoading(false)
  }
}
```

### Example 3: Update handleGenerateQR Function

The QR code function already uses fetch, but it uses `getAccessToken()` instead of Clerk's `getToken()`.

**Find around line ~195-264:**
```typescript
const handleGenerateQR = async (link: LinkType, format: 'svg' | 'png' = 'svg') => {
  // ...
  const accessToken = getAccessToken() // ❌ Old token method

  const headers: HeadersInit = {
    'Authorization': `Bearer ${accessToken}`
  }
  // ...
}
```

**Update to:**
```typescript
const handleGenerateQR = async (link: LinkType, format: 'svg' | 'png' = 'svg') => {
  if (!user) return

  if (user.plan !== 'pro') {
    alert('QR code generation is a Pro feature. Upgrade to unlock this feature!')
    return
  }

  setQrCodeLink(link)
  setQrCodeLoading(true)
  setQrCodeData(null)

  try {
    const token = await getToken() // ✅ Use Clerk token
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://go.shortedbro.xyz'

    if (!token) {
      throw new Error('Not authenticated. Please log in again.')
    }

    const response = await fetch(`${API_URL}/api/links/${link.slug}/qr?format=${format}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to generate QR code')
    }

    if (format === 'svg') {
      const svgText = await response.text()
      setQrCodeData(svgText)
    } else {
      const blob = await response.blob()
      const dataUrl = URL.createObjectURL(blob)
      setQrCodeData(dataUrl)
    }
  } catch (err) {
    console.error('QR Generation Error:', err)
    alert(err instanceof Error ? err.message : 'Failed to generate QR code')
    setQrCodeLink(null)
  } finally {
    setQrCodeLoading(false)
  }
}
```

---

## 📝 Complete Example: Migrating /create Page

Here's a full before/after example:

### BEFORE:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUser, logout, shortenUrl } from '@/lib/api'

export default function CreatePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const currentUser = getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)
  }, [router])

  const handleCreate = async (url: string) => {
    const result = await shortenUrl({ url })
    // ...
  }

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return (
    // UI...
  )
}
```

### AFTER:
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useUser } from '@clerk/nextjs'

export default function CreatePage() {
  const router = useRouter()
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth()
  const { user: clerkUser } = useUser()

  // Map Clerk user to expected format
  const user = clerkUser ? {
    email: clerkUser.primaryEmailAddress?.emailAddress || '',
    plan: 'free' as 'free' | 'pro',
    user_id: clerkUser.id
  } : null

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      router.push('/sign-in')
      return
    }
  }, [isLoaded, isSignedIn, router])

  const handleCreate = async (url: string) => {
    const token = await getToken()
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://go.shortedbro.xyz'

    const response = await fetch(`${API_URL}/api/shorten`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    })

    if (!response.ok) throw new Error('Failed to create link')
    const result = await response.json()
    // ...
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  if (!isLoaded ||  !isSignedIn) {
    return <div>Loading...</div>
  }

  return (
    // UI...
  )
}
```

---

## 🎯 Function Mapping Reference

Here are all the old API functions and how to replace them:

| Old Function | New Approach |
|--------------|--------------|
| `getUser()` | Use `useUser()` hook → `clerkUser` |
| `getAccessToken()` | Use `useAuth()` hook → `await getToken()` |
| `logout()` | Use `useAuth()` hook → `await signOut()` |
| `login(email, password)` | Redirect to `/sign-in` |
| `signup(email, password)` | Redirect to `/sign-up` |
| `getLinks()` | `fetch` with `getToken()` |
| `deleteLink(slug)` | `fetch DELETE` with `getToken()` |
| `updateLink(slug, data)` | `fetch PUT` with `getToken()` |
| `shortenUrl(data)` | `fetch POST` with `getToken()` |
| `getDomains()` | `fetch` with `getToken()` |
| `addDomain(domain)` | `fetch POST` with `getToken()` |
| `getAPIKeys()` | `fetch` with `getToken()` |
| `generateAPIKey(name)` | `fetch POST` with `getToken()` |
| All other API calls | `fetch` with Clerk token |

---

## 🚀 Quick Migration Checklist

For each protected page:

- [ ] Import `useAuth` and `useUser` from `@clerk/nextjs`
- [ ] Remove imports from old `@/lib/api`
- [ ] Replace `useState` user with Clerk `useUser()` hook
- [ ] Update `useEffect` to check Clerk auth status
- [ ] Map `clerkUser` to expected `user` format
- [ ] Update logout to use `signOut()`
- [ ] Replace all API calls to use `getToken()`
- [ ] Update loading states to check `isLoaded`
- [ ] Test the page works with Clerk auth

---

## 🔍 Finding All API Calls

To find all API calls in a file, search for:
- `from '@/lib/api'` - Old API imports
- `getAccessToken()` - Old token retrieval
- `getUser()` - Old user retrieval
- `logout()` - Old logout function

---

## ⚡ Pro Tips

1. **Test incrementally**: Migrate one page at a time and test thoroughly
2. **Use browser DevTools**: Check Network tab to see if Clerk tokens are being sent
3. **Check Clerk Dashboard**: Monitor authentication events and errors
4. **Keep old API file**: Don't delete `/lib/api.ts` until ALL pages are migrated
5. **Use TypeScript**: TypeScript will help catch missing token parameters

---

## 🐛 Common Issues

### Issue: "Cannot read property 'primaryEmailAddress' of null"
**Solution:** Add null check before accessing user:
```typescript
const email = clerkUser?.primaryEmailAddress?.emailAddress || ''
```

### Issue: API returns 401 Unauthorized
**Solution:** Make sure you're awaiting `getToken()`:
```typescript
const token = await getToken() // Don't forget await!
```

### Issue: User redirected to sign-in on page refresh
**Solution:** Check that `isLoaded` is true before checking `isSignedIn`:
```typescript
if (!isLoaded) return null // Wait for Clerk to load
if (!isSignedIn) router.push('/sign-in')
```

### Issue: "plan" is always "free"
**Solution:** You need to fetch the user's plan from your backend:
```typescript
const fetchUserPlan = async () => {
  const token = await getToken()
  const response = await fetch(`${API_URL}/api/user/profile`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const data = await response.json()
  return data.plan
}
```

---

## 🔍 Finding What Needs Updating

### Quick Audit Commands

**Find old API imports:**
```bash
cd edgelink/frontend/src
grep -r "from '@/lib/api'" app/
```

**Find getAccessToken usage:**
```bash
grep -r "getAccessToken()" app/
```

**Find old API function calls in dashboard:**
```bash
grep -n "deleteLink\|updateLink\|getRouting\|setDeviceRouting\|setGeoRouting\|setReferrerRouting\|deleteRouting" app/dashboard/page.tsx
```

---

## 🛠️ Backend Integration

### Current State
- ✅ Clerk middleware created at `backend/src/middleware/clerk-auth.ts`
- ✅ Webhook handler created at `backend/src/handlers/clerk-webhook.ts`
- ✅ Webhook route added to `backend/src/index.ts`
- ❌ Most routes still use old `requireAuth` instead of `requireClerkAuth`

### Next Steps for Backend

1. **Update route handlers to use Clerk auth:**

**Find:**
```typescript
import { requireAuth } from './middleware/auth'
```

**Replace with:**
```typescript
import { requireClerkAuth } from './middleware/clerk-auth'
```

2. **Update route logic:**

**OLD:**
```typescript
const { user, error } = await requireAuth(request, env)
if (error) return error
// user.sub contains user_id
```

**NEW:**
```typescript
const { user, error } = await requireClerkAuth(request, env)
if (error) return error
// user.user_id contains user_id (different structure!)
```

3. **Update user object references:**

Clerk auth returns a different user structure:
```typescript
// Old auth
user.sub → user_id
user.email → email
user.plan → plan

// Clerk auth
user.user_id → user_id
user.email → email
user.plan → plan
user.clerk_user_id → Clerk's ID
```

---

## 📚 Additional Resources

- [Clerk Next.js Documentation](https://clerk.com/docs/quickstarts/nextjs)
- [useAuth Hook Reference](https://clerk.com/docs/references/react/use-auth)
- [useUser Hook Reference](https://clerk.com/docs/references/react/use-user)
- [Clerk Backend SDK](https://clerk.com/docs/references/backend/overview)
- [Clerk Webhooks Guide](https://clerk.com/docs/integrations/webhooks)

---

## ✅ Migration Complete Checklist

### Frontend
- [ ] `/dashboard` - All API calls updated
- [ ] `/create` - Migrated to Clerk
- [ ] `/import-export` - Migrated to Clerk
- [ ] `/domains` - Migrated to Clerk
- [ ] `/apikeys` - Migrated to Clerk
- [ ] `/webhooks` - Migrated to Clerk
- [ ] `/analytics/[slug]` - Migrated to Clerk

### Backend
- [ ] All routes using `requireClerkAuth`
- [ ] Clerk webhook configured in production
- [ ] Clerk secrets set in production
- [ ] Database migration run in production

### Testing
- [ ] Sign up flow works
- [ ] Sign in flow works
- [ ] Dashboard loads correctly
- [ ] Create link works
- [ ] Edit link works
- [ ] Delete link works
- [ ] QR code generation works (Pro users)
- [ ] Routing features work (Pro users)
- [ ] Analytics page works
- [ ] Domain management works
- [ ] API keys management works
- [ ] Webhooks management works
- [ ] Logout works correctly
- [ ] Session persists on page refresh
- [ ] Clerk webhook syncs users correctly

### Cleanup (Optional)
- [ ] Remove old `/lib/api.ts` file
- [ ] Remove old `/lib/api.ts` client functions
- [ ] Remove old `/backend/src/handlers/auth.ts`
- [ ] Remove old `/backend/src/middleware/auth.ts`
- [ ] Remove JWT secret (keep for API keys backward compat)

---

## 📞 Need Help?

If you get stuck:
1. Check browser console for errors
2. Check Network tab to see if tokens are being sent
3. Check Clerk Dashboard for authentication errors
4. Review the examples in this guide
5. Check `CLERK_MIGRATION_GUIDE.md` for setup instructions
6. Check `SECRETS_SETUP.md` for backend configuration

Good luck with the migration! 🚀

---

**Last Updated:** Based on commit 258168c (Dashboard partial migration complete)
