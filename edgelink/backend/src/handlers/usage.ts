/**
 * Usage Handler - Returns user's current usage vs plan limits
 */

import type { Env } from '../types';
import { PlanLimitsService, PLAN_LIMITS } from '../services/payments/planLimits';

interface UsageData {
  plan: string;
  limits: {
    maxLinks: number;
    maxClicksPerMonth: number;
    maxCustomDomains: number;
    maxGroups: number;
    maxApiCallsPerDay: number;
  };
  usage: {
    links: number;
    monthlyClicks: number;
    customDomains: number;
    groups: number;
    apiKeys: number;
    apiCallsToday: number;
  };
  features: {
    analytics: boolean;
    apiAccess: boolean;
    linkExpiration: boolean;
    passwordProtection: boolean;
    customSlug: boolean;
    editSlug: boolean;
    editDestination: boolean;
    qrCode: boolean;
    geoRouting: boolean;
    deviceRouting: boolean;
    referrerRouting: boolean;
    webhooks: boolean;
    bulkOperations: boolean;
    groups: boolean;
  };
  resetDate: string;
  subscription?: {
    status: string;
    periodStart: string;
    periodEnd: string;
    cancelAtPeriodEnd: boolean;
  };
}

export async function handleGetUsage(
  request: Request,
  env: Env,
  userId: string,
  plan: string
): Promise<Response> {
  try {
    const limits = PlanLimitsService.getLimits(plan);

    // Get user subscription data
    const userResult = await env.DB.prepare(`
      SELECT
        subscription_status,
        subscription_current_period_start,
        subscription_current_period_end,
        subscription_cancel_at_period_end,
        lifetime_access
      FROM users
      WHERE user_id = ?
    `).bind(userId).first() as {
      subscription_status: string | null;
      subscription_current_period_start: number | null;
      subscription_current_period_end: number | null;
      subscription_cancel_at_period_end: number | null;
      lifetime_access: number | null;
    } | null;

    // Get current link count
    const linksResult = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM links
      WHERE user_id = ?
    `).bind(userId).first() as { count: number } | null;

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1; // 1-12

    // Get monthly clicks from persistent tracking table
    const clicksResult = await env.DB.prepare(`
      SELECT total_clicks
      FROM user_monthly_stats
      WHERE user_id = ? AND year = ? AND month = ?
    `).bind(userId, year, month).first() as { total_clicks: number } | null;

    // Get custom domains count
    const domainsResult = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM custom_domains
      WHERE user_id = ?
    `).bind(userId).first() as { count: number } | null;

    // Get groups count
    const groupsResult = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM link_groups
      WHERE user_id = ? AND archived_at IS NULL
    `).bind(userId).first() as { count: number } | null;

    // Get API keys count (keys are deleted when revoked, not marked)
    const apiKeysResult = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM api_keys
      WHERE user_id = ?
    `).bind(userId).first() as { count: number } | null;

    // Get API rate limit usage from KV
    const rateLimitKey = `ratelimit:${userId}`;
    let apiCallsToday = 0;
    try {
      const rateLimitStr = await env.LINKS_KV.get(rateLimitKey);
      apiCallsToday = rateLimitStr ? parseInt(rateLimitStr, 10) : 0;
    } catch (error) {
      console.error('Failed to get rate limit from KV:', error);
    }

    // Calculate reset date based on subscription period for Pro users
    let resetDate: Date;

    if (plan === 'pro' && userResult?.subscription_current_period_end) {
      // Pro users: reset date is end of current billing period
      resetDate = new Date(userResult.subscription_current_period_end * 1000);
    } else if (userResult?.lifetime_access === 1) {
      // Lifetime users: no reset needed, set far future date
      resetDate = new Date('2099-12-31');
    } else {
      // Free users: reset on first of next month
      resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    // Get API rate limit for user's plan (from ratelimit.ts)
    const apiRateLimits: Record<string, number> = {
      'free': 100,
      'pro': 5000,
      'lifetime': 5000
    };
    const maxApiCallsPerDay = apiRateLimits[plan] || 100;

    const usageData: UsageData = {
      plan: userResult?.lifetime_access === 1 ? 'lifetime' : plan,
      limits: {
        maxLinks: limits.maxLinks,
        maxClicksPerMonth: limits.maxClicksPerMonth,
        maxCustomDomains: limits.maxCustomDomains,
        maxGroups: limits.maxGroups,
        maxApiCallsPerDay: maxApiCallsPerDay,
      },
      usage: {
        links: linksResult?.count || 0,
        monthlyClicks: clicksResult?.total_clicks || 0,
        customDomains: domainsResult?.count || 0,
        groups: groupsResult?.count || 0,
        apiKeys: apiKeysResult?.count || 0,
        apiCallsToday: apiCallsToday,
      },
      features: {
        analytics: limits.analytics,
        apiAccess: limits.apiAccess,
        linkExpiration: limits.linkExpiration,
        passwordProtection: limits.passwordProtection,
        customSlug: limits.customSlug,
        editSlug: limits.editSlug,
        editDestination: limits.editDestination,
        qrCode: limits.qrCode,
        geoRouting: limits.geoRouting,
        deviceRouting: limits.deviceRouting,
        referrerRouting: limits.referrerRouting,
        webhooks: limits.webhooks,
        bulkOperations: limits.bulkOperations,
        groups: limits.groups,
      },
      resetDate: resetDate.toISOString(),
    };

    // Add subscription info for Pro users
    if (plan === 'pro' && userResult) {
      usageData.subscription = {
        status: userResult.subscription_status || 'unknown',
        periodStart: userResult.subscription_current_period_start
          ? new Date(userResult.subscription_current_period_start * 1000).toISOString()
          : '',
        periodEnd: userResult.subscription_current_period_end
          ? new Date(userResult.subscription_current_period_end * 1000).toISOString()
          : '',
        cancelAtPeriodEnd: userResult.subscription_cancel_at_period_end === 1,
      };
    }

    return new Response(JSON.stringify(usageData), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Usage fetch error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch usage data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
