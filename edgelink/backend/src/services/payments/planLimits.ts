/**
 * Plan Limits Service - Defines feature access for each subscription plan
 */

import type { Env } from '../../types';

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
  'pro': {
    maxLinks: -1, // Unlimited
    maxClicksPerLink: -1, // Unlimited
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
  static async canCreateLink(env: Env, userId: string, plan: string): Promise<{ allowed: boolean; reason?: string }> {
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

    if (result && result.count >= limits.maxLinks) {
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
