/**
 * Webhook Management Handlers - Week 4
 * Allow users to configure webhook notifications for link events
 */

import type { Env } from '../types';
import { generateId } from '../utils/slug';

export interface WebhookEvent {
  event: 'link.created' | 'link.clicked' | 'link.milestone' | 'link.expired';
  slug: string;
  clicks?: number;
  timestamp: number;
  user_id: string;
}

/**
 * Handle POST /api/webhooks - Create a new webhook
 */
export async function handleCreateWebhook(
  request: Request,
  env: Env,
  userId: string,
  userPlan: string
): Promise<Response> {
  // Check Pro plan
  if (userPlan !== 'pro') {
    return new Response(
      JSON.stringify({
        error: 'Webhooks are a Pro feature',
        code: 'PRO_FEATURE_REQUIRED'
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const body = await request.json() as {
      url: string;
      name: string;
      events: string[];
      slug?: string; // Optional: specific link, or all links if not provided
    };

    if (!body.url || !body.name || !body.events || body.events.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Webhook URL, name, and events are required',
          code: 'INVALID_INPUT'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate webhook URL
    try {
      new URL(body.url);
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Invalid webhook URL',
          code: 'INVALID_URL'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check webhook limit (5 per user)
    const existingWebhooks = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM webhooks WHERE user_id = ?
    `).bind(userId).first();

    if (existingWebhooks && existingWebhooks.count >= 5) {
      return new Response(
        JSON.stringify({
          error: 'Maximum 5 webhooks per user',
          code: 'WEBHOOK_LIMIT_EXCEEDED'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create webhook
    const webhookId = `wh_${generateId(16)}`;
    const secret = `whsec_${generateId(32)}`;

    await env.DB.prepare(`
      INSERT INTO webhooks (
        webhook_id,
        user_id,
        url,
        name,
        events,
        secret,
        slug,
        active,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
    `).bind(
      webhookId,
      userId,
      body.url,
      body.name,
      JSON.stringify(body.events),
      secret,
      body.slug || null
    ).run();

    return new Response(
      JSON.stringify({
        webhook_id: webhookId,
        url: body.url,
        name: body.name,
        events: body.events,
        slug: body.slug || null,
        secret,
        active: true,
        message: 'Webhook created successfully. Save the secret for signature verification.'
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Failed to create webhook:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to create webhook',
        code: 'WEBHOOK_CREATE_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle GET /api/webhooks - Get user's webhooks
 */
export async function handleGetWebhooks(env: Env, userId: string): Promise<Response> {
  try {
    const result = await env.DB.prepare(`
      SELECT
        webhook_id,
        url,
        name,
        events,
        slug,
        active,
        last_triggered_at,
        created_at
      FROM webhooks
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all();

    const webhooks = result.results.map((webhook: any) => ({
      ...webhook,
      events: JSON.parse(webhook.events)
    }));

    return new Response(
      JSON.stringify({
        webhooks,
        total: webhooks.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Failed to fetch webhooks:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch webhooks',
        code: 'WEBHOOK_FETCH_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle DELETE /api/webhooks/:webhookId - Delete webhook
 */
export async function handleDeleteWebhook(
  env: Env,
  userId: string,
  webhookId: string
): Promise<Response> {
  try {
    // Verify ownership
    const webhook = await env.DB.prepare(`
      SELECT user_id FROM webhooks WHERE webhook_id = ?
    `).bind(webhookId).first();

    if (!webhook || webhook.user_id !== userId) {
      return new Response(
        JSON.stringify({
          error: 'Webhook not found or access denied',
          code: 'NOT_FOUND'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Delete webhook
    await env.DB.prepare(`
      DELETE FROM webhooks WHERE webhook_id = ? AND user_id = ?
    `).bind(webhookId, userId).run();

    return new Response(
      JSON.stringify({
        message: 'Webhook deleted successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Failed to delete webhook:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to delete webhook',
        code: 'WEBHOOK_DELETE_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Trigger webhook notification
 * Called internally when events occur
 */
export async function triggerWebhook(
  env: Env,
  event: WebhookEvent
): Promise<void> {
  try {
    // Find webhooks that should be triggered
    const webhooks = await env.DB.prepare(`
      SELECT webhook_id, url, events, secret, user_id
      FROM webhooks
      WHERE active = 1
        AND user_id = ?
        AND (slug IS NULL OR slug = ?)
    `).bind(event.user_id, event.slug).all();

    for (const webhook of webhooks.results) {
      const events = JSON.parse(webhook.events as string);

      // Check if this webhook listens to this event
      if (!events.includes(event.event)) {
        continue;
      }

      // Trigger webhook (with retry logic)
      await sendWebhookRequest(
        webhook.url as string,
        event,
        webhook.secret as string,
        env,
        webhook.webhook_id as string
      );
    }
  } catch (error) {
    console.error('Failed to trigger webhooks:', error);
  }
}

/**
 * Send webhook HTTP request with signature
 */
async function sendWebhookRequest(
  url: string,
  payload: WebhookEvent,
  secret: string,
  env: Env,
  webhookId: string
): Promise<void> {
  try {
    const body = JSON.stringify(payload);

    // Generate HMAC signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body)
    );

    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Send POST request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-EdgeLink-Signature': signatureHex,
        'X-EdgeLink-Event': payload.event,
        'User-Agent': 'EdgeLink-Webhooks/1.0'
      },
      body
    });

    // Update last triggered timestamp
    await env.DB.prepare(`
      UPDATE webhooks
      SET last_triggered_at = datetime('now')
      WHERE webhook_id = ?
    `).bind(webhookId).run();

    if (!response.ok) {
      console.error(`Webhook ${webhookId} failed: ${response.status}`);
    }
  } catch (error) {
    console.error(`Failed to send webhook ${webhookId}:`, error);
  }
}
