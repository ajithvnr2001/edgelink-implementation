/**
 * Customer Portal Handler
 * Handles POST /api/payments/customer-portal
 */

import type { Env } from '../../types';
import { DodoPaymentsService } from '../../services/payments/dodoPaymentsService';

export async function handleCreateCustomerPortal(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    // Get user's customer ID
    const user = await env.DB.prepare(
      'SELECT customer_id FROM users WHERE user_id = ?'
    ).bind(userId).first();

    if (!user || !user.customer_id) {
      return new Response(
        JSON.stringify({
          error: 'No active subscription found',
          code: 'NO_SUBSCRIPTION'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Default to test mode URL - use DODO_BASE_URL secret to override
    const baseUrl = env.DODO_BASE_URL || 'https://test.dodopayments.com';

    const dodoPayments = new DodoPaymentsService({
      apiKey: env.DODO_API_KEY,
      webhookSecret: env.DODO_WEBHOOK_SECRET,
      baseUrl: baseUrl
    });

    const frontendUrl = env.FRONTEND_URL || 'https://shortedbro.xyz';
    const portal = await dodoPayments.createCustomerPortalSession({
      customerId: user.customer_id as string,
      returnUrl: `${frontendUrl}/billing`
    });

    return new Response(
      JSON.stringify({
        portal_url: portal.url
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('[CustomerPortal] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create customer portal session',
        code: 'PORTAL_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
