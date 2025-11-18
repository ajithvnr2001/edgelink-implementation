/**
 * DodoPayments Webhook Handler
 * Handles POST /webhooks/dodopayments
 */

import type { Env } from '../../types';
import { DodoPaymentsService } from '../../services/payments/dodoPaymentsService';
import { SubscriptionService } from '../../services/payments/subscriptionService';

export async function handleDodoPaymentsWebhook(request: Request, env: Env): Promise<Response> {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[DodoWebhook] Received webhook request');

    // Log ALL headers to debug the issue
    console.log('[DodoWebhook] ALL INCOMING HEADERS:');
    for (const [key, value] of request.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // DodoPayments uses Svix for webhook delivery
    // Try different header name variations (Cloudflare may lowercase headers)
    let svixId = request.headers.get('svix-id') ||
                 request.headers.get('Svix-Id') ||
                 request.headers.get('SVIX-ID') ||
                 request.headers.get('webhook-id') ||
                 request.headers.get('x-svix-id');

    let svixTimestamp = request.headers.get('svix-timestamp') ||
                        request.headers.get('Svix-Timestamp') ||
                        request.headers.get('SVIX-TIMESTAMP') ||
                        request.headers.get('webhook-timestamp') ||
                        request.headers.get('x-svix-timestamp');

    let svixSignature = request.headers.get('svix-signature') ||
                        request.headers.get('Svix-Signature') ||
                        request.headers.get('SVIX-SIGNATURE') ||
                        request.headers.get('webhook-signature') ||
                        request.headers.get('x-svix-signature');

    console.log('[DodoWebhook] Extracted headers:');
    console.log('  Svix ID:', svixId);
    console.log('  Svix Timestamp:', svixTimestamp);
    console.log('  Svix Signature present:', !!svixSignature);
    console.log('  Svix Signature (first 50 chars):', svixSignature?.substring(0, 50));

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error('[DodoWebhook] ❌ Missing Svix headers after trying all variations');
      console.error('[DodoWebhook] This suggests Cloudflare may be stripping headers or using different names');
      return new Response(JSON.stringify({
        error: 'Missing Svix headers',
        type: 'DodoWebhook',
        message: 'Missing Svix headers'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const payload = await request.text();
    console.log('[DodoWebhook] Payload length:', payload.length);

    // Verify webhook signature
    // Default to test mode URL - use DODO_BASE_URL env var to override
    const baseUrl = env.DODO_BASE_URL || 'https://test.dodopayments.com';

    const dodoPayments = new DodoPaymentsService({
      apiKey: env.DODO_API_KEY,
      webhookSecret: env.DODO_WEBHOOK_SECRET,
      baseUrl: baseUrl
    });

    const isValid = await dodoPayments.verifySvixWebhookSignature(
      payload,
      svixId,
      svixTimestamp,
      svixSignature
    );

    if (!isValid) {
      console.error('[DodoWebhook] Invalid signature');
      return new Response('Invalid signature', { status: 401 });
    }

    console.log('[DodoWebhook] Signature verified successfully');

    const event = JSON.parse(payload);
    console.log('[DodoWebhook] Event type:', event.type);
    console.log('[DodoWebhook] Event structure:', JSON.stringify({
      id: event.id,
      type: event.type,
      business_id: event.business_id,
      data_keys: Object.keys(event.data || {}),
      data_sample: {
        customer_id: event.data?.customer_id,
        subscription_id: event.data?.subscription_id,
        payment_id: event.data?.payment_id,
        id: event.data?.id
      }
    }));

    // Log webhook event - handle undefined values properly
    const eventId = event.id || event.data?.id || crypto.randomUUID();
    const customerId = event.data?.customer_id || null;
    const subscriptionId = event.data?.subscription_id || event.data?.id || null;
    const paymentId = event.data?.payment_id || event.data?.id || null;

    console.log('[DodoWebhook] Inserting webhook event:', {
      eventId,
      eventType: event.type,
      customerId,
      subscriptionId,
      paymentId
    });

    await env.DB.prepare(`
      INSERT INTO webhook_events (event_id, event_type, customer_id, subscription_id, payment_id, payload, processed)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).bind(
      eventId,
      event.type || 'unknown',
      customerId,
      subscriptionId,
      paymentId,
      payload
    ).run();

    const subscriptionService = new SubscriptionService(env, dodoPayments);

    // Handle different event types
    try {
      switch (event.type) {
        // Payment events
        case 'payment.succeeded':
          await handlePaymentSucceeded(event, env, subscriptionService);
          break;

        case 'payment.failed':
          await handlePaymentFailed(event, env, subscriptionService);
          break;

        case 'payment.processing':
          await handlePaymentProcessing(event, env, subscriptionService);
          break;

        case 'payment.cancelled':
          await handlePaymentCancelled(event, env, subscriptionService);
          break;

        // Subscription events
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

        // Refund events
        case 'refund.succeeded':
          await handleRefundSucceeded(event, env, subscriptionService);
          break;

        case 'refund.failed':
          await handleRefundFailed(event, env, subscriptionService);
          break;

        default:
          console.log(`[DodoWebhook] Unhandled event type: ${event.type}`);
      }

      // Mark as processed
      await env.DB.prepare(
        'UPDATE webhook_events SET processed = 1 WHERE event_id = ?'
      ).bind(eventId).run();

      console.log('[DodoWebhook] Event processed successfully');
    } catch (handlerError) {
      console.error('[DodoWebhook] Error processing event:', handlerError);
      console.error('[DodoWebhook] Event data:', JSON.stringify(event.data, null, 2));
      // Don't mark as processed if handler failed
      throw handlerError;
    }

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

  console.log('[DodoWebhook] handleSubscriptionActive - subscription data:', JSON.stringify(subscription, null, 2));

  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error('[DodoWebhook] No user_id in subscription metadata');
    console.error('[DodoWebhook] Available metadata:', JSON.stringify(subscription.metadata));
    return;
  }

  // Validate required fields
  const subscriptionId = subscription.subscription_id || subscription.id;
  const customerId = subscription.customer?.customer_id || subscription.customer_id;

  if (!subscriptionId) {
    console.error('[DodoWebhook] Missing subscription_id');
    return;
  }

  if (!customerId) {
    console.error('[DodoWebhook] Missing customer_id');
    return;
  }

  // Convert ISO dates to Unix timestamps
  const currentPeriodStart = subscription.previous_billing_date
    ? Math.floor(new Date(subscription.previous_billing_date).getTime() / 1000)
    : subscription.current_period_start || Math.floor(Date.now() / 1000);

  const currentPeriodEnd = subscription.next_billing_date
    ? Math.floor(new Date(subscription.next_billing_date).getTime() / 1000)
    : subscription.current_period_end || Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);

  // Activate subscription
  const updateParams = {
    userId,
    subscriptionId: subscriptionId,
    customerId: customerId,
    plan: 'pro',
    status: 'active',
    currentPeriodStart: currentPeriodStart,
    currentPeriodEnd: currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_next_billing_date || subscription.cancel_at_period_end || false
  };

  console.log('[DodoWebhook] Updating subscription with params:', updateParams);

  await subscriptionService.updateSubscriptionFromWebhook(updateParams);

  console.log(`[DodoWebhook] Subscription activated for user ${userId}`);
}

/**
 * Handle subscription.renewed - Subscription renewed (payment succeeded)
 */
async function handleSubscriptionRenewed(event: any, env: Env, subscriptionService: SubscriptionService): Promise<void> {
  const subscription = event.data;

  console.log('[DodoWebhook] handleSubscriptionRenewed - subscription data:', JSON.stringify(subscription, null, 2));

  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error('[DodoWebhook] No user_id in subscription metadata');
    console.error('[DodoWebhook] Available metadata:', JSON.stringify(subscription.metadata));
    return;
  }

  // Validate required fields
  const subscriptionId = subscription.subscription_id || subscription.id;
  const customerId = subscription.customer?.customer_id || subscription.customer_id;

  if (!subscriptionId) {
    console.error('[DodoWebhook] Missing subscription_id');
    return;
  }

  if (!customerId) {
    console.error('[DodoWebhook] Missing customer_id');
    return;
  }

  // Convert ISO dates to Unix timestamps
  const currentPeriodStart = subscription.previous_billing_date
    ? Math.floor(new Date(subscription.previous_billing_date).getTime() / 1000)
    : subscription.current_period_start || Math.floor(Date.now() / 1000);

  const currentPeriodEnd = subscription.next_billing_date
    ? Math.floor(new Date(subscription.next_billing_date).getTime() / 1000)
    : subscription.current_period_end || Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);

  // Update subscription period
  const updateParams = {
    userId,
    subscriptionId: subscriptionId,
    customerId: customerId,
    plan: 'pro',
    status: 'active',
    currentPeriodStart: currentPeriodStart,
    currentPeriodEnd: currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_next_billing_date || subscription.cancel_at_period_end || false
  };

  console.log('[DodoWebhook] Updating subscription with params:', updateParams);

  await subscriptionService.updateSubscriptionFromWebhook(updateParams);

  // Record payment if available
  if (subscription.latest_payment && subscription.latest_payment.id) {
    const recordParams = {
      userId,
      paymentId: subscription.latest_payment.payment_id || subscription.latest_payment.id,
      customerId: customerId,
      subscriptionId: subscriptionId,
      amount: subscription.latest_payment.amount || 0,
      currency: subscription.latest_payment.currency || 'USD',
      status: 'succeeded',
      plan: 'pro',
      invoiceUrl: subscription.latest_payment.invoice_url || undefined,
      receiptUrl: subscription.latest_payment.receipt_url || undefined,
      metadata: subscription.metadata || {}
    };

    console.log('[DodoWebhook] Recording payment with params:', recordParams);

    await subscriptionService.recordPayment(recordParams);
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

/**
 * Handle payment.succeeded - Payment completed successfully
 */
async function handlePaymentSucceeded(event: any, env: Env, subscriptionService: SubscriptionService): Promise<void> {
  const payment = event.data;

  console.log('[DodoWebhook] handlePaymentSucceeded - payment data:', JSON.stringify(payment, null, 2));

  const userId = payment.metadata?.user_id;

  if (!userId) {
    console.error('[DodoWebhook] No user_id in payment metadata');
    console.error('[DodoWebhook] Available metadata:', JSON.stringify(payment.metadata));
    return;
  }

  // Validate required fields
  const paymentId = payment.payment_id || payment.id;
  const customerId = payment.customer?.customer_id || payment.customer_id;

  if (!paymentId) {
    console.error('[DodoWebhook] Missing payment_id');
    return;
  }

  if (!customerId) {
    console.error('[DodoWebhook] Missing customer_id');
    return;
  }

  // Record successful payment
  const recordParams = {
    userId,
    paymentId: paymentId,
    customerId: customerId,
    subscriptionId: payment.subscription_id || undefined,
    amount: payment.total_amount || payment.settlement_amount || payment.amount || 0,
    currency: payment.currency || 'USD',
    status: payment.status || 'succeeded',
    plan: 'pro',
    invoiceUrl: payment.payment_link || payment.invoice_url || undefined,
    receiptUrl: payment.receipt_url || undefined,
    metadata: payment.metadata || {}
  };

  console.log('[DodoWebhook] Recording payment with params:', recordParams);

  await subscriptionService.recordPayment(recordParams);

  console.log(`[DodoWebhook] Payment succeeded for user ${userId}: ${payment.amount} ${payment.currency}`);
}

/**
 * Handle payment.failed - Payment failed
 */
async function handlePaymentFailed(event: any, env: Env, subscriptionService: SubscriptionService): Promise<void> {
  const payment = event.data;
  const userId = payment.metadata?.user_id;

  if (!userId) {
    console.error('[DodoWebhook] No user_id in payment metadata');
    return;
  }

  // Record failed payment
  await subscriptionService.recordPayment({
    userId,
    paymentId: payment.id,
    customerId: payment.customer_id,
    subscriptionId: payment.subscription_id,
    amount: payment.amount,
    currency: payment.currency,
    status: 'failed',
    plan: 'pro',
    invoiceUrl: payment.invoice_url,
    receiptUrl: payment.receipt_url,
    metadata: payment.metadata
  });

  console.log(`[DodoWebhook] Payment failed for user ${userId}: ${payment.failure_reason || 'Unknown reason'}`);
  // TODO: Send email notification to user about failed payment
}

/**
 * Handle payment.processing - Payment is being processed
 */
async function handlePaymentProcessing(event: any, env: Env, subscriptionService: SubscriptionService): Promise<void> {
  const payment = event.data;
  const userId = payment.metadata?.user_id;

  if (!userId) {
    console.error('[DodoWebhook] No user_id in payment metadata');
    return;
  }

  // Log processing status (optional - you may not want to record this)
  console.log(`[DodoWebhook] Payment processing for user ${userId}: ${payment.amount} ${payment.currency}`);
}

/**
 * Handle payment.cancelled - Payment was cancelled
 */
async function handlePaymentCancelled(event: any, env: Env, subscriptionService: SubscriptionService): Promise<void> {
  const payment = event.data;
  const userId = payment.metadata?.user_id;

  if (!userId) {
    console.error('[DodoWebhook] No user_id in payment metadata');
    return;
  }

  // Record cancelled payment
  await subscriptionService.recordPayment({
    userId,
    paymentId: payment.id,
    customerId: payment.customer_id,
    subscriptionId: payment.subscription_id,
    amount: payment.amount,
    currency: payment.currency,
    status: 'cancelled',
    plan: 'pro',
    invoiceUrl: payment.invoice_url,
    receiptUrl: payment.receipt_url,
    metadata: payment.metadata
  });

  console.log(`[DodoWebhook] Payment cancelled for user ${userId}`);
}

/**
 * Handle refund.succeeded - Refund completed successfully
 */
async function handleRefundSucceeded(event: any, env: Env, subscriptionService: SubscriptionService): Promise<void> {
  const refund = event.data;
  const paymentId = refund.payment_id;

  // Get the original payment to find user_id
  const payment = await env.DB.prepare(
    'SELECT user_id FROM payments WHERE payment_id = ?'
  ).bind(paymentId).first();

  if (!payment) {
    console.error('[DodoWebhook] Original payment not found for refund');
    return;
  }

  // Record refund in payments table with negative amount or separate refunds table
  await subscriptionService.recordPayment({
    userId: payment.user_id as string,
    paymentId: refund.id,
    customerId: refund.customer_id,
    subscriptionId: null,
    amount: -Math.abs(refund.amount), // Negative amount for refund
    currency: refund.currency,
    status: 'refunded',
    plan: 'pro',
    invoiceUrl: null,
    receiptUrl: null,
    metadata: { refund_reason: refund.reason, original_payment_id: paymentId }
  });

  console.log(`[DodoWebhook] Refund succeeded for payment ${paymentId}: ${refund.amount} ${refund.currency}`);
  // TODO: Send email notification to user about successful refund
}

/**
 * Handle refund.failed - Refund failed
 */
async function handleRefundFailed(event: any, env: Env, subscriptionService: SubscriptionService): Promise<void> {
  const refund = event.data;

  console.error(`[DodoWebhook] Refund failed for payment ${refund.payment_id}: ${refund.failure_reason || 'Unknown reason'}`);
  // TODO: Log this for manual review or send notification to admin
}
