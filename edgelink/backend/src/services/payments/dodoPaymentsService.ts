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

    // Log configuration (without exposing full API key)
    console.log('[DodoPayments] Service initialized');
    console.log('[DodoPayments] Base URL:', this.baseUrl);
    console.log('[DodoPayments] API Key present:', !!this.apiKey);
    console.log('[DodoPayments] API Key prefix:', this.apiKey?.substring(0, 12) + '...');
    console.log('[DodoPayments] Webhook Secret present:', !!this.webhookSecret);
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(params: {
    customerId?: string;
    customerEmail: string;
    customerName?: string;
    productId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<CheckoutSession> {
    const url = `${this.baseUrl}/checkouts`;
    console.log('[DodoPayments] Creating checkout session at:', url);
    console.log('[DodoPayments] Product ID:', params.productId);

    const requestBody = {
      customer_id: params.customerId,
      customer_email: params.customerEmail,
      customer_name: params.customerName || params.customerEmail.split('@')[0],
      product_cart: [{
        product_id: params.productId,
        quantity: 1
      }],
      success_url: params.successUrl,
      failure_url: params.cancelUrl,
      metadata: params.metadata || {}
    };

    console.log('[DodoPayments] Request body:', JSON.stringify(requestBody));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
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

    const checkoutSession = await response.json();
    console.log('[DodoPayments] Checkout session created successfully:', JSON.stringify(checkoutSession));
    console.log('[DodoPayments] Checkout URL:', checkoutSession.checkout_url || checkoutSession.url);
    console.log('[DodoPayments] Session ID:', checkoutSession.session_id || checkoutSession.id);

    return checkoutSession;
  }

  /**
   * Create a customer in DodoPayments
   */
  async createCustomer(params: {
    email: string;
    name: string; // Required by DodoPayments API
    metadata?: Record<string, string>;
  }): Promise<Customer> {
    const url = `${this.baseUrl}/customers`;
    console.log('[DodoPayments] Creating customer at:', url);
    console.log('[DodoPayments] Customer email:', params.email);
    console.log('[DodoPayments] Customer name:', params.name);

    const response = await fetch(url, {
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

    console.log('[DodoPayments] Create customer response status:', response.status, response.statusText);

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        if (contentType?.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.message || error.error || JSON.stringify(error);
          console.log('[DodoPayments] API error:', error);
        } else {
          const text = await response.text();
          errorMessage = text.substring(0, 200);
          console.log('[DodoPayments] Non-JSON error:', text);
        }
      } catch (parseError) {
        console.error('[DodoPayments] Failed to parse error response:', parseError);
      }

      throw new Error(`DodoPayments API error: ${errorMessage}. URL: ${url}`);
    }

    const customer = await response.json();
    console.log('[DodoPayments] Customer created successfully:', JSON.stringify(customer));
    console.log('[DodoPayments] Customer ID:', customer.customer_id || customer.id);

    return customer;
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
    const url = `${this.baseUrl}/customer-portal/sessions`;
    console.log('[DodoPayments] Creating customer portal session at:', url);
    console.log('[DodoPayments] Customer ID:', params.customerId);
    console.log('[DodoPayments] Return URL:', params.returnUrl);

    const requestBody = {
      customer_id: params.customerId,
      return_url: params.returnUrl
    };

    console.log('[DodoPayments] Request body:', JSON.stringify(requestBody));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
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

    const portal = await response.json();
    console.log('[DodoPayments] Customer portal session created:', JSON.stringify(portal));
    console.log('[DodoPayments] Portal URL:', portal.url || portal.portal_url);

    return {
      url: portal.url || portal.portal_url
    };
  }

  /**
   * Verify Svix webhook signature
   * DodoPayments uses Svix for webhook delivery
   *
   * Algorithm:
   * 1. Construct signed content: `${svix_id}.${svix_timestamp}.${payload}`
   * 2. Calculate HMAC-SHA256 using webhook secret
   * 3. Compare with provided signature
   * 4. Verify timestamp is within 5 minutes
   */
  async verifySvixWebhookSignature(
    payload: string,
    svixId: string,
    svixTimestamp: string,
    svixSignature: string
  ): Promise<boolean> {
    try {
      // Verify timestamp is within 5 minutes
      const timestamp = parseInt(svixTimestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      const timeDiff = Math.abs(now - timestamp);

      console.log('[DodoPayments] Timestamp verification:');
      console.log('[DodoPayments] Current time:', now);
      console.log('[DodoPayments] Webhook time:', timestamp);
      console.log('[DodoPayments] Time difference (seconds):', timeDiff);

      if (timeDiff > 300) { // 5 minutes
        console.error('[DodoPayments] Timestamp too old or too far in future');
        return false;
      }

      // Construct signed content: id.timestamp.payload
      const signedContent = `${svixId}.${svixTimestamp}.${payload}`;

      console.log('[DodoPayments] Signed content length:', signedContent.length);
      console.log('[DodoPayments] Signed content preview:', signedContent.substring(0, 100) + '...');

      // Extract and decode secret
      // Svix secrets are base64-encoded and prefixed with 'whsec_'
      let secret = this.webhookSecret;
      if (secret.startsWith('whsec_')) {
        secret = secret.substring(6);
        console.log('[DodoPayments] Removed whsec_ prefix from secret');
      }

      // Base64 decode the secret to get the raw bytes
      console.log('[DodoPayments] Base64 decoding webhook secret');
      let secretBytes: Uint8Array;
      try {
        // Convert base64 string to bytes
        const binaryString = atob(secret);
        secretBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          secretBytes[i] = binaryString.charCodeAt(i);
        }
        console.log('[DodoPayments] Secret decoded successfully, byte length:', secretBytes.length);
      } catch (error) {
        console.error('[DodoPayments] Failed to base64 decode secret, using raw string:', error);
        // Fallback: use the string as-is
        const encoder = new TextEncoder();
        secretBytes = encoder.encode(secret);
      }

      // Calculate HMAC-SHA256 using the decoded secret bytes
      const key = await crypto.subtle.importKey(
        'raw',
        secretBytes,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      // Encode signed content as UTF-8
      const encoder = new TextEncoder();
      const signedContentBytes = encoder.encode(signedContent);

      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        signedContentBytes
      );

      // Convert to base64
      const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

      console.log('[DodoPayments] Expected signature (base64):', expectedSignature.substring(0, 20) + '...');
      console.log('[DodoPayments] Full expected signature:', expectedSignature);

      // Svix signatures format: "v1,signature1 v1,signature2" (space-separated for key rotation)
      // Each signature is "version,base64hash"
      const signaturePairs = svixSignature.split(' ').map(s => s.trim());

      console.log('[DodoPayments] Signature pairs count:', signaturePairs.length);
      console.log('[DodoPayments] Raw signature header:', svixSignature);

      // Check each signature pair
      for (const signaturePair of signaturePairs) {
        // Split by comma to get version and signature
        const parts = signaturePair.split(',');

        if (parts.length >= 2) {
          // Format: v1,signature
          const version = parts[0];
          const signature = parts.slice(1).join(','); // Rejoin in case signature has commas

          console.log('[DodoPayments] Checking signature with version:', version);
          console.log('[DodoPayments] Signature value:', signature.substring(0, 20) + '...');
          console.log('[DodoPayments] Full signature value:', signature);

          if (signature === expectedSignature) {
            console.log('[DodoPayments] ✅ Signature match found!');
            return true;
          }
        } else {
          // Format: just signature (no version)
          console.log('[DodoPayments] Checking signature without version:', signaturePair.substring(0, 20) + '...');

          if (signaturePair === expectedSignature) {
            console.log('[DodoPayments] ✅ Signature match found!');
            return true;
          }
        }
      }

      console.error('[DodoPayments] ❌ No matching signature found');
      console.error('[DodoPayments] Expected:', expectedSignature);
      console.error('[DodoPayments] Received:', svixSignature);
      return false;
    } catch (error) {
      console.error('[DodoPayments] Signature verification error:', error);
      return false;
    }
  }

  /**
   * Verify webhook signature (legacy method, kept for backward compatibility)
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
