/**
 * Subscription Service - Manages user subscriptions and plan status
 */

import type { Env } from '../../types';
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
  async getUserSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    const user = await this.env.DB.prepare(`
      SELECT
        subscription_status,
        subscription_plan,
        subscription_current_period_end,
        subscription_cancel_at_period_end,
        lifetime_access
      FROM users
      WHERE user_id = ?
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
  async hasProAccess(userId: string): Promise<boolean> {
    const status = await this.getUserSubscriptionStatus(userId);
    return status.isActive && status.plan !== 'free';
  }

  /**
   * Update user's subscription from webhook event
   */
  async updateSubscriptionFromWebhook(params: {
    userId: string;
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
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).bind(
      params.subscriptionId,
      params.customerId,
      params.plan,
      params.status,
      params.currentPeriodStart,
      params.currentPeriodEnd,
      params.cancelAtPeriodEnd ? 1 : 0,
      params.userId
    ).run();
  }

  /**
   * Grant lifetime access to user
   */
  async grantLifetimeAccess(userId: string, customerId: string): Promise<void> {
    await this.env.DB.prepare(`
      UPDATE users
      SET
        customer_id = ?,
        subscription_plan = 'lifetime',
        subscription_status = 'active',
        lifetime_access = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).bind(customerId, userId).run();
  }

  /**
   * Record payment in database
   */
  async recordPayment(params: {
    userId: string;
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
