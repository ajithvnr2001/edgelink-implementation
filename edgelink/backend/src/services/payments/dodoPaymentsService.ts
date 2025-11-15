/**
 * DodoPayments Service - Payment Processing Integration
 * Handles subscription billing, one-time payments, and customer management
 */

import type { Env } from '../../types';

export interface DodoPaymentsConfig {
  apiKey: string;
  webhookSecret: string;
  baseUrl: string;
}

export interface CheckoutSession {
  id: string;
  url: string;
  customer_id: string;
}

export interface Customer {
  id: string;
  email: string;
  name?: string;
}

export interface Subscription {
  id: string;
  customer_id: string;
  plan: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
}

export class DodoPaymentsService {
  private apiKey: string;
  private webhookSecret: string;
  private baseUrl: string;

  constructor(config: DodoPaymentsConfig) {
    this.apiKey = config.apiKey;
    this.webhookSecret = config.webhookSecret;
    this.baseUrl = config.baseUrl;
  }

  /**
   * Create a checkout session for subscription or one-time payment
   */
  async createCheckoutSession(params: {
    customerId?: string;
    customerEmail: string;
    plan: 'pro_monthly' | 'pro_annual' | 'lifetime';
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<CheckoutSession> {
    const response = await fetch(`${this.baseUrl}/checkout/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_id: params.customerId,
        customer_email: params.customerEmail,
        line_items: [{
          price: this.getPriceId(params.plan),
          quantity: 1
        }],
        mode: params.plan === 'lifetime' ? 'payment' : 'subscription',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: params.metadata || {}
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`DodoPayments API error: ${error.message}`);
    }

    return await response.json();
  }

  /**
   * Create a customer in DodoPayments
   */
  async createCustomer(params: {
    email: string;
    name?: string;
    metadata?: Record<string, string>;
  }): Promise<Customer> {
    const response = await fetch(`${this.baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: params.email,
        name: params.name,
        metadata: params.metadata || {}
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`DodoPayments API error: ${error.message}`);
    }

    return await response.json();
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<Subscription> {
    const response = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`DodoPayments API error: ${error.message}`);
    }

    return await response.json();
  }

  /**
   * Cancel a subscription (at end of billing period)
   */
  async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    const response = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`DodoPayments API error: ${error.message}`);
    }

    return await response.json();
  }

  /**
   * Create customer portal session
   */
  async createCustomerPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    const response = await fetch(`${this.baseUrl}/customer-portal/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_id: params.customerId,
        return_url: params.returnUrl
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`DodoPayments API error: ${error.message}`);
    }

    return await response.json();
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );

    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return signature === expectedSignature;
  }

  /**
   * Map plan to DodoPayments price ID
   */
  private getPriceId(plan: string): string {
    // These would be set in environment variables
    const priceIds: Record<string, string> = {
      'pro_monthly': process.env.DODO_PRICE_PRO_MONTHLY || 'price_monthly_xxx',
      'pro_annual': process.env.DODO_PRICE_PRO_ANNUAL || 'price_annual_xxx',
      'lifetime': process.env.DODO_PRICE_LIFETIME || 'price_lifetime_xxx'
    };

    return priceIds[plan] || priceIds['pro_monthly'];
  }
}
