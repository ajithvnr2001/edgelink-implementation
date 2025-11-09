/**
 * Analytics Export Handler (Week 5)
 * Export analytics data in CSV/JSON formats
 */

import type { Env } from '../types';

/**
 * Handle GET /api/export/analytics/:slug
 * Export analytics data for a specific link
 */
export async function handleExportAnalytics(
  env: Env,
  userId: string,
  slug: string,
  format: 'csv' | 'json',
  timeRange: '7d' | '30d' | '90d' | 'all'
): Promise<Response> {
  try {
    // Verify ownership
    const link = await env.DB.prepare(`
      SELECT slug, destination, user_id, created_at, click_count
      FROM links
      WHERE slug = ? AND user_id = ?
    `).bind(slug, userId).first();

    if (!link) {
      return new Response(
        JSON.stringify({
          error: 'Link not found or access denied',
          code: 'NOT_FOUND'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Calculate date range
    const now = Date.now();
    let startDate: number;
    switch (timeRange) {
      case '7d':
        startDate = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = now - (30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = now - (90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        startDate = new Date(link.created_at as string).getTime();
        break;
    }

    // Fetch analytics data (mock data for now, replace with Analytics Engine queries)
    const analyticsData = await fetchAnalyticsData(env, slug, startDate, now);

    // Format response based on format
    if (format === 'csv') {
      const csv = convertToCSV(analyticsData, link);
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="analytics-${slug}-${timeRange}.csv"`
        }
      });
    } else {
      const jsonData = {
        link: {
          slug: link.slug,
          destination: link.destination,
          created_at: link.created_at,
          total_clicks: link.click_count
        },
        time_range: timeRange,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(now).toISOString(),
        analytics: analyticsData,
        exported_at: new Date().toISOString()
      };

      return new Response(JSON.stringify(jsonData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="analytics-${slug}-${timeRange}.json"`
        }
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to export analytics',
        code: 'EXPORT_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle GET /api/export/links
 * Export all user links in CSV/JSON format
 */
export async function handleExportLinks(
  env: Env,
  userId: string,
  format: 'csv' | 'json'
): Promise<Response> {
  try {
    // Fetch all user links
    const result = await env.DB.prepare(`
      SELECT
        slug,
        destination,
        custom_domain,
        created_at,
        updated_at,
        expires_at,
        max_clicks,
        click_count,
        password_hash,
        utm_params
      FROM links
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all();

    const links = result.results;

    if (format === 'csv') {
      const csv = convertLinksToCSV(links);
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="links-export-${Date.now()}.csv"`
        }
      });
    } else {
      const jsonData = {
        user_id: userId,
        total_links: links.length,
        exported_at: new Date().toISOString(),
        links: links.map(link => ({
          ...link,
          password_protected: !!link.password_hash,
          password_hash: undefined // Don't export password hashes
        }))
      };

      return new Response(JSON.stringify(jsonData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="links-export-${Date.now()}.json"`
        }
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to export links',
        code: 'EXPORT_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Fetch analytics data for a link
 * TODO: Replace with real Analytics Engine queries
 */
async function fetchAnalyticsData(
  env: Env,
  slug: string,
  startDate: number,
  endDate: number
): Promise<any> {
  // This is mock data structure
  // In production, query from Analytics Engine
  return {
    summary: {
      total_clicks: 0,
      unique_visitors: 0,
      avg_clicks_per_day: 0
    },
    time_series: [],
    geographic: [],
    devices: [],
    browsers: [],
    operating_systems: [],
    referrers: [],
    top_countries: [],
    peak_hours: []
  };
}

/**
 * Convert analytics data to CSV format
 */
function convertToCSV(analyticsData: any, link: any): string {
  const lines: string[] = [];

  // Header
  lines.push('# Analytics Export');
  lines.push(`# Link: ${link.slug}`);
  lines.push(`# Destination: ${link.destination}`);
  lines.push(`# Created: ${link.created_at}`);
  lines.push(`# Total Clicks: ${link.click_count}`);
  lines.push('');

  // Time series data
  if (analyticsData.time_series && analyticsData.time_series.length > 0) {
    lines.push('## Clicks Over Time');
    lines.push('Date,Clicks');
    analyticsData.time_series.forEach((item: any) => {
      lines.push(`${item.date},${item.clicks}`);
    });
    lines.push('');
  }

  // Geographic data
  if (analyticsData.geographic && analyticsData.geographic.length > 0) {
    lines.push('## Geographic Distribution');
    lines.push('Country,Country Name,Clicks,Percentage');
    analyticsData.geographic.forEach((item: any) => {
      lines.push(
        `${item.country},${item.country_name || ''},${item.clicks},${item.percentage || 0}%`
      );
    });
    lines.push('');
  }

  // Device data
  if (analyticsData.devices && analyticsData.devices.length > 0) {
    lines.push('## Device Breakdown');
    lines.push('Device,Clicks,Percentage');
    analyticsData.devices.forEach((item: any) => {
      lines.push(`${item.device},${item.clicks},${item.percentage}%`);
    });
    lines.push('');
  }

  // Browser data
  if (analyticsData.browsers && analyticsData.browsers.length > 0) {
    lines.push('## Browser Distribution');
    lines.push('Browser,Clicks,Percentage');
    analyticsData.browsers.forEach((item: any) => {
      lines.push(`${item.browser},${item.clicks},${item.percentage}%`);
    });
    lines.push('');
  }

  // Referrer data
  if (analyticsData.referrers && analyticsData.referrers.length > 0) {
    lines.push('## Top Referrers');
    lines.push('Referrer,Clicks,Percentage');
    analyticsData.referrers.forEach((item: any) => {
      lines.push(`${item.referrer},${item.clicks},${item.percentage}%`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Convert links array to CSV format
 */
function convertLinksToCSV(links: any[]): string {
  const lines: string[] = [];

  // Header
  lines.push(
    'Slug,Destination,Custom Domain,Created At,Updated At,Expires At,Max Clicks,Click Count,Password Protected,UTM Params'
  );

  // Data rows
  links.forEach(link => {
    const row = [
      escapeCSV(link.slug),
      escapeCSV(link.destination),
      escapeCSV(link.custom_domain || ''),
      escapeCSV(link.created_at),
      escapeCSV(link.updated_at || ''),
      escapeCSV(link.expires_at || ''),
      link.max_clicks || '',
      link.click_count || 0,
      link.password_hash ? 'Yes' : 'No',
      escapeCSV(link.utm_params || '')
    ];
    lines.push(row.join(','));
  });

  return lines.join('\n');
}

/**
 * Escape CSV field
 */
function escapeCSV(field: string): string {
  if (field === null || field === undefined) {
    return '';
  }

  const str = String(field);

  // If field contains comma, newline, or quote, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}
