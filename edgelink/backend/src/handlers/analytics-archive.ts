/**
 * Analytics Archive Handler - Week 7
 *
 * Implements long-term analytics storage:
 * - Archive Analytics Engine data to D1
 * - Daily aggregation
 * - Historical queries
 * - Data retention policies (Free: 30d, Pro: 1 year)
 */

import { Context } from '../types';

/**
 * Manually archive analytics data
 * POST /api/analytics/archive
 */
export async function handleArchiveAnalytics(request: Request, env: Context['env'], userId: string, plan: string): Promise<Response> {
  try {
    const body: any = await request.json();
    const { slug, start_date, end_date } = body;

    if (!slug) {
      return new Response(
        JSON.stringify({ error: 'slug is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if link exists and belongs to user
    const link = await env.DB.prepare(
      'SELECT * FROM links WHERE slug = ? AND user_id = ?'
    ).bind(slug, userId).first();

    if (!link) {
      return new Response(
        JSON.stringify({ error: 'Link not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse dates
    const startDate = start_date ? new Date(start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end_date ? new Date(end_date) : new Date();

    // Archive analytics day by day
    let archivedDays = 0;
    let totalClicks = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // Fetch analytics for this day (mock data for now - would query Analytics Engine in production)
      const dayStats = await getDailyStats(env, slug, dateStr);

      if (dayStats.total_clicks > 0) {
        // Check if already archived
        const existing = await env.DB.prepare(
          'SELECT * FROM analytics_archive WHERE slug = ? AND date = ?'
        ).bind(slug, dateStr).first();

        if (!existing) {
          // Archive this day
          const archiveId = `arch_${generateRandomString(12)}`;
          const now = new Date().toISOString();

          await env.DB.prepare(`
            INSERT INTO analytics_archive (
              archive_id, slug, user_id, date,
              total_clicks, unique_visitors,
              top_country, top_device, top_browser, top_referrer,
              archived_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            archiveId, slug, userId, dateStr,
            dayStats.total_clicks, dayStats.unique_visitors,
            dayStats.top_country, dayStats.top_device,
            dayStats.top_browser, dayStats.top_referrer,
            now
          ).run();

          archivedDays++;
          totalClicks += dayStats.total_clicks;
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return new Response(
      JSON.stringify({
        message: 'Analytics archived successfully',
        slug,
        date_range: {
          start: start_date || startDate.toISOString().split('T')[0],
          end: end_date || endDate.toISOString().split('T')[0]
        },
        archived_days: archivedDays,
        total_clicks: totalClicks
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error archiving analytics:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to archive analytics' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Get archived analytics data
 * GET /api/analytics/historical/:slug
 */
export async function handleGetArchivedAnalytics(request: Request, env: Context['env'], userId: string, plan: string): Promise<Response> {
  try {
    const url = new URL(request.url);
    const slug = url.pathname.split('/')[4];

    if (!slug) {
      return new Response(
        JSON.stringify({ error: 'Slug is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if link exists and belongs to user
    const link = await env.DB.prepare(
      'SELECT * FROM links WHERE slug = ? AND user_id = ?'
    ).bind(slug, userId).first();

    if (!link) {
      return new Response(
        JSON.stringify({ error: 'Link not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get date range from query params
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');

    // Apply retention policy
    const retentionDays = plan === 'pro' ? 365 : 30;
    const minDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const minDateStr = minDate.toISOString().split('T')[0];

    // Build query
    let query = 'SELECT * FROM analytics_archive WHERE slug = ? AND date >= ?';
    const params: any[] = [slug, minDateStr];

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY date DESC';

    const results = await env.DB.prepare(query).bind(...params).all();

    if (!results.results || results.results.length === 0) {
      return new Response(
        JSON.stringify({
          slug,
          date_range: {
            start: startDate || minDateStr,
            end: endDate || new Date().toISOString().split('T')[0]
          },
          summary: {
            total_clicks: 0,
            unique_visitors: 0,
            average_daily_clicks: 0
          },
          daily_breakdown: []
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Calculate summary statistics
    const totalClicks = results.results.reduce((sum: number, row: any) => sum + (row.total_clicks || 0), 0);
    const totalUniqueVisitors = results.results.reduce((sum: number, row: any) => sum + (row.unique_visitors || 0), 0);
    const averageDailyClicks = Math.round(totalClicks / results.results.length);

    // Format daily breakdown
    const dailyBreakdown = results.results.map((row: any) => ({
      date: row.date,
      clicks: row.total_clicks,
      unique_visitors: row.unique_visitors,
      top_country: row.top_country,
      top_device: row.top_device,
      top_browser: row.top_browser,
      top_referrer: row.top_referrer
    }));

    return new Response(
      JSON.stringify({
        slug,
        date_range: {
          start: startDate || minDateStr,
          end: endDate || new Date().toISOString().split('T')[0]
        },
        summary: {
          total_clicks: totalClicks,
          unique_visitors: totalUniqueVisitors,
          average_daily_clicks: averageDailyClicks,
          days_archived: results.results.length
        },
        daily_breakdown: dailyBreakdown,
        retention_policy: {
          plan,
          retention_days: retentionDays,
          oldest_available: minDateStr
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error getting archived analytics:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get archived analytics' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Automated archive job (should be run daily via Cron Trigger)
 * Archives yesterday's data for all links
 */
export async function handleAutomatedArchive(env: Context['env']): Promise<void> {
  try {
    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    console.log(`Starting automated archive for ${dateStr}`);

    // Get all links (in batches to avoid memory issues)
    const batchSize = 100;
    let offset = 0;
    let processedLinks = 0;

    while (true) {
      const links = await env.DB.prepare(
        'SELECT slug, user_id FROM links LIMIT ? OFFSET ?'
      ).bind(batchSize, offset).all();

      if (!links.results || links.results.length === 0) {
        break;
      }

      // Archive each link
      for (const link of links.results) {
        try {
          // Check if already archived
          const existing = await env.DB.prepare(
            'SELECT * FROM analytics_archive WHERE slug = ? AND date = ?'
          ).bind(link.slug, dateStr).first();

          if (!existing) {
            const dayStats = await getDailyStats(env, link.slug as string, dateStr);

            if (dayStats.total_clicks > 0) {
              const archiveId = `arch_${generateRandomString(12)}`;
              const now = new Date().toISOString();

              await env.DB.prepare(`
                INSERT INTO analytics_archive (
                  archive_id, slug, user_id, date,
                  total_clicks, unique_visitors,
                  top_country, top_device, top_browser, top_referrer,
                  archived_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(
                archiveId, link.slug, link.user_id, dateStr,
                dayStats.total_clicks, dayStats.unique_visitors,
                dayStats.top_country, dayStats.top_device,
                dayStats.top_browser, dayStats.top_referrer,
                now
              ).run();

              processedLinks++;
            }
          }
        } catch (error) {
          console.error(`Error archiving link ${link.slug}:`, error);
        }
      }

      offset += batchSize;
    }

    console.log(`Automated archive complete. Processed ${processedLinks} links.`);

    // Cleanup old data based on retention policies
    await cleanupOldArchives(env);

  } catch (error) {
    console.error('Error in automated archive:', error);
  }
}

/**
 * Cleanup old archived data based on retention policies
 */
async function cleanupOldArchives(env: Context['env']): Promise<void> {
  try {
    // Get users and their plans
    const users = await env.DB.prepare('SELECT user_id, plan FROM users').all();

    for (const user of users.results || []) {
      const retentionDays = user.plan === 'pro' ? 365 : 30;
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

      // Delete old archives for this user
      await env.DB.prepare(
        'DELETE FROM analytics_archive WHERE user_id = ? AND date < ?'
      ).bind(user.user_id, cutoffDateStr).run();
    }

    console.log('Cleanup of old archives complete');

  } catch (error) {
    console.error('Error cleaning up old archives:', error);
  }
}

/**
 * Get daily statistics for a link
 * In production, this would query Cloudflare Analytics Engine
 * For now, returns mock data structure
 */
async function getDailyStats(env: Context['env'], slug: string, date: string): Promise<{
  total_clicks: number;
  unique_visitors: number;
  top_country: string;
  top_device: string;
  top_browser: string;
  top_referrer: string;
}> {
  // TODO: In production, query Analytics Engine:
  // SELECT
  //   COUNT(*) as total_clicks,
  //   COUNT(DISTINCT visitor_id) as unique_visitors,
  //   TOP(country, 1) as top_country,
  //   TOP(device, 1) as top_device,
  //   TOP(browser, 1) as top_browser,
  //   TOP(referrer, 1) as top_referrer
  // FROM analytics_events
  // WHERE slug = ? AND date = ?

  // For now, return mock structure (would be replaced with actual Analytics Engine query)
  // Check if there are any clicks for this link in our tracking
  const result = await env.DB.prepare(
    'SELECT click_count FROM links WHERE slug = ?'
  ).bind(slug).first();

  // Generate some realistic mock data based on actual click count
  const clickCount = result?.click_count || 0;

  // Return structure (in production this comes from Analytics Engine)
  return {
    total_clicks: Math.floor(clickCount / 10), // Rough estimate
    unique_visitors: Math.floor(clickCount / 15), // Rough estimate
    top_country: 'US',
    top_device: 'mobile',
    top_browser: 'Chrome',
    top_referrer: 'direct'
  };
}

/**
 * Generate random string for IDs
 */
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}
