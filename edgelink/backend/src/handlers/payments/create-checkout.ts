/**
 * Create Checkout Session Handler
 * Handles POST /api/payments/create-checkout
 */

import type { Env } from '../../types';
import { DodoPaymentsService } from '../../services/payments/dodoPaymentsService';

export async function handleCreateCheckout(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    const body = await request.json() as {
      plan: 'pro_monthly' | 'pro_annual' | 'lifetime';
    };

    if (!body.plan || !['pro_monthly', 'pro_annual', 'lifetime'].includes(body.plan)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid plan. Must be pro_monthly, pro_annual, or lifetime',
          code: 'INVALID_PLAN'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user data
    const user = await env.DB.prepare(
      'SELECT user_id, email, customer_id FROM users WHERE user_id = ?'
    ).bind(userId).first();

    if (!user) {
      return new Response(
        JSON.stringify({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize DodoPayments service
    const dodoPayments = new DodoPaymentsService({
      apiKey: env.DODO_API_KEY,
      webhookSecret: env.DODO_WEBHOOK_SECRET,
      baseUrl: env.DODO_BASE_URL || 'https://api.dodopayments.com/v1'
    });

    // Create or get customer
    let customerId = user.customer_id as string | undefined;
    if (!customerId) {
      const customer = await dodoPayments.createCustomer({
        email: user.email as string,
        metadata: { user_id: userId }
      });
      customerId = customer.id;

      // Update user with customer ID
      await env.DB.prepare(
        'UPDATE users SET customer_id = ? WHERE user_id = ?'
      ).bind(customerId, userId).run();
    }

    // Create checkout session
    const frontendUrl = env.FRONTEND_URL || 'https://shortedbro.xyz';
    const session = await dodoPayments.createCheckoutSession({
      customerId,
      customerEmail: user.email as string,
      plan: body.plan,
      successUrl: `${frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${frontendUrl}/pricing`,
      metadata: {
        user_id: userId,
        plan: body.plan
      }
    });

    return new Response(
      JSON.stringify({
        checkout_url: session.url,
        session_id: session.id
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('[CreateCheckout] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create checkout session',
        code: 'CHECKOUT_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
