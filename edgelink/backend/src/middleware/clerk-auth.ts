/**
 * Clerk Authentication Middleware for Cloudflare Workers
 * Validates Clerk session tokens and syncs user data
 */

import { createClerkClient } from '@clerk/backend'
import type { Env } from '../types'

export interface ClerkUser {
  user_id: string
  clerk_user_id: string
  email: string
  plan: 'free' | 'pro'
}

export interface AuthenticatedRequest extends Request {
  user?: ClerkUser
}

/**
 * Verify Clerk session token and get user data
 */
async function verifyClerkToken(token: string, env: Env): Promise<ClerkUser | null> {
  try {
    // Create Clerk client
    const clerkClient = createClerkClient({
      secretKey: env.CLERK_SECRET_KEY,
    })

    // Verify the token
    const sessionClaims = await clerkClient.verifyToken(token, {
      // You can add additional verification options here
    })

    if (!sessionClaims || !sessionClaims.sub) {
      return null
    }

    const clerkUserId = sessionClaims.sub

    // Get or create user in database
    let user = await env.DB.prepare(`
      SELECT user_id, clerk_user_id, email, plan
      FROM users
      WHERE clerk_user_id = ?
    `)
      .bind(clerkUserId)
      .first<ClerkUser>()

    if (!user) {
      // Fetch full user details from Clerk
      const clerkUser = await clerkClient.users.getUser(clerkUserId)
      const email = clerkUser.emailAddresses[0]?.emailAddress || ''

      // Create user in database
      const userId = `usr_${crypto.randomUUID()}`
      await env.DB.prepare(`
        INSERT INTO users (
          user_id, clerk_user_id, email, name, plan,
          email_verified, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, 'free', TRUE, datetime('now'), datetime('now'))
      `)
        .bind(
          userId,
          clerkUserId,
          email,
          clerkUser.firstName || clerkUser.username || null
        )
        .run()

      user = {
        user_id: userId,
        clerk_user_id: clerkUserId,
        email: email,
        plan: 'free',
      }
    }

    // Update last login
    await env.DB.prepare(`
      UPDATE users SET last_login = datetime('now') WHERE user_id = ?
    `)
      .bind(user.user_id)
      .run()

    return user
  } catch (error) {
    console.error('Clerk token verification failed:', error)
    return null
  }
}

/**
 * Authentication Middleware
 * Supports both Clerk tokens and API keys
 */
export async function authenticateClerk(
  request: Request,
  env: Env
): Promise<{ request: AuthenticatedRequest; user: ClerkUser | null; error?: Response }> {
  try {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader) {
      return { request: request as AuthenticatedRequest, user: null }
    }

    const token = authHeader.replace(/^Bearer\s+/i, '')

    // Check if it's an API key (starts with elk_)
    if (token.startsWith('elk_')) {
      // API key authentication (keep existing logic)
      const apiKeyResult = await verifyAPIKey(token, env)

      if (!apiKeyResult.valid) {
        return {
          request: request as AuthenticatedRequest,
          user: null,
          error: new Response(
            JSON.stringify({
              error: 'Invalid or expired API key',
              code: 'INVALID_API_KEY',
            }),
            {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }
          ),
        }
      }

      const clerkUser: ClerkUser = {
        user_id: apiKeyResult.user_id!,
        clerk_user_id: '', // API keys don't have Clerk ID
        email: '',
        plan: apiKeyResult.plan || 'free',
      }

      const authenticatedRequest = request as AuthenticatedRequest
      authenticatedRequest.user = clerkUser

      return { request: authenticatedRequest, user: clerkUser }
    }

    // Try Clerk token verification
    const user = await verifyClerkToken(token, env)

    if (!user) {
      return { request: request as AuthenticatedRequest, user: null }
    }

    const authenticatedRequest = request as AuthenticatedRequest
    authenticatedRequest.user = user

    return { request: authenticatedRequest, user }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed'

    return {
      request: request as AuthenticatedRequest,
      user: null,
      error: new Response(
        JSON.stringify({
          error: message,
          code: 'AUTH_FAILED',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    }
  }
}

/**
 * Require authentication middleware
 */
export async function requireClerkAuth(
  request: Request,
  env: Env
): Promise<{ user: ClerkUser; error?: Response }> {
  const { user, error } = await authenticateClerk(request, env)

  if (error) {
    return { user: null as any, error }
  }

  if (!user) {
    return {
      user: null as any,
      error: new Response(
        JSON.stringify({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    }
  }

  return { user }
}

// Import for API key verification
async function verifyAPIKey(
  key: string,
  env: Env
): Promise<{ valid: boolean; user_id?: string; plan?: 'free' | 'pro' }> {
  try {
    // Extract prefix for lookup
    const prefix = key.substring(0, 11)

    // Hash the full key for comparison
    const encoder = new TextEncoder()
    const data = encoder.encode(key)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const keyHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

    // Look up API key
    const apiKey = await env.DB.prepare(`
      SELECT ak.user_id, u.plan, ak.expires_at
      FROM api_keys ak
      JOIN users u ON ak.user_id = u.user_id
      WHERE ak.key_prefix = ? AND ak.key_hash = ?
    `)
      .bind(prefix, keyHash)
      .first()

    if (!apiKey) {
      return { valid: false }
    }

    // Check expiration
    if (apiKey.expires_at) {
      const expiresAt = new Date(apiKey.expires_at as string).getTime()
      if (Date.now() > expiresAt) {
        return { valid: false }
      }
    }

    // Update last used timestamp
    await env.DB.prepare(`
      UPDATE api_keys SET last_used_at = datetime('now')
      WHERE key_prefix = ? AND key_hash = ?
    `)
      .bind(prefix, keyHash)
      .run()

    return {
      valid: true,
      user_id: apiKey.user_id as string,
      plan: apiKey.plan as 'free' | 'pro',
    }
  } catch (error) {
    console.error('API key verification error:', error)
    return { valid: false }
  }
}
