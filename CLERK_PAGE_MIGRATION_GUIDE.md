# Clerk Page Migration Guide

This guide explains how to complete the migration of all protected pages to use Clerk authentication.

## ✅ What's Already Done

I've updated the following:
- ✅ `/login` → Redirects to `/sign-in`
- ✅ `/signup` → Redirects to `/sign-up`
- ✅ `/dashboard` → Partial Clerk integration (see below)

##⚠️ What Still Needs To Be Done

The dashboard and other protected pages are very large (1900+ lines each) and need manual updates to fully integrate Clerk. Here's what you need to do:

---

## 📋 Pages That Need Full Migration

1. `/dashboard` - Partially migrated, needs API call updates
2. `/create` - Link creation page
3. `/import-export` - Import/export functionality
4. `/domains` - Custom domain management
5. `/apikeys` - API key management
6. `/webhooks` - Webhook management
7. `/analytics/[slug]` - Analytics page

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

## 📚 Additional Resources

- [Clerk Next.js Documentation](https://clerk.com/docs/quickstarts/nextjs)
- [useAuth Hook Reference](https://clerk.com/docs/references/react/use-auth)
- [useUser Hook Reference](https://clerk.com/docs/references/react/use-user)

---

## ✅ Migration Complete!

Once all pages are migrated:
1. Test authentication flow thoroughly
2. Test all features (create, edit, delete, analytics, etc.)
3. Verify API calls work with Clerk tokens
4. Check that logout works correctly
5. Optional: Delete old `/lib/api.ts` file
6. Optional: Delete old `/auth` handler files from backend

Good luck with the migration! 🚀
