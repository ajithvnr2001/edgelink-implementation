/**
 * Create Checkout Session Handler
 * Handles POST /api/payments/create-checkout
 */

import type { Env } from '../../types';
import { DodoPaymentsService } from '../../services/payments/dodoPaymentsService';

export async function handleCreateCheckout(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    const body = await request.json() as {
      plan?: 'pro';
    };

    // Default to 'pro' if not specified
    const plan = body.plan || 'pro';

    if (plan !== 'pro') {
      return new Response(
        JSON.stringify({
          error: 'Invalid plan. Must be pro',
          code: 'INVALID_PLAN'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate all required DodoPayments credentials
    const missingCredentials = [];
    if (!env.DODO_API_KEY) missingCredentials.push('DODO_API_KEY');
    if (!env.DODO_WEBHOOK_SECRET) missingCredentials.push('DODO_WEBHOOK_SECRET');
    if (!env.DODO_PRODUCT_ID) missingCredentials.push('DODO_PRODUCT_ID');

    if (missingCredentials.length > 0) {
      console.error('[CreateCheckout] Missing credentials:', missingCredentials.join(', '));
      return new Response(
        JSON.stringify({
          error: `Payment system not configured. Missing: ${missingCredentials.join(', ')}`,
          code: 'PAYMENT_NOT_CONFIGURED',
          missing_credentials: missingCredentials
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user data
    const user = await env.DB.prepare(
      'SELECT user_id, email, name, customer_id FROM users WHERE user_id = ?'
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
    // Default to test mode URL - use DODO_BASE_URL secret to override
    const baseUrl = env.DODO_BASE_URL || 'https://test.dodopayments.com';
    console.log('[CreateCheckout] Using DodoPayments base URL:', baseUrl);
    console.log('[CreateCheckout] Product ID:', env.DODO_PRODUCT_ID);

    const dodoPayments = new DodoPaymentsService({
      apiKey: env.DODO_API_KEY,
      webhookSecret: env.DODO_WEBHOOK_SECRET,
      baseUrl: baseUrl
    });

    // Create or get customer
    let customerId = user.customer_id as string | undefined;
    if (!customerId) {
      // Generate name from email if user doesn't have one
      const customerName = (user.name as string) || (user.email as string).split('@')[0];

      const customer = await dodoPayments.createCustomer({
        email: user.email as string,
        name: customerName,
        metadata: { user_id: userId }
      });

      // DodoPayments may return either 'customer_id' or 'id'
      customerId = (customer as any).customer_id || (customer as any).id;

      if (!customerId) {
        console.error('[CreateCheckout] Customer creation succeeded but no customer ID in response:', customer);
        throw new Error('Failed to get customer ID from DodoPayments response');
      }

      console.log('[CreateCheckout] Extracted customer ID:', customerId);

      // Update user with customer ID
      await env.DB.prepare(
        'UPDATE users SET customer_id = ? WHERE user_id = ?'
      ).bind(customerId, userId).run();

      console.log('[CreateCheckout] Updated user with customer ID');
    }

    // Create checkout session
    const frontendUrl = env.FRONTEND_URL || 'https://shortedbro.xyz';
    const session = await dodoPayments.createCheckoutSession({
      customerId,
      customerEmail: user.email as string,
      productId: env.DODO_PRODUCT_ID,
      successUrl: `${frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${frontendUrl}/pricing`,
      metadata: {
        user_id: userId,
        plan: 'pro'
      }
    });

    // DodoPayments may return 'checkout_url' or 'url', and 'session_id' or 'id'
    const checkoutUrl = (session as any).checkout_url || (session as any).url;
    const sessionId = (session as any).session_id || (session as any).id;

    console.log('[CreateCheckout] Checkout URL:', checkoutUrl);
    console.log('[CreateCheckout] Session ID:', sessionId);

    if (!checkoutUrl) {
      console.error('[CreateCheckout] No checkout URL in response:', session);
      throw new Error('Failed to get checkout URL from DodoPayments response');
    }

    return new Response(
      JSON.stringify({
        checkout_url: checkoutUrl,
        session_id: sessionId
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('[CreateCheckout] Error:', error);
    console.error('[CreateCheckout] Error stack:', error.stack);

    // Provide more specific error information
    let errorMessage = error.message || 'Failed to create checkout session';
    let errorCode = 'CHECKOUT_FAILED';
    let errorDetails: any = {};

    // Check if this is a DodoPayments API error
    if (errorMessage.includes('DodoPayments API error')) {
      errorCode = 'DODOPAYMENTS_API_ERROR';
      errorDetails.api_error = errorMessage;
    }
    // Check if this is a database error
    else if (errorMessage.includes('D1')) {
      errorCode = 'DATABASE_ERROR';
      errorDetails.db_error = errorMessage;
    }
    // Check if this is a network error
    else if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
      errorCode = 'NETWORK_ERROR';
      errorDetails.network_error = errorMessage;
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        code: errorCode,
        details: errorDetails,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
