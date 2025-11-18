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
  };
  usage: {
    links: number;
    monthlyClicks: number;
    customDomains: number;
    groups: number;
    apiKeys: number;
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
}

export async function handleGetUsage(
  request: Request,
  env: Env,
  userId: string,
  plan: string
): Promise<Response> {
  try {
    const limits = PlanLimitsService.getLimits(plan);

    // Get current link count
    const linksResult = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM links
      WHERE user_id = ?
    `).bind(userId).first() as { count: number } | null;

    // Get monthly clicks (all links created this month)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const clicksResult = await env.DB.prepare(`
      SELECT COALESCE(SUM(click_count), 0) as total_clicks
      FROM links
      WHERE user_id = ?
    `).bind(userId).first() as { total_clicks: number } | null;

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

    // Get API keys count
    const apiKeysResult = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM api_keys
      WHERE user_id = ? AND revoked_at IS NULL
    `).bind(userId).first() as { count: number } | null;

    // Calculate reset date (first day of next month)
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const usageData: UsageData = {
      plan,
      limits: {
        maxLinks: limits.maxLinks,
        maxClicksPerMonth: limits.maxClicksPerMonth,
        maxCustomDomains: limits.maxCustomDomains,
        maxGroups: limits.maxGroups,
      },
      usage: {
        links: linksResult?.count || 0,
        monthlyClicks: clicksResult?.total_clicks || 0,
        customDomains: domainsResult?.count || 0,
        groups: groupsResult?.count || 0,
        apiKeys: apiKeysResult?.count || 0,
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
