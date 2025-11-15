# DodoPayments Integration Guide for EdgeLink

**Product:** EdgeLink URL Shortener
**Integration:** DodoPayments Payment Processing
**Version:** 1.0
**Date:** November 15, 2025, 7:46 PM IST
**Status:** Implementation Ready

***

## Executive Summary

This guide provides complete implementation details for integrating DodoPayments into EdgeLink to handle subscription billing, one-time payments, and automatic payment receipt emails. DodoPayments will manage all payment flows while EdgeLink maintains user accounts and link management. The integration leverages webhooks for real-time payment notifications and provides a seamless upgrade experience for users.

***

## Table of Contents

1. [Overview](#overview)
2. [DodoPayments Features](#dodopayments-features)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Webhook Handling](#webhook-handling)
8. [Payment Flows](#payment-flows)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Monitoring](#monitoring)

***

## Overview

### What is DodoPayments?

DodoPayments is a payment processing platform that provides:

- **Subscription billing** (recurring monthly/annual payments)[^1]
- **One-time payments** (lifetime plans, credits)
- **Automatic invoices \& receipts** (sent via email)[^2][^1]
- **Multiple payment methods** (credit card, PayPal, etc.)
- **Webhook notifications** (real-time payment events)
- **Customer portal** (self-service billing management)


### Why DodoPayments for EdgeLink?

1. **Automatic email receipts** - No need to build invoice system[^1][^2]
2. **Simple integration** - Webhook-based, no complex SDK
3. **Subscription management** - Handles recurring billing automatically
4. **Customer portal** - Users manage their own subscriptions
5. **Compliance** - PCI DSS compliant, handles tax calculations
6. **Multi-currency** - Support for multiple currencies and regions

***

## DodoPayments Features

### Payment Types[^1]

| Type | Description | Use Case |
| :-- | :-- | :-- |
| **Subscription** | Recurring payments | Monthly/Annual Pro plans |
| **One-time** | Single payment | Lifetime plan, credit packs |
| **Usage-based** | Pay per usage | Pay-per-link (future) |

### Automatic Emails[^2][^1]

DodoPayments automatically sends:

1. **Payment receipt** - Immediately after successful payment[^1]
2. **Invoice** - Professional invoice with tax breakdown[^2]
3. **Subscription renewal notice** - Before next billing cycle
4. **Payment failed notification** - When card is declined
5. **Subscription cancelled confirmation** - When user cancels

### Customer Portal Features

- View payment history
- Update payment method
- Download invoices
- Cancel subscriptions
- Update billing address

***

## Architecture

### Integration Flow

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  EdgeLink   │────────>│ DodoPayments │────────>│   User's    │
│  Frontend   │ Checkout│   Checkout   │ Payment │    Bank     │
└─────────────┘         └──────────────┘         └─────────────┘
       │                        │
       │                        │ Webhook (payment.succeeded)
       │                        ▼
       │                ┌──────────────┐
       └───────────────>│  EdgeLink    │
         Update UI      │   Backend    │
                        │  (Workers)   │
                        └──────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │ Cloudflare   │
                        │      D1      │
                        │  (Database)  │
                        └──────────────┘
```


### Component Responsibilities

**DodoPayments:**

- Payment processing \& security
- Subscription billing \& renewals
- Invoice generation
- Payment receipt emails[^2][^1]
- Customer portal hosting

**EdgeLink Backend:**

- Create checkout sessions
- Handle webhook notifications
- Update user subscription status
- Grant/revoke premium features
- Link usage tracking

**EdgeLink Frontend:**

- Display pricing plans
- Initiate checkout
- Show subscription status
- Redirect to customer portal

***

## Database Schema

### Extend Users Table

```sql
-- Add subscription fields to existing users table
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'free'; 
-- 'free', 'active', 'past_due', 'cancelled', 'paused'

ALTER TABLE users ADD COLUMN subscription_plan TEXT DEFAULT 'free'; 
-- 'free', 'pro_monthly', 'pro_annual', 'lifetime'

ALTER TABLE users ADD COLUMN subscription_id TEXT; 
-- DodoPayments subscription ID

ALTER TABLE users ADD COLUMN customer_id TEXT; 
-- DodoPayments customer ID

ALTER TABLE users ADD COLUMN subscription_current_period_start INTEGER;
ALTER TABLE users ADD COLUMN subscription_current_period_end INTEGER;
ALTER TABLE users ADD COLUMN subscription_cancel_at_period_end INTEGER DEFAULT 0;

ALTER TABLE users ADD COLUMN lifetime_access INTEGER DEFAULT 0; 
-- 1 if user has lifetime plan

-- Create index for subscription lookups
CREATE INDEX idx_users_subscription_id ON users(subscription_id);
CREATE INDEX idx_users_customer_id ON users(customer_id);
```


### Create Payments Table

```sql
-- Track all payment transactions
CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  payment_id TEXT NOT NULL UNIQUE, -- DodoPayments payment ID
  customer_id TEXT NOT NULL, -- DodoPayments customer ID
  subscription_id TEXT, -- NULL for one-time payments
  amount INTEGER NOT NULL, -- Amount in cents (e.g., 999 = $9.99)
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL, -- 'pending', 'succeeded', 'failed', 'refunded'
  payment_method TEXT, -- 'card', 'paypal', etc.
  plan TEXT NOT NULL, -- 'pro_monthly', 'pro_annual', 'lifetime'
  invoice_url TEXT, -- Link to DodoPayments invoice
  receipt_url TEXT, -- Link to receipt
  metadata TEXT, -- JSON string with additional data
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_payment_id ON payments(payment_id);
CREATE INDEX idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
```


### Create Webhook Events Table

```sql
-- Log all webhook events from DodoPayments for debugging
CREATE TABLE webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE, -- DodoPayments event ID
  event_type TEXT NOT NULL, -- 'payment.succeeded', 'subscription.cancelled', etc.
  customer_id TEXT,
  subscription_id TEXT,
  payment_id TEXT,
  payload TEXT NOT NULL, -- Full JSON payload
  processed INTEGER DEFAULT 0, -- 1 if successfully processed
  error_message TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at);
```


***

## Backend Implementation

### File Structure

```
edgelink/backend/src/
├── handlers/
│   ├── payments/
│   │   ├── create-checkout.ts         # NEW: Create DodoPayments checkout session
│   │   ├── webhook.ts                 # NEW: Handle DodoPayments webhooks
│   │   ├── subscription-status.ts     # NEW: Get user's subscription info
│   │   ├── cancel-subscription.ts     # NEW: Cancel subscription
│   │   └── customer-portal.ts         # NEW: Generate customer portal link
│   │
│   └── links/
│       └── create.ts                  # MODIFIED: Check subscription limits
│
├── services/
│   ├── payments/
│   │   ├── dodoPaymentsService.ts     # NEW: DodoPayments API wrapper
│   │   ├── subscriptionService.ts     # NEW: Subscription logic
│   │   └── planLimits.ts              # NEW: Plan feature limits
│   │
│   └── email/
│       └── emailService.ts            # EXISTING: No changes needed (DodoPayments handles payment emails)
│
└── middleware/
    └── subscription.ts                # NEW: Check subscription status middleware
```


### DodoPayments Service

```typescript
// services/payments/dodoPaymentsService.ts

export interface DodoPaymentsConfig {
  apiKey: string;
  webhookSecret: string;
  baseUrl: string; // 'https://api.dodopayments.com/v1'
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
    customerId?: string; // Existing customer ID (optional)
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
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');
    
    return signature === expectedSignature;
  }
  
  /**
   * Map plan to DodoPayments price ID
   */
  private getPriceId(plan: string): string {
    const priceIds = {
      'pro_monthly': process.env.DODO_PRICE_PRO_MONTHLY || 'price_monthly_xxx',
      'pro_annual': process.env.DODO_PRICE_PRO_ANNUAL || 'price_annual_xxx',
      'lifetime': process.env.DODO_PRICE_LIFETIME || 'price_lifetime_xxx'
    };
    
    return priceIds[plan] || priceIds['pro_monthly'];
  }
}
```


### Subscription Service

```typescript
// services/payments/subscriptionService.ts

import { DodoPaymentsService } from './dodoPaymentsService';

export interface SubscriptionStatus {
  plan: string;
  status: string;
  isActive: boolean;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd: boolean;
}

export class SubscriptionService {
  constructor(
    private env: Env,
    private dodoPayments: DodoPaymentsService
  ) {}
  
  /**
   * Get user's current subscription status
   */
  async getUserSubscriptionStatus(userId: number): Promise<SubscriptionStatus> {
    const user = await this.env.DB.prepare(`
      SELECT 
        subscription_status,
        subscription_plan,
        subscription_current_period_end,
        subscription_cancel_at_period_end,
        lifetime_access
      FROM users
      WHERE id = ?
    `).bind(userId).first();
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Lifetime access trumps everything
    if (user.lifetime_access === 1) {
      return {
        plan: 'lifetime',
        status: 'active',
        isActive: true,
        cancelAtPeriodEnd: false
      };
    }
    
    // Check if subscription is active
    const isActive = user.subscription_status === 'active' && 
                    (!user.subscription_current_period_end || 
                     user.subscription_current_period_end > Math.floor(Date.now() / 1000));
    
    return {
      plan: user.subscription_plan || 'free',
      status: user.subscription_status || 'free',
      isActive,
      currentPeriodEnd: user.subscription_current_period_end,
      cancelAtPeriodEnd: user.subscription_cancel_at_period_end === 1
    };
  }
  
  /**
   * Check if user has access to pro features
   */
  async hasProAccess(userId: number): Promise<boolean> {
    const status = await this.getUserSubscriptionStatus(userId);
    return status.isActive && status.plan !== 'free';
  }
  
  /**
   * Update user's subscription from webhook event
   */
  async updateSubscriptionFromWebhook(params: {
    userId: number;
    subscriptionId: string;
    customerId: string;
    plan: string;
    status: string;
    currentPeriodStart: number;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
  }): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    
    await this.env.DB.prepare(`
      UPDATE users
      SET 
        subscription_id = ?,
        customer_id = ?,
        subscription_plan = ?,
        subscription_status = ?,
        subscription_current_period_start = ?,
        subscription_current_period_end = ?,
        subscription_cancel_at_period_end = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      params.subscriptionId,
      params.customerId,
      params.plan,
      params.status,
      params.currentPeriodStart,
      params.currentPeriodEnd,
      params.cancelAtPeriodEnd ? 1 : 0,
      now,
      params.userId
    ).run();
  }
  
  /**
   * Grant lifetime access to user
   */
  async grantLifetimeAccess(userId: number, customerId: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    
    await this.env.DB.prepare(`
      UPDATE users
      SET 
        customer_id = ?,
        subscription_plan = 'lifetime',
        subscription_status = 'active',
        lifetime_access = 1,
        updated_at = ?
      WHERE id = ?
    `).bind(customerId, now, userId).run();
  }
  
  /**
   * Record payment in database
   */
  async recordPayment(params: {
    userId: number;
    paymentId: string;
    customerId: string;
    subscriptionId?: string;
    amount: number;
    currency: string;
    status: string;
    plan: string;
    invoiceUrl?: string;
    receiptUrl?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.env.DB.prepare(`
      INSERT INTO payments (
        user_id, payment_id, customer_id, subscription_id,
        amount, currency, status, plan,
        invoice_url, receipt_url, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      params.userId,
      params.paymentId,
      params.customerId,
      params.subscriptionId || null,
      params.amount,
      params.currency,
      params.status,
      params.plan,
      params.invoiceUrl || null,
      params.receiptUrl || null,
      params.metadata ? JSON.stringify(params.metadata) : null
    ).run();
  }
}
```


### Plan Limits Configuration

```typescript
// services/payments/planLimits.ts

export interface PlanLimits {
  maxLinks: number;
  maxClicksPerLink: number;
  customDomain: boolean;
  analytics: boolean;
  apiAccess: boolean;
  linkExpiration: boolean;
  passwordProtection: boolean;
  customSlug: boolean;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  'free': {
    maxLinks: 10,
    maxClicksPerLink: 1000,
    customDomain: false,
    analytics: false,
    apiAccess: false,
    linkExpiration: false,
    passwordProtection: false,
    customSlug: false
  },
  'pro_monthly': {
    maxLinks: -1, // Unlimited
    maxClicksPerLink: -1, // Unlimited
    customDomain: true,
    analytics: true,
    apiAccess: true,
    linkExpiration: true,
    passwordProtection: true,
    customSlug: true
  },
  'pro_annual': {
    maxLinks: -1,
    maxClicksPerLink: -1,
    customDomain: true,
    analytics: true,
    apiAccess: true,
    linkExpiration: true,
    passwordProtection: true,
    customSlug: true
  },
  'lifetime': {
    maxLinks: -1,
    maxClicksPerLink: -1,
    customDomain: true,
    analytics: true,
    apiAccess: true,
    linkExpiration: true,
    passwordProtection: true,
    customSlug: true
  }
};

export class PlanLimitsService {
  /**
   * Get limits for a specific plan
   */
  static getLimits(plan: string): PlanLimits {
    return PLAN_LIMITS[plan] || PLAN_LIMITS['free'];
  }
  
  /**
   * Check if user can create a new link
   */
  static async canCreateLink(env: Env, userId: number, plan: string): Promise<{ allowed: boolean; reason?: string }> {
    const limits = this.getLimits(plan);
    
    // Unlimited links for pro plans
    if (limits.maxLinks === -1) {
      return { allowed: true };
    }
    
    // Check current link count
    const result = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM links
      WHERE user_id = ?
    `).bind(userId).first();
    
    if (result.count >= limits.maxLinks) {
      return {
        allowed: false,
        reason: `Free plan limit: ${limits.maxLinks} links. Upgrade to Pro for unlimited links.`
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Check if user has access to a specific feature
   */
  static hasFeatureAccess(plan: string, feature: keyof Omit<PlanLimits, 'maxLinks' | 'maxClicksPerLink'>): boolean {
    const limits = this.getLimits(plan);
    return limits[feature];
  }
}
```


### Create Checkout Handler

```typescript
// handlers/payments/create-checkout.ts

import { DodoPaymentsService } from '../../services/payments/dodoPaymentsService';
import { authenticateRequest } from '../../middleware/auth';

export async function handleCreateCheckout(request: Request, env: Env): Promise<Response> {
  // Authenticate user
  const userId = await authenticateRequest(request, env);
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const { plan } = await request.json();
  
  // Validate plan
  if (!['pro_monthly', 'pro_annual', 'lifetime'].includes(plan)) {
    return new Response('Invalid plan', { status: 400 });
  }
  
  // Get user
  const user = await env.DB.prepare(`
    SELECT id, email, customer_id
    FROM users
    WHERE id = ?
  `).bind(userId).first();
  
  if (!user) {
    return new Response('User not found', { status: 404 });
  }
  
  // Initialize DodoPayments
  const dodoPayments = new DodoPaymentsService({
    apiKey: env.DODO_API_KEY,
    webhookSecret: env.DODO_WEBHOOK_SECRET,
    baseUrl: 'https://api.dodopayments.com/v1'
  });
  
  try {
    // Create or use existing customer
    let customerId = user.customer_id;
    
    if (!customerId) {
      const customer = await dodoPayments.createCustomer({
        email: user.email,
        metadata: {
          edgelink_user_id: userId.toString()
        }
      });
      customerId = customer.id;
      
      // Save customer ID
      await env.DB.prepare(`
        UPDATE users SET customer_id = ? WHERE id = ?
      `).bind(customerId, userId).run();
    }
    
    // Create checkout session
    const session = await dodoPayments.createCheckoutSession({
      customerId,
      customerEmail: user.email,
      plan,
      successUrl: `${env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${env.FRONTEND_URL}/billing/cancel`,
      metadata: {
        user_id: userId.toString(),
        plan
      }
    });
    
    return new Response(JSON.stringify({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('[CreateCheckout] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```


### Webhook Handler

```typescript
// handlers/payments/webhook.ts

import { DodoPaymentsService } from '../../services/payments/dodoPaymentsService';
import { SubscriptionService } from '../../services/payments/subscriptionService';

export async function handleDodoPaymentsWebhook(request: Request, env: Env): Promise<Response> {
  const signature = request.headers.get('dodo-signature');
  const payload = await request.text();
  
  if (!signature) {
    console.error('[Webhook] Missing signature');
    return new Response('Missing signature', { status: 400 });
  }
  
  // Initialize DodoPayments
  const dodoPayments = new DodoPaymentsService({
    apiKey: env.DODO_API_KEY,
    webhookSecret: env.DODO_WEBHOOK_SECRET,
    baseUrl: 'https://api.dodopayments.com/v1'
  });
  
  // Verify signature
  if (!dodoPayments.verifyWebhookSignature(payload, signature)) {
    console.error('[Webhook] Invalid signature');
    return new Response('Invalid signature', { status: 401 });
  }
  
  const event = JSON.parse(payload);
  
  console.log(`[Webhook] Received event: ${event.type}`);
  
  // Log webhook event
  try {
    await env.DB.prepare(`
      INSERT INTO webhook_events (event_id, event_type, customer_id, subscription_id, payment_id, payload)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      event.id,
      event.type,
      event.data?.customer_id || null,
      event.data?.subscription_id || null,
      event.data?.payment_id || null,
      payload
    ).run();
  } catch (error) {
    console.error('[Webhook] Failed to log event:', error);
  }
  
  // Process event
  try {
    await processWebhookEvent(event, env, dodoPayments);
    
    // Mark event as processed
    await env.DB.prepare(`
      UPDATE webhook_events SET processed = 1 WHERE event_id = ?
    `).bind(event.id).run();
    
    return new Response('OK', { status: 200 });
    
  } catch (error: any) {
    console.error('[Webhook] Processing error:', error);
    
    // Log error
    await env.DB.prepare(`
      UPDATE webhook_events SET error_message = ? WHERE event_id = ?
    `).bind(error.message, event.id).run();
    
    return new Response('Processing error', { status: 500 });
  }
}

async function processWebhookEvent(
  event: any,
  env: Env,
  dodoPayments: DodoPaymentsService
): Promise<void> {
  const subscriptionService = new SubscriptionService(env, dodoPayments);
  
  switch (event.type) {
    case 'payment.succeeded':
      await handlePaymentSucceeded(event.data, env, subscriptionService);
      break;
      
    case 'payment.failed':
      await handlePaymentFailed(event.data, env);
      break;
      
    case 'subscription.created':
      await handleSubscriptionCreated(event.data, env, subscriptionService);
      break;
      
    case 'subscription.updated':
      await handleSubscriptionUpdated(event.data, env, subscriptionService);
      break;
      
    case 'subscription.cancelled':
      await handleSubscriptionCancelled(event.data, env);
      break;
      
    case 'subscription.renewed':
      await handleSubscriptionRenewed(event.data, env, subscriptionService);
      break;
      
    default:
      console.log(`[Webhook] Unhandled event type: ${event.type}`);
  }
}

async function handlePaymentSucceeded(
  data: any,
  env: Env,
  subscriptionService: SubscriptionService
): Promise<void> {
  console.log('[Webhook] Payment succeeded:', data.payment_id);
  
  // Get user ID from metadata
  const userId = parseInt(data.metadata?.user_id);
  if (!userId) {
    throw new Error('Missing user_id in metadata');
  }
  
  // Record payment
  await subscriptionService.recordPayment({
    userId,
    paymentId: data.payment_id,
    customerId: data.customer_id,
    subscriptionId: data.subscription_id,
    amount: data.amount,
    currency: data.currency,
    status: 'succeeded',
    plan: data.metadata?.plan || 'pro_monthly',
    invoiceUrl: data.invoice_url,
    receiptUrl: data.receipt_url,
    metadata: data.metadata
  });
  
  // If lifetime plan, grant lifetime access
  if (data.metadata?.plan === 'lifetime') {
    await subscriptionService.grantLifetimeAccess(userId, data.customer_id);
  }
}

async function handlePaymentFailed(data: any, env: Env): Promise<void> {
  console.log('[Webhook] Payment failed:', data.payment_id);
  
  const userId = parseInt(data.metadata?.user_id);
  if (!userId) return;
  
  // Update payment record
  await env.DB.prepare(`
    UPDATE payments
    SET status = 'failed', updated_at = ?
    WHERE payment_id = ?
  `).bind(Math.floor(Date.now() / 1000), data.payment_id).run();
  
  // If subscription payment failed, mark subscription as past_due
  if (data.subscription_id) {
    await env.DB.prepare(`
      UPDATE users
      SET subscription_status = 'past_due', updated_at = ?
      WHERE subscription_id = ?
    `).bind(Math.floor(Date.now() / 1000), data.subscription_id).run();
  }
}

async function handleSubscriptionCreated(
  data: any,
  env: Env,
  subscriptionService: SubscriptionService
): Promise<void> {
  console.log('[Webhook] Subscription created:', data.subscription_id);
  
  const userId = parseInt(data.metadata?.user_id);
  if (!userId) {
    throw new Error('Missing user_id in metadata');
  }
  
  await subscriptionService.updateSubscriptionFromWebhook({
    userId,
    subscriptionId: data.subscription_id,
    customerId: data.customer_id,
    plan: data.metadata?.plan || 'pro_monthly',
    status: 'active',
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: false
  });
}

async function handleSubscriptionUpdated(
  data: any,
  env: Env,
  subscriptionService: SubscriptionService
): Promise<void> {
  console.log('[Webhook] Subscription updated:', data.subscription_id);
  
  // Get user by subscription ID
  const user = await env.DB.prepare(`
    SELECT id FROM users WHERE subscription_id = ?
  `).bind(data.subscription_id).first();
  
  if (!user) {
    throw new Error('User not found for subscription');
  }
  
  await subscriptionService.updateSubscriptionFromWebhook({
    userId: user.id,
    subscriptionId: data.subscription_id,
    customerId: data.customer_id,
    plan: data.plan,
    status: data.status,
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end
  });
}

async function handleSubscriptionCancelled(data: any, env: Env): Promise<void> {
  console.log('[Webhook] Subscription cancelled:', data.subscription_id);
  
  await env.DB.prepare(`
    UPDATE users
    SET 
      subscription_status = 'cancelled',
      subscription_cancel_at_period_end = 1,
      updated_at = ?
    WHERE subscription_id = ?
  `).bind(Math.floor(Date.now() / 1000), data.subscription_id).run();
}

async function handleSubscriptionRenewed(
  data: any,
  env: Env,
  subscriptionService: SubscriptionService
): Promise<void> {
  console.log('[Webhook] Subscription renewed:', data.subscription_id);
  
  const user = await env.DB.prepare(`
    SELECT id FROM users WHERE subscription_id = ?
  `).bind(data.subscription_id).first();
  
  if (!user) return;
  
  await subscriptionService.updateSubscriptionFromWebhook({
    userId: user.id,
    subscriptionId: data.subscription_id,
    customerId: data.customer_id,
    plan: data.plan,
    status: 'active',
    currentPeriodStart: data.current_period_start,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: false
  });
}
```


### Get Subscription Status Handler

```typescript
// handlers/payments/subscription-status.ts

import { SubscriptionService } from '../../services/payments/subscriptionService';
import { DodoPaymentsService } from '../../services/payments/dodoPaymentsService';
import { PlanLimitsService } from '../../services/payments/planLimits';
import { authenticateRequest } from '../../middleware/auth';

export async function handleGetSubscriptionStatus(request: Request, env: Env): Promise<Response> {
  const userId = await authenticateRequest(request, env);
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const dodoPayments = new DodoPaymentsService({
    apiKey: env.DODO_API_KEY,
    webhookSecret: env.DODO_WEBHOOK_SECRET,
    baseUrl: 'https://api.dodopayments.com/v1'
  });
  
  const subscriptionService = new SubscriptionService(env, dodoPayments);
  
  try {
    const status = await subscriptionService.getUserSubscriptionStatus(userId);
    const limits = PlanLimitsService.getLimits(status.plan);
    
    // Get current link count
    const linkCount = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM links WHERE user_id = ?
    `).bind(userId).first();
    
    return new Response(JSON.stringify({
      success: true,
      subscription: status,
      limits,
      usage: {
        links: linkCount.count,
        linksLimit: limits.maxLinks
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```


### Customer Portal Handler

```typescript
// handlers/payments/customer-portal.ts

import { DodoPaymentsService } from '../../services/payments/dodoPaymentsService';
import { authenticateRequest } from '../../middleware/auth';

export async function handleGetCustomerPortal(request: Request, env: Env): Promise<Response> {
  const userId = await authenticateRequest(request, env);
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Get user's customer ID
  const user = await env.DB.prepare(`
    SELECT customer_id FROM users WHERE id = ?
  `).bind(userId).first();
  
  if (!user || !user.customer_id) {
    return new Response(JSON.stringify({
      success: false,
      error: 'No active subscription found'
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const dodoPayments = new DodoPaymentsService({
    apiKey: env.DODO_API_KEY,
    webhookSecret: env.DODO_WEBHOOK_SECRET,
    baseUrl: 'https://api.dodopayments.com/v1'
  });
  
  try {
    const portal = await dodoPayments.createCustomerPortalSession({
      customerId: user.customer_id,
      returnUrl: `${env.FRONTEND_URL}/billing`
    });
    
    return new Response(JSON.stringify({
      success: true,
      portalUrl: portal.url
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```


### Subscription Middleware

```typescript
// middleware/subscription.ts

import { SubscriptionService } from '../services/payments/subscriptionService';
import { DodoPaymentsService } from '../services/payments/dodoPaymentsService';

/**
 * Middleware to check if user has pro access
 */
export async function requireProAccess(
  request: Request,
  env: Env,
  userId: number
): Promise<{ allowed: boolean; error?: string }> {
  const dodoPayments = new DodoPaymentsService({
    apiKey: env.DODO_API_KEY,
    webhookSecret: env.DODO_WEBHOOK_SECRET,
    baseUrl: 'https://api.dodopayments.com/v1'
  });
  
  const subscriptionService = new SubscriptionService(env, dodoPayments);
  
  const hasAccess = await subscriptionService.hasProAccess(userId);
  
  if (!hasAccess) {
    return {
      allowed: false,
      error: 'This feature requires a Pro subscription. Upgrade to unlock.'
    };
  }
  
  return { allowed: true };
}
```


### Modified Link Creation Handler

```typescript
// handlers/links/create.ts (MODIFIED)

import { PlanLimitsService } from '../../services/payments/planLimits';

export async function handleCreateLink(request: Request, env: Env): Promise<Response> {
  const userId = await authenticateRequest(request, env);
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const { originalUrl, customSlug, password, expiresAt } = await request.json();
  
  // Get user's subscription plan
  const user = await env.DB.prepare(`
    SELECT subscription_plan, lifetime_access FROM users WHERE id = ?
  `).bind(userId).first();
  
  const plan = user.lifetime_access === 1 ? 'lifetime' : (user.subscription_plan || 'free');
  
  // Check if user can create more links
  const canCreate = await PlanLimitsService.canCreateLink(env, userId, plan);
  if (!canCreate.allowed) {
    return new Response(JSON.stringify({
      success: false,
      error: canCreate.reason
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Check feature access for premium features
  if (customSlug && !PlanLimitsService.hasFeatureAccess(plan, 'customSlug')) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Custom slugs require a Pro subscription'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (password && !PlanLimitsService.hasFeatureAccess(plan, 'passwordProtection')) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Password protection requires a Pro subscription'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (expiresAt && !PlanLimitsService.hasFeatureAccess(plan, 'linkExpiration')) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Link expiration requires a Pro subscription'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Continue with link creation...
  // (existing link creation logic)
}
```


***

## Frontend Implementation

### File Structure

```
edgelink/frontend/src/
├── app/
│   ├── billing/
│   │   ├── page.tsx                   # NEW: Billing dashboard
│   │   ├── success/
│   │   │   └── page.tsx               # NEW: Payment success page
│   │   └── cancel/
│   │       └── page.tsx               # NEW: Payment cancelled page
│   │
│   └── pricing/
│       └── page.tsx                   # NEW: Pricing page
│
├── components/
│   ├── billing/
│   │   ├── PricingCard.tsx            # NEW: Plan pricing card
│   │   ├── SubscriptionStatus.tsx     # NEW: Current subscription display
│   │   └── UpgradeButton.tsx          # NEW: Upgrade to Pro button
│   │
│   └── dashboard/
│       └── ProFeatureBadge.tsx        # NEW: "Pro" badge for premium features
│
└── lib/
    └── api/
        └── billing.ts                 # NEW: Billing API calls
```


### Pricing Page

```typescript
// app/pricing/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCheckout } from '@/lib/api/billing';

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  
  const plans = {
    free: {
      name: 'Free',
      price: '$0',
      description: 'Perfect for getting started',
      features: [
        '10 shortened links',
        '1,000 clicks per link',
        'Basic analytics',
        'Email support'
      ],
      cta: 'Current Plan',
      disabled: true
    },
    pro_monthly: {
      name: 'Pro Monthly',
      price: '$9.99',
      period: '/month',
      description: 'For power users and businesses',
      features: [
        'Unlimited shortened links',
        'Unlimited clicks',
        'Advanced analytics',
        'Custom domains',
        'API access',
        'Password protection',
        'Link expiration',
        'Priority support'
      ],
      cta: 'Upgrade to Pro',
      plan: 'pro_monthly'
    },
    pro_annual: {
      name: 'Pro Annual',
      price: '$99.99',
      period: '/year',
      savings: 'Save $20',
      description: 'Best value - 2 months free!',
      features: [
        'Everything in Pro Monthly',
        '2 months free',
        'Priority email support',
        'Early access to new features'
      ],
      cta: 'Upgrade to Pro',
      plan: 'pro_annual',
      popular: true
    },
    lifetime: {
      name: 'Lifetime',
      price: '$299',
      period: 'one-time',
      description: 'Pay once, use forever',
      features: [
        'Everything in Pro',
        'Lifetime access',
        'All future updates',
        'No recurring payments',
        'VIP support'
      ],
      cta: 'Get Lifetime Access',
      plan: 'lifetime'
    }
  };
  
  const handleUpgrade = async (plan: string) => {
    setLoading(plan);
    
    try {
      const response = await createCheckout(plan);
      
      if (response.success) {
        // Redirect to DodoPayments checkout
        window.location.href = response.checkoutUrl;
      } else {
        alert('Failed to create checkout session: ' + response.error);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(null);
    }
  };
  
  const displayedPlan = billingCycle === 'monthly' ? 'pro_monthly' : 'pro_annual';
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Choose the plan that's right for you
          </p>
          
          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center bg-white rounded-lg shadow p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-md font-medium transition ${
                billingCycle === 'monthly'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-md font-medium transition ${
                billingCycle === 'annual'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Annual
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Save 17%
              </span>
            </button>
          </div>
        </div>
        
        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Free Plan */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{plans.free.name}</h3>
            <p className="text-gray-600 mb-6">{plans.free.description}</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">{plans.free.price}</span>
            </div>
            <ul className="space-y-3 mb-8">
              {plans.free.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
            <button
              disabled
              className="w-full bg-gray-300 text-gray-700 py-3 px-4 rounded-md font-medium cursor-not-allowed"
            >
              {plans.free.cta}
            </button>
          </div>
          
          {/* Pro Plan (Monthly or Annual) */}
          <div className={`bg-white rounded-lg shadow-lg p-8 relative ${
            plans[displayedPlan].popular ? 'border-2 border-indigo-600' : ''
          }`}>
            {plans[displayedPlan].popular && (
              <div className="absolute top-0 right-0 bg-indigo-600 text-white px-4 py-1 rounded-bl-lg rounded-tr-lg text-sm font-medium">
                Most Popular
              </div>
            )}
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{plans[displayedPlan].name}</h3>
            <p className="text-gray-600 mb-6">{plans[displayedPlan].description}</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">{plans[displayedPlan].price}</span>
              <span className="text-gray-600">{plans[displayedPlan].period}</span>
              {plans[displayedPlan].savings && (
                <div className="inline-block ml-2 bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                  {plans[displayedPlan].savings}
                </div>
              )}
            </div>
            <ul className="space-y-3 mb-8">
              {plans[displayedPlan].features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleUpgrade(plans[displayedPlan].plan)}
              disabled={loading === plans[displayedPlan].plan}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading === plans[displayedPlan].plan ? 'Loading...' : plans[displayedPlan].cta}
            </button>
          </div>
          
          {/* Lifetime Plan */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{plans.lifetime.name}</h3>
            <p className="text-gray-600 mb-6">{plans.lifetime.description}</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-gray-900">{plans.lifetime.price}</span>
              <span className="text-gray-600"> {plans.lifetime.period}</span>
            </div>
            <ul className="space-y-3 mb-8">
              {plans.lifetime.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleUpgrade(plans.lifetime.plan)}
              disabled={loading === plans.lifetime.plan}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-md font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading === plans.lifetime.plan ? 'Loading...' : plans.lifetime.cta}
            </button>
          </div>
        </div>
        
        {/* FAQ Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Do you offer refunds?
              </h3>
              <p className="text-gray-600">
                Yes! We offer a 30-day money-back guarantee on all paid plans. If you're not satisfied, contact us for a full refund.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I upgrade or downgrade my plan?
              </h3>
              <p className="text-gray-600">
                Absolutely! You can upgrade or downgrade your plan at any time from your billing dashboard. Changes take effect immediately.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards (Visa, Mastercard, American Express) and PayPal through our secure payment processor.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Is my payment information secure?
              </h3>
              <p className="text-gray-600">
                Yes! We never store your payment information. All payments are processed securely through DodoPayments, which is PCI DSS compliant.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```


### Billing Dashboard

```typescript
// app/billing/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSubscriptionStatus, getCustomerPortal } from '@/lib/api/billing';

export default function BillingPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  
  useEffect(() => {
    loadSubscription();
  }, []);
  
  const loadSubscription = async () => {
    try {
      const response = await getSubscriptionStatus();
      if (response.success) {
        setSubscription(response.subscription);
      }
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleManageBilling = async () => {
    setPortalLoading(true);
    
    try {
      const response = await getCustomerPortal();
      if (response.success) {
        window.location.href = response.portalUrl;
      } else {
        alert('Failed to open customer portal: ' + response.error);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setPortalLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  const isPro = subscription?.plan !== 'free';
  const isLifetime = subscription?.plan === 'lifetime';
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Billing & Subscription</h1>
        
        {/* Current Plan */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Current Plan</h2>
              <div className="flex items-center gap-3">
                <span className={`text-3xl font-bold ${isPro ? 'text-indigo-600' : 'text-gray-600'}`}>
                  {subscription?.plan === 'pro_monthly' && 'Pro Monthly'}
                  {subscription?.plan === 'pro_annual' && 'Pro Annual'}
                  {subscription?.plan === 'lifetime' && 'Lifetime'}
                  {subscription?.plan === 'free' && 'Free'}
                </span>
                {isPro && (
                  <span className="bg-indigo-100 text-indigo-800 text-sm font-medium px-3 py-1 rounded-full">
                    Active
                  </span>
                )}
              </div>
            </div>
            
            {!isLifetime && isPro && (
              <button
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 font-medium disabled:opacity-50"
              >
                {portalLoading ? 'Loading...' : 'Manage Billing'}
              </button>
            )}
          </div>
          
          {/* Subscription Details */}
          {isPro && !isLifetime && subscription?.currentPeriodEnd && (
            <div className="border-t pt-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Next billing date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {subscription.cancelAtPeriodEnd ? (
                      <span className="text-red-600">Cancels at period end</span>
                    ) : (
                      <span className="text-green-600">Active</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {isLifetime && (
            <div className="border-t pt-6">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
                <p className="text-indigo-900 font-medium">
                  🎉 You have lifetime access! No recurring payments required.
                </p>
              </div>
            </div>
          )}
          
          {subscription?.plan === 'free' && (
            <div className="border-t pt-6">
              <p className="text-gray-600 mb-4">
                Upgrade to Pro to unlock unlimited links, custom domains, advanced analytics, and more!
              </p>
              <button
                onClick={() => router.push('/pricing')}
                className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 font-medium"
              >
                View Plans
              </button>
            </div>
          )}
        </div>
        
        {/* Usage */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Usage</h2>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700 font-medium">Links Created</span>
                <span className="text-gray-900 font-bold">
                  {subscription?.usage?.links || 0} / {subscription?.limits?.maxLinks === -1 ? '∞' : subscription?.limits?.maxLinks || 10}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all"
                  style={{
                    width: subscription?.limits?.maxLinks === -1
                      ? '100%'
                      : `${Math.min((subscription?.usage?.links / subscription?.limits?.maxLinks) * 100, 100)}%`
                  }}
                ></div>
              </div>
            </div>
            
            {subscription?.plan === 'free' && subscription?.usage?.links >= 8 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-900 text-sm">
                  ⚠️ You're approaching your free plan limit. Upgrade to Pro for unlimited links!
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Features */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Features</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <Feature
              name="Custom Domains"
              enabled={subscription?.limits?.customDomain}
            />
            <Feature
              name="Advanced Analytics"
              enabled={subscription?.limits?.analytics}
            />
            <Feature
              name="API Access"
              enabled={subscription?.limits?.apiAccess}
            />
            <Feature
              name="Link Expiration"
              enabled={subscription?.limits?.linkExpiration}
            />
            <Feature
              name="Password Protection"
              enabled={subscription?.limits?.passwordProtection}
            />
            <Feature
              name="Custom Slugs"
              enabled={subscription?.limits?.customSlug}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ name, enabled }: { name: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {enabled ? (
        <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )}
      <span className={enabled ? 'text-gray-900 font-medium' : 'text-gray-400'}>
        {name}
      </span>
    </div>
  );
}
```


### Payment Success Page

```typescript
// app/billing/success/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.push('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
        
        <p className="text-gray-600 mb-6">
          Thank you for upgrading to Pro! Your account has been activated with all premium features.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-900 text-sm">
            📧 A receipt has been sent to your email address.
          </p>
        </div>
        
        <p className="text-sm text-gray-500 mb-6">
          Redirecting to dashboard in {countdown} seconds...
        </p>
        
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md font-medium hover:bg-indigo-700"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
```


### Billing API Client

```typescript
// lib/api/billing.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://go.shortedbro.xyz';

export async function createCheckout(plan: string) {
  const response = await fetch(`${API_URL}/api/payments/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
    },
    body: JSON.stringify({ plan })
  });
  
  return await response.json();
}

export async function getSubscriptionStatus() {
  const response = await fetch(`${API_URL}/api/payments/subscription-status`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
    }
  });
  
  return await response.json();
}

export async function getCustomerPortal() {
  const response = await fetch(`${API_URL}/api/payments/customer-portal`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
    }
  });
  
  return await response.json();
}
```


***

## Configuration \& Deployment

### Environment Variables

**Backend: `wrangler.toml`**

```toml
# Add to existing wrangler.toml

[vars]
# Existing vars...
FRONTEND_URL = "https://shortedbro.xyz"

# DodoPayments Configuration
DODO_API_URL = "https://api.dodopayments.com/v1"

# DodoPayments Price IDs (get these from DodoPayments dashboard)
DODO_PRICE_PRO_MONTHLY = "price_1234567890abc"
DODO_PRICE_PRO_ANNUAL = "price_0987654321xyz"
DODO_PRICE_LIFETIME = "price_lifetime123456"

# Secrets (set via wrangler secret put)
# DODO_API_KEY - Your DodoPayments API key
# DODO_WEBHOOK_SECRET - Webhook signing secret from DodoPayments
```

**Set Secrets:**

```bash
cd edgelink/backend
wrangler secret put DODO_API_KEY
# Enter your DodoPayments API key

wrangler secret put DODO_WEBHOOK_SECRET
# Enter your webhook secret from DodoPayments
```


### Database Migration

```bash
# Run payment tables migration
wrangler d1 execute edgelink-production --file=./migrations/002_payments.sql

# Verify tables created
wrangler d1 execute edgelink-production --command "SELECT name FROM sqlite_master WHERE type='table';"
```


### DodoPayments Dashboard Setup

1. **Sign up for DodoPayments** at https://dodopayments.com
2. **Create Products:**
    - Pro Monthly (\$9.99/month)
    - Pro Annual (\$99.99/year)
    - Lifetime (\$299 one-time)
3. **Get Price IDs** for each product
4. **Create API Key** with permissions: `payments.read`, `payments.write`, `subscriptions.read`, `subscriptions.write`
5. **Configure Webhook:**
    - URL: `https://go.shortedbro.xyz/webhooks/dodopayments`
    - Events: Select all payment and subscription events
    - Get webhook secret
6. **Test in sandbox mode** before going live

### Webhook Endpoint Setup

Add webhook route to your router:

```typescript
// src/router.ts

import { handleDodoPaymentsWebhook } from './handlers/payments/webhook';

// Add route
if (url.pathname === '/webhooks/dodopayments' && request.method === 'POST') {
  return handleDodoPaymentsWebhook(request, env);
}
```


***

## Testing

### Test Checklist

**Checkout Flow:**

- [ ] Free user can access pricing page
- [ ] Clicking "Upgrade" creates checkout session
- [ ] Redirects to DodoPayments checkout
- [ ] Test card completes payment successfully
- [ ] Redirects to success page after payment
- [ ] Webhook received and processed
- [ ] User subscription updated in database
- [ ] Receipt email received from DodoPayments

**Subscription Management:**

- [ ] Billing dashboard shows current plan
- [ ] "Manage Billing" opens customer portal
- [ ] Can update payment method in portal
- [ ] Can cancel subscription in portal
- [ ] Cancellation webhook received
- [ ] Subscription marked as "cancel_at_period_end"

**Feature Access:**

- [ ] Free users can create up to 10 links
- [ ] 11th link blocked with upgrade prompt
- [ ] Pro users can create unlimited links
- [ ] Custom slug blocked for free users
- [ ] Custom slug works for pro users
- [ ] All pro features enabled after upgrade

**Webhook Events:**

- [ ] payment.succeeded webhook received
- [ ] subscription.created webhook received
- [ ] subscription.updated webhook received
- [ ] subscription.cancelled webhook received
- [ ] All webhooks logged in database
- [ ] Failed webhooks show error message


### Test Cards (DodoPayments Sandbox)

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Expired: 4000 0000 0000 0069
```

Use any future expiry date and any 3-digit CVC.

***

## Monitoring

### Key Metrics

```sql
-- Payment statistics (last 30 days)
SELECT 
  plan,
  status,
  COUNT(*) as count,
  SUM(amount) as total_revenue
FROM payments
WHERE created_at > unixepoch() - (30 * 24 * 60 * 60)
GROUP BY plan, status;

-- Active subscriptions by plan
SELECT 
  subscription_plan,
  COUNT(*) as count
FROM users
WHERE subscription_status = 'active'
GROUP BY subscription_plan;

-- Conversion rate (free to paid)
SELECT 
  (SELECT COUNT(*) FROM users WHERE subscription_plan != 'free') AS paid_users,
  (SELECT COUNT(*) FROM users) AS total_users,
  ROUND(
    CAST((SELECT COUNT(*) FROM users WHERE subscription_plan != 'free') AS REAL) / 
    (SELECT COUNT(*) FROM users) * 100,
    2
  ) as conversion_rate_percent;

-- Monthly recurring revenue (MRR)
SELECT 
  SUM(CASE 
    WHEN subscription_plan = 'pro_monthly' THEN 999
    WHEN subscription_plan = 'pro_annual' THEN ROUND(9999.0 / 12)
    ELSE 0
  END) as mrr_cents
FROM users
WHERE subscription_status = 'active'
AND lifetime_access = 0;

-- Webhook processing health
SELECT 
  event_type,
  COUNT(*) as total,
  SUM(CASE WHEN processed = 1 THEN 1 ELSE 0 END) as processed,
  SUM(CASE WHEN processed = 0 THEN 1 ELSE 0 END) as failed
FROM webhook_events
WHERE created_at > unixepoch() - (24 * 60 * 60)
GROUP BY event_type;
```


***

## Conclusion

This DodoPayments integration provides EdgeLink with:

✅ **Complete payment processing** (subscriptions + one-time)
✅ **Automatic invoices \& receipts** (no email building needed)[^1][^2]
✅ **Customer self-service** (billing portal)
✅ **Webhook-based** (real-time updates)
✅ **Secure \& compliant** (PCI DSS)
✅ **Multi-currency support** (global reach)

**Total implementation time:** 2-3 days for complete integration

**Monthly costs:** DodoPayments fees only (typically 2.9% + \$0.30 per transaction)

**Next steps:**

1. Sign up for DodoPayments account
2. Create products and get price IDs
3. Implement backend handlers
4. Set up webhooks
5. Build frontend pricing/billing pages
6. Test in sandbox mode
7. Go live!
