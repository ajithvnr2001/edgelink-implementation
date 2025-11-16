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
      case 'subscription.active':
        await handleSubscriptionActive(event, env, subscriptionService);
        break;

      case 'subscription.renewed':
        await handleSubscriptionRenewed(event, env, subscriptionService);
        break;

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event, env, subscriptionService);
        break;

      case 'subscription.expired':
        await handleSubscriptionExpired(event, env, subscriptionService);
        break;

      case 'subscription.failed':
        await handleSubscriptionFailed(event, env, subscriptionService);
        break;

      case 'subscription.on_hold':
        await handleSubscriptionOnHold(event, env, subscriptionService);
        break;

      case 'subscription.plan_changed':
        await handleSubscriptionPlanChanged(event, env, subscriptionService);
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

/**
 * Handle subscription.active - Initial subscription activation
 */
async function handleSubscriptionActive(event: any, env: Env, subscriptionService: SubscriptionService): Promise<void> {
  const subscription = event.data;
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error('[DodoWebhook] No user_id in subscription metadata');
    return;
  }

  // Activate subscription
  await subscriptionService.updateSubscriptionFromWebhook({
    userId,
    subscriptionId: subscription.id,
    customerId: subscription.customer_id,
    plan: 'pro',
    status: 'active',
    currentPeriodStart: subscription.current_period_start,
    currentPeriodEnd: subscription.current_period_end,
    cancelAtPeriodEnd: false
  });

  console.log(`[DodoWebhook] Subscription activated for user ${userId}`);
}

/**
 * Handle subscription.renewed - Subscription renewed (payment succeeded)
 */
async function handleSubscriptionRenewed(event: any, env: Env, subscriptionService: SubscriptionService): Promise<void> {
  const subscription = event.data;
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error('[DodoWebhook] No user_id in subscription metadata');
    return;
  }

  // Update subscription period
  await subscriptionService.updateSubscriptionFromWebhook({
    userId,
    subscriptionId: subscription.id,
    customerId: subscription.customer_id,
    plan: 'pro',
    status: 'active',
    currentPeriodStart: subscription.current_period_start,
    currentPeriodEnd: subscription.current_period_end,
    cancelAtPeriodEnd: false
  });

  // Record payment if available
  if (subscription.latest_payment) {
    await subscriptionService.recordPayment({
      userId,
      paymentId: subscription.latest_payment.id,
      customerId: subscription.customer_id,
      subscriptionId: subscription.id,
      amount: subscription.latest_payment.amount,
      currency: subscription.latest_payment.currency,
      status: 'succeeded',
      plan: 'pro',
      invoiceUrl: subscription.latest_payment.invoice_url,
      receiptUrl: subscription.latest_payment.receipt_url,
      metadata: subscription.metadata
    });
  }

  console.log(`[DodoWebhook] Subscription renewed for user ${userId}`);
}

/**
 * Handle subscription.cancelled - User cancelled subscription
 */
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
    SET subscription_status = 'cancelled',
        subscription_cancel_at_period_end = 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).bind(userId).run();

  console.log(`[DodoWebhook] Subscription cancelled for user ${userId}, active until period end`);
}

/**
 * Handle subscription.expired - Subscription ended/expired
 */
async function handleSubscriptionExpired(event: any, env: Env, subscriptionService: SubscriptionService): Promise<void> {
  const subscription = event.data;
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error('[DodoWebhook] No user_id in subscription metadata');
    return;
  }

  // Downgrade to free plan
  await env.DB.prepare(`
    UPDATE users
    SET subscription_status = 'expired',
        subscription_plan = 'free',
        plan = 'free',
        subscription_id = NULL,
        subscription_current_period_start = NULL,
        subscription_current_period_end = NULL,
        subscription_cancel_at_period_end = 0,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND lifetime_access = 0
  `).bind(userId).run();

  console.log(`[DodoWebhook] Subscription expired for user ${userId}, downgraded to free`);
}

/**
 * Handle subscription.failed - Payment failed
 */
async function handleSubscriptionFailed(event: any, env: Env, subscriptionService: SubscriptionService): Promise<void> {
  const subscription = event.data;
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error('[DodoWebhook] No user_id in subscription metadata');
    return;
  }

  // Mark subscription as failed (grace period before expiration)
  await env.DB.prepare(`
    UPDATE users
    SET subscription_status = 'failed',
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).bind(userId).run();

  console.log(`[DodoWebhook] Subscription payment failed for user ${userId}`);
  // TODO: Send email notification to user about failed payment
}

/**
 * Handle subscription.on_hold - Subscription paused/on hold
 */
async function handleSubscriptionOnHold(event: any, env: Env, subscriptionService: SubscriptionService): Promise<void> {
  const subscription = event.data;
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error('[DodoWebhook] No user_id in subscription metadata');
    return;
  }

  // Mark subscription as on hold
  await env.DB.prepare(`
    UPDATE users
    SET subscription_status = 'on_hold',
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).bind(userId).run();

  console.log(`[DodoWebhook] Subscription on hold for user ${userId}`);
}

/**
 * Handle subscription.plan_changed - Subscription plan changed
 */
async function handleSubscriptionPlanChanged(event: any, env: Env, subscriptionService: SubscriptionService): Promise<void> {
  const subscription = event.data;
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error('[DodoWebhook] No user_id in subscription metadata');
    return;
  }

  // Update subscription with new plan details
  await subscriptionService.updateSubscriptionFromWebhook({
    userId,
    subscriptionId: subscription.id,
    customerId: subscription.customer_id,
    plan: 'pro', // Still pro plan, but might have different billing cycle
    status: subscription.status || 'active',
    currentPeriodStart: subscription.current_period_start,
    currentPeriodEnd: subscription.current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end || false
  });

  console.log(`[DodoWebhook] Subscription plan changed for user ${userId}`);
}
