/**
 * Get Subscription Status Handler
 * Handles GET /api/payments/subscription-status
 */

import type { Env } from '../../types';
import { SubscriptionService } from '../../services/payments/subscriptionService';
import { DodoPaymentsService } from '../../services/payments/dodoPaymentsService';

export async function handleGetSubscriptionStatus(env: Env, userId: string): Promise<Response> {
  try {
    // Default to test mode URL - use DODO_BASE_URL secret to override
    const baseUrl = env.DODO_BASE_URL || 'https://test.dodopayments.com';

    const dodoPayments = new DodoPaymentsService({
      apiKey: env.DODO_API_KEY,
      webhookSecret: env.DODO_WEBHOOK_SECRET,
      baseUrl: baseUrl
    });

    const subscriptionService = new SubscriptionService(env, dodoPayments);
    const status = await subscriptionService.getUserSubscriptionStatus(userId);

    return new Response(
      JSON.stringify(status),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('[SubscriptionStatus] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to get subscription status',
        code: 'SUBSCRIPTION_STATUS_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
