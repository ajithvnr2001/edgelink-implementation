/**
 * Analytics Handler
 * Week 2: Real-time analytics queries from Analytics Engine
 * Based on PRD Section 11 (Week 2)
 */

import type { Env } from '../types';

/**
 * Handle GET /api/analytics/:slug
 * Get comprehensive analytics for a link
 *
 * Returns:
 * - Total clicks
 * - Clicks over time (7/30 days)
 * - Geographic distribution
 * - Device breakdown
 * - Browser breakdown
 * - OS breakdown
 * - Top referrers
 */
export async function handleGetAnalytics(
  env: Env,
  userId: string,
  slug: string,
  timeRange: '7d' | '30d' = '7d'
): Promise<Response> {
  try {
    // Verify ownership
    const link = await env.DB.prepare(`
      SELECT user_id, click_count, created_at, destination
      FROM links
      WHERE slug = ?
    `).bind(slug).first();

    if (!link) {
      // Check anonymous links
      const anonLink = await env.DB.prepare(`
        SELECT 'anonymous' as user_id, click_count, created_at, destination
        FROM anonymous_links
        WHERE slug = ?
      `).bind(slug).first();

      if (!anonLink) {
        return new Response(
          JSON.stringify({
            error: 'Link not found',
            code: 'NOT_FOUND'
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Return limited analytics for anonymous links
      return new Response(
        JSON.stringify({
          slug,
          total_clicks: anonLink.click_count,
          created_at: anonLink.created_at,
          destination: anonLink.destination,
          message: 'Sign up for detailed analytics'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (link.user_id !== userId) {
      return new Response(
        JSON.stringify({
          error: 'Access denied',
          code: 'FORBIDDEN'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Calculate time range
    const now = Date.now();
    const daysInMs = timeRange === '7d' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    const startTime = now - daysInMs;

    // Query Analytics Engine
    // Note: In production, use Analytics Engine SQL API
    // For MVP, we'll aggregate from D1 and provide structure for Analytics Engine

    // Get time series data (clicks per day)
    const timeSeriesData = await getTimeSeriesData(env, slug, startTime, now);

    // Get geographic distribution
    const geoData = await getGeoData(env, slug, startTime);

    // Get device breakdown
    const deviceData = await getDeviceData(env, slug, startTime);

    // Get browser breakdown
    const browserData = await getBrowserData(env, slug, startTime);

    // Get OS breakdown
    const osData = await getOSData(env, slug, startTime);

    // Get top referrers
    const referrerData = await getReferrerData(env, slug, startTime);

    return new Response(
      JSON.stringify({
        slug,
        destination: link.destination,
        total_clicks: link.click_count,
        created_at: link.created_at,
        time_range: timeRange,
        analytics: {
          time_series: timeSeriesData,
          geographic: geoData,
          devices: deviceData,
          browsers: browserData,
          operating_systems: osData,
          referrers: referrerData
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch analytics',
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
 * Get time series data (clicks per day)
 */
async function getTimeSeriesData(
  env: Env,
  slug: string,
  startTime: number,
  endTime: number
): Promise<Array<{ date: string; clicks: number }>> {
  // In production, query Analytics Engine with SQL:
  // SELECT DATE(timestamp) as date, COUNT(*) as clicks
  // FROM analytics WHERE slug = ? AND timestamp >= ? AND timestamp <= ?
  // GROUP BY date ORDER BY date

  // For MVP, we'll create sample structure
  // In real implementation, replace with Analytics Engine query
  const days = Math.floor((endTime - startTime) / (24 * 60 * 60 * 1000));
  const data: Array<{ date: string; clicks: number }> = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(startTime + i * 24 * 60 * 60 * 1000);
    data.push({
      date: date.toISOString().split('T')[0],
      clicks: 0 // Will be populated by Analytics Engine
    });
  }

  return data;
}

/**
 * Get geographic distribution
 */
async function getGeoData(
  env: Env,
  slug: string,
  startTime: number
): Promise<Array<{ country: string; country_name: string; clicks: number }>> {
  // In production, query Analytics Engine:
  // SELECT country, COUNT(*) as clicks
  // FROM analytics WHERE slug = ? AND timestamp >= ?
  // GROUP BY country ORDER BY clicks DESC LIMIT 10

  return [
    // Sample structure - will be replaced with real data
    { country: 'US', country_name: 'United States', clicks: 0 },
    { country: 'IN', country_name: 'India', clicks: 0 },
    { country: 'GB', country_name: 'United Kingdom', clicks: 0 }
  ];
}

/**
 * Get device breakdown
 */
async function getDeviceData(
  env: Env,
  slug: string,
  startTime: number
): Promise<Array<{ device: string; clicks: number; percentage: number }>> {
  // In production, query Analytics Engine:
  // SELECT device, COUNT(*) as clicks
  // FROM analytics WHERE slug = ? AND timestamp >= ?
  // GROUP BY device

  return [
    { device: 'mobile', clicks: 0, percentage: 0 },
    { device: 'desktop', clicks: 0, percentage: 0 },
    { device: 'tablet', clicks: 0, percentage: 0 }
  ];
}

/**
 * Get browser breakdown
 */
async function getBrowserData(
  env: Env,
  slug: string,
  startTime: number
): Promise<Array<{ browser: string; clicks: number; percentage: number }>> {
  // In production, query Analytics Engine:
  // SELECT browser, COUNT(*) as clicks
  // FROM analytics WHERE slug = ? AND timestamp >= ?
  // GROUP BY browser ORDER BY clicks DESC

  return [
    { browser: 'Chrome', clicks: 0, percentage: 0 },
    { browser: 'Safari', clicks: 0, percentage: 0 },
    { browser: 'Firefox', clicks: 0, percentage: 0 },
    { browser: 'Edge', clicks: 0, percentage: 0 },
    { browser: 'Other', clicks: 0, percentage: 0 }
  ];
}

/**
 * Get OS breakdown
 */
async function getOSData(
  env: Env,
  slug: string,
  startTime: number
): Promise<Array<{ os: string; clicks: number; percentage: number }>> {
  // In production, query Analytics Engine:
  // SELECT os, COUNT(*) as clicks
  // FROM analytics WHERE slug = ? AND timestamp >= ?
  // GROUP BY os ORDER BY clicks DESC

  return [
    { os: 'Windows', clicks: 0, percentage: 0 },
    { os: 'macOS', clicks: 0, percentage: 0 },
    { os: 'iOS', clicks: 0, percentage: 0 },
    { os: 'Android', clicks: 0, percentage: 0 },
    { os: 'Linux', clicks: 0, percentage: 0 },
    { os: 'Other', clicks: 0, percentage: 0 }
  ];
}

/**
 * Get top referrers
 */
async function getReferrerData(
  env: Env,
  slug: string,
  startTime: number
): Promise<Array<{ referrer: string; clicks: number; percentage: number }>> {
  // In production, query Analytics Engine:
  // SELECT referrer, COUNT(*) as clicks
  // FROM analytics WHERE slug = ? AND timestamp >= ?
  // GROUP BY referrer ORDER BY clicks DESC LIMIT 10

  return [
    { referrer: 'direct', clicks: 0, percentage: 0 },
    { referrer: 'twitter.com', clicks: 0, percentage: 0 },
    { referrer: 'facebook.com', clicks: 0, percentage: 0 },
    { referrer: 'linkedin.com', clicks: 0, percentage: 0 },
    { referrer: 'google.com', clicks: 0, percentage: 0 }
  ];
}

/**
 * Handle GET /api/analytics/summary
 * Get user's overall analytics summary
 */
export async function handleGetAnalyticsSummary(
  env: Env,
  userId: string
): Promise<Response> {
  try {
    // Get user's total stats
    const stats = await env.DB.prepare(`
      SELECT
        COUNT(*) as total_links,
        SUM(click_count) as total_clicks,
        MAX(click_count) as max_clicks,
        AVG(click_count) as avg_clicks
      FROM links
      WHERE user_id = ?
    `).bind(userId).first();

    // Get user plan
    const user = await env.DB.prepare(`
      SELECT plan, created_at FROM users WHERE user_id = ?
    `).bind(userId).first();

    if (!user) {
      return new Response(
        JSON.stringify({
          error: 'User not found',
          code: 'NOT_FOUND'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Calculate usage limits
    const limits = user.plan === 'pro'
      ? { links: 5000, api_calls: 10000, clicks: 500000 }
      : { links: 500, api_calls: 1000, clicks: 50000 };

    return new Response(
      JSON.stringify({
        user_id: userId,
        plan: user.plan,
        member_since: user.created_at,
        stats: {
          total_links: stats?.total_links || 0,
          total_clicks: stats?.total_clicks || 0,
          max_clicks: stats?.max_clicks || 0,
          avg_clicks: Math.round(stats?.avg_clicks || 0)
        },
        limits,
        usage_percentage: {
          links: Math.round(((stats?.total_links || 0) / limits.links) * 100),
          clicks: Math.round(((stats?.total_clicks || 0) / limits.clicks) * 100)
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Analytics summary error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch analytics summary',
        code: 'SUMMARY_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
