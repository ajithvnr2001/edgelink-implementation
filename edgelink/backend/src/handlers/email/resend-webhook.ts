/**
 * Resend Webhook Handler
 * Handles POST /webhooks/resend
 * Processes email delivery status events from Resend
 */

import type { Env } from '../../types';

export async function handleResendWebhook(request: Request, env: Env): Promise<Response> {
  try {
    // Get webhook signature for verification
    const signature = request.headers.get('svix-signature') ||
                     request.headers.get('webhook-signature') || '';
    const timestamp = request.headers.get('svix-timestamp') || '';
    const svixId = request.headers.get('svix-id') || '';

    const payload = await request.text();

    // Verify webhook signature (Resend uses Svix for webhooks)
    // Note: Signature verification is important for production
    // For now, we'll log if signature is missing but still process
    if (!signature) {
      console.warn('[ResendWebhook] No signature found, processing anyway');
    }

    const event = JSON.parse(payload);

    // Log the webhook event for debugging
    console.log(`[ResendWebhook] Received event: ${event.type}`, {
      type: event.type,
      email_id: event.data?.email_id,
      to: event.data?.to,
      subject: event.data?.subject
    });

    // Handle different event types
    switch (event.type) {
      case 'email.sent':
        await handleEmailSent(event, env);
        break;

      case 'email.delivered':
        await handleEmailDelivered(event, env);
        break;

      case 'email.delivery_delayed':
        await handleEmailDelayedDelivery(event, env);
        break;

      case 'email.bounced':
        await handleEmailBounced(event, env);
        break;

      case 'email.complained':
        await handleEmailComplained(event, env);
        break;

      case 'email.opened':
      case 'email.clicked':
        // Optional: Track engagement metrics
        console.log(`[ResendWebhook] Email engagement: ${event.type}`);
        break;

      default:
        console.log(`[ResendWebhook] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('[ResendWebhook] Error:', error);
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle email.sent - Email was successfully sent to mail server
 */
async function handleEmailSent(event: any, env: Env): Promise<void> {
  const data = event.data;
  const messageId = data.email_id;

  if (!messageId) {
    console.error('[ResendWebhook] No email_id in event data');
    return;
  }

  // Update email log status to 'sent'
  const result = await env.DB.prepare(`
    UPDATE email_logs
    SET status = 'sent'
    WHERE provider_message_id = ?
  `).bind(messageId).run();

  console.log(`[ResendWebhook] Email sent: ${messageId}`, {
    updated: result.meta.changes
  });
}

/**
 * Handle email.delivered - Email was successfully delivered to recipient
 */
async function handleEmailDelivered(event: any, env: Env): Promise<void> {
  const data = event.data;
  const messageId = data.email_id;

  if (!messageId) {
    console.error('[ResendWebhook] No email_id in event data');
    return;
  }

  // Update email log status to 'delivered'
  const result = await env.DB.prepare(`
    UPDATE email_logs
    SET status = 'delivered'
    WHERE provider_message_id = ?
  `).bind(messageId).run();

  console.log(`[ResendWebhook] Email delivered: ${messageId}`, {
    to: data.to,
    updated: result.meta.changes
  });
}

/**
 * Handle email.delivery_delayed - Email delivery was delayed
 */
async function handleEmailDelayedDelivery(event: any, env: Env): Promise<void> {
  const data = event.data;
  const messageId = data.email_id;

  if (!messageId) {
    console.error('[ResendWebhook] No email_id in event data');
    return;
  }

  // Update email log status to 'delayed'
  const result = await env.DB.prepare(`
    UPDATE email_logs
    SET status = 'delayed',
        error_message = ?
    WHERE provider_message_id = ?
  `).bind(
    data.reason || 'Delivery delayed by recipient server',
    messageId
  ).run();

  console.log(`[ResendWebhook] Email delayed: ${messageId}`, {
    to: data.to,
    reason: data.reason,
    updated: result.meta.changes
  });
}

/**
 * Handle email.bounced - Email bounced (hard or soft bounce)
 */
async function handleEmailBounced(event: any, env: Env): Promise<void> {
  const data = event.data;
  const messageId = data.email_id;
  const bounceType = data.bounce_type || 'unknown'; // 'hard' or 'soft'
  const reason = data.reason || 'Unknown bounce reason';

  if (!messageId) {
    console.error('[ResendWebhook] No email_id in event data');
    return;
  }

  // Update email log status to 'bounced'
  const result = await env.DB.prepare(`
    UPDATE email_logs
    SET status = 'bounced',
        error_message = ?
    WHERE provider_message_id = ?
  `).bind(
    `${bounceType} bounce: ${reason}`,
    messageId
  ).run();

  console.log(`[ResendWebhook] Email bounced: ${messageId}`, {
    to: data.to,
    bounce_type: bounceType,
    reason: reason,
    updated: result.meta.changes
  });

  // For hard bounces, consider marking the email as invalid
  if (bounceType === 'hard') {
    // TODO: Implement email validation flag in users table
    // This would prevent sending future emails to invalid addresses
    console.warn(`[ResendWebhook] Hard bounce for ${data.to} - consider blocking future emails`);
  }
}

/**
 * Handle email.complained - Recipient marked email as spam
 */
async function handleEmailComplained(event: any, env: Env): Promise<void> {
  const data = event.data;
  const messageId = data.email_id;

  if (!messageId) {
    console.error('[ResendWebhook] No email_id in event data');
    return;
  }

  // Update email log status to 'complained'
  const result = await env.DB.prepare(`
    UPDATE email_logs
    SET status = 'complained',
        error_message = 'Recipient marked as spam'
    WHERE provider_message_id = ?
  `).bind(messageId).run();

  console.log(`[ResendWebhook] Spam complaint: ${messageId}`, {
    to: data.to,
    updated: result.meta.changes
  });

  // TODO: Implement unsubscribe mechanism
  // When user marks as spam, we should stop sending them emails
  console.warn(`[ResendWebhook] Spam complaint from ${data.to} - consider auto-unsubscribing`);
}
