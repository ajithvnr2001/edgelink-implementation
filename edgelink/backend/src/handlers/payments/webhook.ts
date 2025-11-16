/**
 * DodoPayments Webhook Handler
 * Handles POST /webhooks/dodopayments
 */

import type { Env } from '../../types';
import { DodoPaymentsService } from '../../services/payments/dodoPaymentsService';
import { SubscriptionService } from '../../services/payments/subscriptionService';

export async function handleDodoPaymentsWebhook(request: Request, env: Env): Promise<Response> {
  try {
    const signature = request.headers.get('x-dodo-signature') || '';
    const payload = await request.text();

    // Verify webhook signature
    const dodoPayments = new DodoPaymentsService({
      apiKey: env.DODO_API_KEY,
      webhookSecret: env.DODO_WEBHOOK_SECRET,
      baseUrl: env.DODO_BASE_URL || 'https://api.dodopayments.com/v1'
    });

    const isValid = await dodoPayments.verifyWebhookSignature(payload, signature);
    if (!isValid) {
      console.error('[DodoWebhook] Invalid signature');
      return new Response('Invalid signature', { status: 401 });
    }

    const event = JSON.parse(payload);

    // Log webhook event
    await env.DB.prepare(`
      INSERT INTO webhook_events (event_id, event_type, customer_id, subscription_id, payment_id, payload, processed)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).bind(
      event.id || crypto.randomUUID(),
      event.type,
      event.data?.customer_id || null,
      event.data?.subscription_id || null,
      event.data?.payment_id || null,
      payload
    ).run();

    const subscriptionService = new SubscriptionService(env, dodoPayments);

    // Handle different event types
    switch (event.type) {
      case 'payment.succeeded':
        await handlePaymentSucceeded(event, env, subscriptionService);
        break;

      case 'subscription.created':
      case 'subscription.updated':
        await handleSubscriptionUpdated(event, env, subscriptionService);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event, env, subscriptionService);
        break;

      case 'subscription.deleted':
        await handleSubscriptionDeleted(event, env, subscriptionService);
        break;

      default:
        console.log(`[DodoWebhook] Unhandled event type: ${event.type}`);
    }

    // Mark as processed
    await env.DB.prepare(
      'UPDATE webhook_events SET processed = 1 WHERE event_id = ?'
    ).bind(event.id).run();

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[DodoWebhook] Error:', error);
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handlePaymentSucceeded(event: any, env: Env, subscriptionService: SubscriptionService): Promise<void> {
  const payment = event.data;
  const userId = payment.metadata?.user_id;

  if (!userId) {
    console.error('[DodoWebhook] No user_id in payment metadata');
    return;
  }

  // Record payment
  await subscriptionService.recordPayment({
    userId,
    paymentId: payment.id,
    customerId: payment.customer_id,
    subscriptionId: payment.subscription_id,
    amount: payment.amount,
    currency: payment.currency,
    status: 'succeeded',
    plan: payment.metadata?.plan || 'pro',
    invoiceUrl: payment.invoice_url,
    receiptUrl: payment.receipt_url,
    metadata: payment.metadata
  });
}

async function handleSubscriptionUpdated(event: any, env: Env, subscriptionService: SubscriptionService): Promise<void> {
  const subscription = event.data;
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error('[DodoWebhook] No user_id in subscription metadata');
    return;
  }

  await subscriptionService.updateSubscriptionFromWebhook({
    userId,
    subscriptionId: subscription.id,
    customerId: subscription.customer_id,
    plan: subscription.plan || 'pro',
    status: subscription.status,
    currentPeriodStart: subscription.current_period_start,
    currentPeriodEnd: subscription.current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end || false
  });
}

async function handleSubscriptionCancelled(event: any, env: Env, subscriptionService: SubscriptionService): Promise<void> {
  const subscription = event.data;
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error('[DodoWebhook] No user_id in subscription metadata');
    return;
  }

  // Mark as cancelled but keep active until period end
  await env.DB.prepare(`
    UPDATE users
    SET subscription_cancel_at_period_end = 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).bind(userId).run();
}

async function handleSubscriptionDeleted(event: any, env: Env, subscriptionService: SubscriptionService): Promise<void> {
  const subscription = event.data;
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error('[DodoWebhook] No user_id in subscription metadata');
    return;
  }

  // Downgrade to free plan
  await env.DB.prepare(`
    UPDATE users
    SET subscription_status = 'free',
        subscription_plan = 'free',
        subscription_id = NULL,
        subscription_current_period_start = NULL,
        subscription_current_period_end = NULL,
        subscription_cancel_at_period_end = 0,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND lifetime_access = 0
  `).bind(userId).run();
}
