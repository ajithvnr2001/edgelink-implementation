/**
 * Plan Limits Service - Defines feature access for each subscription plan
 * Updated with competitive market-aligned limits
 */

import type { Env } from '../../types';

export interface PlanLimits {
  maxLinks: number;                    // Total active links allowed
  maxClicksPerMonth: number;           // Total clicks per month across all links
  maxCustomDomains: number;            // Number of custom domains allowed
  maxGroups: number;                   // Number of link groups allowed
  analytics: boolean;                  // Advanced analytics access
  apiAccess: boolean;                  // API access
  linkExpiration: boolean;             // Link expiration feature
  passwordProtection: boolean;         // Password-protected links
  customSlug: boolean;                 // Custom slug creation
  editSlug: boolean;                   // Edit slug after creation
  editDestination: boolean;            // Edit destination URL
  qrCode: boolean;                     // QR code generation
  geoRouting: boolean;                 // Geographic routing
  deviceRouting: boolean;              // Device-based routing
  referrerRouting: boolean;            // Referrer-based routing
  webhooks: boolean;                   // Webhook support
  bulkOperations: boolean;             // Import/Export bulk operations
  groups: boolean;                     // Link groups feature
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  'free': {
    maxLinks: 10,                      // 10 total active links (TESTING)
    maxClicksPerMonth: 10,             // 10 clicks per month (TESTING)
    maxCustomDomains: 0,               // No custom domains
    maxGroups: 0,                      // No link groups
    analytics: false,                  // Basic click count only
    apiAccess: false,                  // No API access (or very limited)
    linkExpiration: true,              // Allow link expiration
    passwordProtection: true,          // Allow password protection
    customSlug: true,                  // Allow custom slug on creation
    editSlug: false,                   // Cannot edit slug after creation
    editDestination: true,             // CAN edit destination URL
    qrCode: false,                     // No QR code generation
    geoRouting: false,                 // No geographic routing
    deviceRouting: false,              // No device routing
    referrerRouting: false,            // No referrer routing
    webhooks: false,                   // No webhooks
    bulkOperations: false,             // No import/export
    groups: false                      // No link groups
  },
  'pro': {
    maxLinks: 20,                      // 20 total active links (TESTING)
    maxClicksPerMonth: 20,             // 20 clicks per month (TESTING)
    maxCustomDomains: 2,               // 2 custom domains with SSL
    maxGroups: 50,                     // 50 link groups
    analytics: true,                   // Advanced analytics with charts
    apiAccess: true,                   // Full API access
    linkExpiration: true,              // Link expiration
    passwordProtection: true,          // Password protection
    customSlug: true,                  // Custom slug creation
    editSlug: true,                    // CAN edit slug after creation
    editDestination: true,             // CAN edit destination URL
    qrCode: true,                      // QR code generation
    geoRouting: true,                  // Geographic routing
    deviceRouting: true,               // Device routing
    referrerRouting: true,             // Referrer routing
    webhooks: true,                    // Webhook support
    bulkOperations: true,              // Import/Export operations
    groups: true                       // Link groups feature
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
  static async canCreateLink(env: Env, userId: string, plan: string): Promise<{ allowed: boolean; reason?: string }> {
    const limits = this.getLimits(plan);

    // Check current link count
    const result = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM links
      WHERE user_id = ?
    `).bind(userId).first();

    if (result && result.count >= limits.maxLinks) {
      return {
        allowed: false,
        reason: `${plan === 'free' ? 'Free' : 'Pro'} plan limit: ${limits.maxLinks.toLocaleString()} links. ${plan === 'free' ? 'Upgrade to Pro for 100,000 links.' : 'Contact us for Enterprise pricing.'}`
      };
    }

    return { allowed: true };
  }

  /**
   * Check if user has exceeded monthly click limit
   */
  static async checkMonthlyClickLimit(env: Env, userId: string, plan: string): Promise<{ allowed: boolean; reason?: string; current?: number; limit?: number }> {
    const limits = this.getLimits(plan);

    // Get current month's click count
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const result = await env.DB.prepare(`
      SELECT COALESCE(SUM(click_count), 0) as total_clicks
      FROM links
      WHERE user_id = ? AND created_at >= ?
    `).bind(userId, monthStart).first() as { total_clicks: number } | null;

    const currentClicks = result?.total_clicks || 0;

    if (currentClicks >= limits.maxClicksPerMonth) {
      return {
        allowed: false,
        reason: `Monthly click limit reached: ${currentClicks.toLocaleString()}/${limits.maxClicksPerMonth.toLocaleString()}. ${plan === 'free' ? 'Upgrade to Pro for 500,000 clicks/month.' : 'Limit resets next month.'}`,
        current: currentClicks,
        limit: limits.maxClicksPerMonth
      };
    }

    return {
      allowed: true,
      current: currentClicks,
      limit: limits.maxClicksPerMonth
    };
  }

  /**
   * Check if user has access to a specific feature
   */
  static hasFeatureAccess(plan: string, feature: keyof PlanLimits): boolean {
    const limits = this.getLimits(plan);
    const value = limits[feature];

    // Handle boolean features
    if (typeof value === 'boolean') {
      return value;
    }

    // Handle numeric features (custom domains, etc.)
    if (typeof value === 'number') {
      return value > 0;
    }

    return false;
  }

  /**
   * Get custom domain limit for plan
   */
  static getCustomDomainLimit(plan: string): number {
    const limits = this.getLimits(plan);
    return limits.maxCustomDomains;
  }

  /**
   * Get group limit for plan
   */
  static getGroupLimit(plan: string): number {
    const limits = this.getLimits(plan);
    return limits.maxGroups;
  }

  /**
   * Check if user can create a new group
   */
  static async canCreateGroup(env: Env, userId: string, plan: string): Promise<{ allowed: boolean; reason?: string }> {
    const limits = this.getLimits(plan);

    // Check if groups feature is available
    if (!limits.groups) {
      return {
        allowed: false,
        reason: 'Link groups are a Pro feature. Upgrade to Pro to organize your links into groups.'
      };
    }

    // Check current group count
    const result = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM link_groups
      WHERE user_id = ? AND archived_at IS NULL
    `).bind(userId).first();

    if (result && (result.count as number) >= limits.maxGroups) {
      return {
        allowed: false,
        reason: `Group limit reached: ${limits.maxGroups} groups. Delete or archive existing groups to create new ones.`
      };
    }

    return { allowed: true };
  }
}
