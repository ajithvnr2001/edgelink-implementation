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
   * Create a checkout session for subscription
   */
  async createCheckoutSession(params: {
    customerId?: string;
    customerEmail: string;
    productId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<CheckoutSession> {
    const url = `${this.baseUrl}/checkout/sessions`;
    console.log('[DodoPayments] Creating checkout session at:', url);
    console.log('[DodoPayments] Product ID:', params.productId);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_id: params.customerId,
        customer_email: params.customerEmail,
        line_items: [{
          product_id: params.productId,
          quantity: 1
        }],
        mode: 'subscription',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: params.metadata || {}
      })
    });

    console.log('[DodoPayments] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      console.log('[DodoPayments] Error response content-type:', contentType);

      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        if (contentType?.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.message || error.error || JSON.stringify(error);
          console.log('[DodoPayments] API error:', error);
        } else {
          const text = await response.text();
          errorMessage = text.substring(0, 200); // First 200 chars
          console.log('[DodoPayments] Non-JSON error:', text);
        }
      } catch (parseError) {
        console.error('[DodoPayments] Failed to parse error response:', parseError);
      }

      throw new Error(`DodoPayments API error: ${errorMessage}. URL: ${url}`);
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

}
