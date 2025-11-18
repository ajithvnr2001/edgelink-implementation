/**
 * Group Analytics Handler - Analytics for link groups
 * Provides aggregated analytics for all links in a group
 */

import type { Env } from '../types';
import { PlanLimitsService } from '../services/payments/planLimits';

/**
 * GET /api/groups/:groupId/analytics - Get analytics for a group
 */
export async function handleGetGroupAnalytics(
  env: Env,
  userId: string,
  groupId: string,
  timeRange: '7d' | '30d'
): Promise<Response> {
  try {
    // Verify group ownership
    const group = await env.DB.prepare(`
      SELECT * FROM link_groups
      WHERE group_id = ? AND user_id = ?
    `).bind(groupId, userId).first();

    if (!group) {
      return new Response(
        JSON.stringify({
          error: 'Group not found',
          code: 'NOT_FOUND'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get all link slugs in the group
    const linksResult = await env.DB.prepare(`
      SELECT slug FROM links WHERE group_id = ? AND user_id = ?
    `).bind(groupId, userId).all();

    const slugs = (linksResult.results || []).map((l: { slug: string }) => l.slug);

    if (slugs.length === 0) {
      return new Response(
        JSON.stringify({
          group,
          total_clicks: 0,
          time_series: [],
          countries: [],
          devices: [],
          browsers: [],
          referrers: [],
          top_links: []
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Calculate date range
    const days = timeRange === '7d' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();

    const placeholders = slugs.map(() => '?').join(',');

    // Get total clicks
    const totalResult = await env.DB.prepare(`
      SELECT COUNT(*) as total FROM analytics_events
      WHERE slug IN (${placeholders}) AND timestamp >= ?
    `).bind(...slugs, startDateStr).first() as { total: number } | null;

    // Get time series data
    const timeSeriesResult = await env.DB.prepare(`
      SELECT DATE(timestamp) as date, COUNT(*) as clicks
      FROM analytics_events
      WHERE slug IN (${placeholders}) AND timestamp >= ?
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `).bind(...slugs, startDateStr).all();

    // Get country breakdown
    const countriesResult = await env.DB.prepare(`
      SELECT country, COUNT(*) as clicks
      FROM analytics_events
      WHERE slug IN (${placeholders}) AND timestamp >= ? AND country IS NOT NULL
      GROUP BY country
      ORDER BY clicks DESC
      LIMIT 10
    `).bind(...slugs, startDateStr).all();

    // Get device breakdown
    const devicesResult = await env.DB.prepare(`
      SELECT device, COUNT(*) as clicks
      FROM analytics_events
      WHERE slug IN (${placeholders}) AND timestamp >= ?
      GROUP BY device
      ORDER BY clicks DESC
    `).bind(...slugs, startDateStr).all();

    // Get browser breakdown
    const browsersResult = await env.DB.prepare(`
      SELECT browser, COUNT(*) as clicks
      FROM analytics_events
      WHERE slug IN (${placeholders}) AND timestamp >= ? AND browser IS NOT NULL
      GROUP BY browser
      ORDER BY clicks DESC
      LIMIT 10
    `).bind(...slugs, startDateStr).all();

    // Get top referrers
    const referrersResult = await env.DB.prepare(`
      SELECT referrer, COUNT(*) as clicks
      FROM analytics_events
      WHERE slug IN (${placeholders}) AND timestamp >= ? AND referrer IS NOT NULL AND referrer != ''
      GROUP BY referrer
      ORDER BY clicks DESC
      LIMIT 10
    `).bind(...slugs, startDateStr).all();

    // Get top performing links in group
    const topLinksResult = await env.DB.prepare(`
      SELECT slug, COUNT(*) as clicks
      FROM analytics_events
      WHERE slug IN (${placeholders}) AND timestamp >= ?
      GROUP BY slug
      ORDER BY clicks DESC
      LIMIT 10
    `).bind(...slugs, startDateStr).all();

    return new Response(
      JSON.stringify({
        group,
        total_clicks: totalResult?.total || 0,
        time_series: timeSeriesResult.results || [],
        countries: countriesResult.results || [],
        devices: devicesResult.results || [],
        browsers: browsersResult.results || [],
        referrers: referrersResult.results || [],
        top_links: topLinksResult.results || [],
        time_range: timeRange
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Get group analytics error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch group analytics',
        code: 'ANALYTICS_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * GET /api/analytics/overview - Get overall analytics for all user's links
 */
export async function handleGetOverallAnalytics(
  env: Env,
  userId: string,
  plan: string,
  timeRange: '7d' | '30d'
): Promise<Response> {
  try {
    // Check if user has analytics access
    if (!PlanLimitsService.hasFeatureAccess(plan, 'analytics')) {
      return new Response(
        JSON.stringify({
          error: 'Advanced analytics is a Pro feature. Upgrade to Pro for detailed insights.',
          code: 'PRO_REQUIRED'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Calculate date range
    const days = timeRange === '7d' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();

    // Get all user's link slugs
    const linksResult = await env.DB.prepare(`
      SELECT slug FROM links WHERE user_id = ?
    `).bind(userId).all();

    const slugs = (linksResult.results || []).map((l: { slug: string }) => l.slug);

    if (slugs.length === 0) {
      return new Response(
        JSON.stringify({
          total_clicks: 0,
          total_links: 0,
          time_series: [],
          countries: [],
          devices: [],
          browsers: [],
          referrers: [],
          top_links: [],
          groups_breakdown: []
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const placeholders = slugs.map(() => '?').join(',');

    // Get total clicks
    const totalResult = await env.DB.prepare(`
      SELECT COUNT(*) as total FROM analytics_events
      WHERE slug IN (${placeholders}) AND timestamp >= ?
    `).bind(...slugs, startDateStr).first() as { total: number } | null;

    // Get time series data
    const timeSeriesResult = await env.DB.prepare(`
      SELECT DATE(timestamp) as date, COUNT(*) as clicks
      FROM analytics_events
      WHERE slug IN (${placeholders}) AND timestamp >= ?
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `).bind(...slugs, startDateStr).all();

    // Get country breakdown
    const countriesResult = await env.DB.prepare(`
      SELECT country, COUNT(*) as clicks
      FROM analytics_events
      WHERE slug IN (${placeholders}) AND timestamp >= ? AND country IS NOT NULL
      GROUP BY country
      ORDER BY clicks DESC
      LIMIT 10
    `).bind(...slugs, startDateStr).all();

    // Get device breakdown
    const devicesResult = await env.DB.prepare(`
      SELECT device, COUNT(*) as clicks
      FROM analytics_events
      WHERE slug IN (${placeholders}) AND timestamp >= ?
      GROUP BY device
      ORDER BY clicks DESC
    `).bind(...slugs, startDateStr).all();

    // Get browser breakdown
    const browsersResult = await env.DB.prepare(`
      SELECT browser, COUNT(*) as clicks
      FROM analytics_events
      WHERE slug IN (${placeholders}) AND timestamp >= ? AND browser IS NOT NULL
      GROUP BY browser
      ORDER BY clicks DESC
      LIMIT 10
    `).bind(...slugs, startDateStr).all();

    // Get top referrers
    const referrersResult = await env.DB.prepare(`
      SELECT referrer, COUNT(*) as clicks
      FROM analytics_events
      WHERE slug IN (${placeholders}) AND timestamp >= ? AND referrer IS NOT NULL AND referrer != ''
      GROUP BY referrer
      ORDER BY clicks DESC
      LIMIT 10
    `).bind(...slugs, startDateStr).all();

    // Get top performing links
    const topLinksResult = await env.DB.prepare(`
      SELECT slug, COUNT(*) as clicks
      FROM analytics_events
      WHERE slug IN (${placeholders}) AND timestamp >= ?
      GROUP BY slug
      ORDER BY clicks DESC
      LIMIT 10
    `).bind(...slugs, startDateStr).all();

    // Get breakdown by groups
    const groupsBreakdownResult = await env.DB.prepare(`
      SELECT
        COALESCE(g.name, 'Ungrouped') as group_name,
        g.group_id,
        g.color,
        COUNT(ae.event_id) as clicks
      FROM links l
      LEFT JOIN link_groups g ON l.group_id = g.group_id
      LEFT JOIN analytics_events ae ON l.slug = ae.slug AND ae.timestamp >= ?
      WHERE l.user_id = ?
      GROUP BY COALESCE(g.group_id, 'ungrouped')
      ORDER BY clicks DESC
    `).bind(startDateStr, userId).all();

    return new Response(
      JSON.stringify({
        total_clicks: totalResult?.total || 0,
        total_links: slugs.length,
        time_series: timeSeriesResult.results || [],
        countries: countriesResult.results || [],
        devices: devicesResult.results || [],
        browsers: browsersResult.results || [],
        referrers: referrersResult.results || [],
        top_links: topLinksResult.results || [],
        groups_breakdown: groupsBreakdownResult.results || [],
        time_range: timeRange
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Get overall analytics error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch overall analytics',
        code: 'ANALYTICS_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * GET /api/analytics/groups/compare - Compare analytics between groups
 */
export async function handleCompareGroups(
  request: Request,
  env: Env,
  userId: string,
  plan: string
): Promise<Response> {
  try {
    // Check if user has analytics access
    if (!PlanLimitsService.hasFeatureAccess(plan, 'analytics')) {
      return new Response(
        JSON.stringify({
          error: 'Advanced analytics is a Pro feature.',
          code: 'PRO_REQUIRED'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const url = new URL(request.url);
    const groupIds = url.searchParams.get('groups')?.split(',') || [];
    const timeRange = (url.searchParams.get('range') as '7d' | '30d') || '7d';

    if (groupIds.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'At least one group ID is required',
          code: 'GROUPS_REQUIRED'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Calculate date range
    const days = timeRange === '7d' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();

    const comparisons = [];

    for (const groupId of groupIds) {
      // Verify group ownership
      const group = await env.DB.prepare(`
        SELECT * FROM link_groups
        WHERE group_id = ? AND user_id = ?
      `).bind(groupId, userId).first();

      if (!group) continue;

      // Get slugs in group
      const linksResult = await env.DB.prepare(`
        SELECT slug FROM links WHERE group_id = ?
      `).bind(groupId).all();

      const slugs = (linksResult.results || []).map((l: { slug: string }) => l.slug);

      if (slugs.length === 0) {
        comparisons.push({
          group,
          total_clicks: 0,
          link_count: 0
        });
        continue;
      }

      const placeholders = slugs.map(() => '?').join(',');

      // Get total clicks for group
      const totalResult = await env.DB.prepare(`
        SELECT COUNT(*) as total FROM analytics_events
        WHERE slug IN (${placeholders}) AND timestamp >= ?
      `).bind(...slugs, startDateStr).first() as { total: number } | null;

      comparisons.push({
        group,
        total_clicks: totalResult?.total || 0,
        link_count: slugs.length
      });
    }

    return new Response(
      JSON.stringify({
        comparisons,
        time_range: timeRange
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Compare groups error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to compare groups',
        code: 'COMPARE_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
