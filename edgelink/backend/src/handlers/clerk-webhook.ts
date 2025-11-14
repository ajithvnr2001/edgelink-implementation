/**
 * Clerk Webhook Handler
 * Syncs user events from Clerk to the database
 */

import type { Env } from '../types'
import { Webhook } from 'svix'

export async function handleClerkWebhook(request: Request, env: Env): Promise<Response> {
  try {
    // Get webhook secret from environment
    const webhookSecret = env.CLERK_WEBHOOK_SECRET

    if (!webhookSecret) {
      console.error('CLERK_WEBHOOK_SECRET not configured')
      return new Response('Webhook secret not configured', { status: 500 })
    }

    // Get headers for verification
    const svix_id = request.headers.get('svix-id')
    const svix_timestamp = request.headers.get('svix-timestamp')
    const svix_signature = request.headers.get('svix-signature')

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response('Missing svix headers', { status: 400 })
    }

    // Get the raw body
    const payload = await request.text()

    // Create Svix instance
    const wh = new Webhook(webhookSecret)

    let event: any

    try {
      event = wh.verify(payload, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      })
    } catch (error) {
      console.error('Webhook verification failed:', error)
      return new Response('Webhook verification failed', { status: 400 })
    }

    // Handle different event types
    const eventType = event.type

    switch (eventType) {
      case 'user.created':
        await handleUserCreated(event.data, env)
        break

      case 'user.updated':
        await handleUserUpdated(event.data, env)
        break

      case 'user.deleted':
        await handleUserDeleted(event.data, env)
        break

      default:
        console.log(`Unhandled event type: ${eventType}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return new Response(
      JSON.stringify({
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

async function handleUserCreated(data: any, env: Env) {
  const clerkUserId = data.id
  const email = data.email_addresses?.[0]?.email_address || ''
  const firstName = data.first_name || data.username || null

  // Check if user already exists by clerk_user_id
  const existingUserByClerkId = await env.DB.prepare(`
    SELECT user_id FROM users WHERE clerk_user_id = ?
  `)
    .bind(clerkUserId)
    .first()

  if (existingUserByClerkId) {
    console.log(`User with Clerk ID ${clerkUserId} already exists`)
    return
  }

  // Check if user exists by email (legacy user or partial creation)
  const existingUserByEmail = await env.DB.prepare(`
    SELECT user_id, clerk_user_id FROM users WHERE email = ?
  `)
    .bind(email)
    .first<{ user_id: string; clerk_user_id: string | null }>()

  if (existingUserByEmail) {
    // User exists with this email - link them to Clerk
    await env.DB.prepare(`
      UPDATE users
      SET clerk_user_id = ?,
          name = COALESCE(?, name),
          email_verified = TRUE,
          updated_at = datetime('now')
      WHERE user_id = ?
    `)
      .bind(clerkUserId, firstName, existingUserByEmail.user_id)
      .run()

    console.log(`Linked existing user ${existingUserByEmail.user_id} to Clerk user ${clerkUserId}`)
    return
  }

  // Create new user
  const userId = `usr_${crypto.randomUUID()}`

  await env.DB.prepare(`
    INSERT INTO users (
      user_id, clerk_user_id, email, name, plan,
      email_verified, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, 'free', TRUE, datetime('now'), datetime('now'))
  `)
    .bind(userId, clerkUserId, email, firstName)
    .run()

  console.log(`Created user ${userId} for Clerk user ${clerkUserId}`)
}

async function handleUserUpdated(data: any, env: Env) {
  const clerkUserId = data.id
  const email = data.email_addresses?.[0]?.email_address || ''
  const firstName = data.first_name || data.username || null

  // Update user
  await env.DB.prepare(`
    UPDATE users
    SET email = ?, name = ?, updated_at = datetime('now')
    WHERE clerk_user_id = ?
  `)
    .bind(email, firstName, clerkUserId)
    .run()

  console.log(`Updated user with Clerk ID ${clerkUserId}`)
}

async function handleUserDeleted(data: any, env: Env) {
  const clerkUserId = data.id

  // Delete user (CASCADE will handle related records)
  await env.DB.prepare(`
    DELETE FROM users WHERE clerk_user_id = ?
  `)
    .bind(clerkUserId)
    .run()

  console.log(`Deleted user with Clerk ID ${clerkUserId}`)
}
