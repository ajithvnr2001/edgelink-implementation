/**
 * URL Shortening Handler
 * Based on PRD FR-1: URL Shortening
 */

import type { Env, ShortenRequest, ShortenResponse, JWTPayload, LinkKVValue } from '../types';
import { generateSlugWithRetry } from '../utils/slug';
import { isValidURL } from '../utils/validation';
import { hashPassword } from '../utils/password';

/**
 * Handle POST /api/shorten
 * Create a new short link (anonymous or authenticated)
 *
 * FR-1: URL Shortening
 * FR-1.6: Anonymous creation supported (no JWT, 30-day expiry, no QR)
 */
export async function handleShorten(
  request: Request,
  env: Env,
  user: JWTPayload | null
): Promise<Response> {
  try {
    // Parse request body
    const body = await request.json() as ShortenRequest;

    // Validate destination URL (FR-1.1)
    if (!body.url || !isValidURL(body.url)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid URL. Must be HTTP/HTTPS and less than 2,048 characters.',
          code: 'INVALID_URL'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate slug with collision detection (FR-1.4)
    const slug = await generateSlugWithRetry(
      env.LINKS_KV,
      body.custom_slug,
      3 // Max 3 attempts
    );

    // Prepare link data for KV storage
    const now = Date.now();
    const linkData: LinkKVValue = {
      destination: body.url,
      created_at: now,
      user_id: user?.sub || 'anonymous',
      custom_domain: body.custom_domain,
      click_count: 0,
      metadata: {}
    };

    // Handle anonymous links (FR-1.6)
    if (!user) {
      // Anonymous links expire in 30 days
      linkData.expires_at = now + (30 * 24 * 60 * 60 * 1000);

      // Store in KV
      await env.LINKS_KV.put(
        `slug:${slug}`,
        JSON.stringify(linkData),
        { expirationTtl: 30 * 24 * 60 * 60 } // 30 days
      );

      // Store in D1 for tracking
      await env.DB.prepare(`
        INSERT INTO anonymous_links (slug, destination, created_at, expires_at, click_count)
        VALUES (?, ?, datetime('now'), datetime('now', '+30 days'), 0)
      `).bind(slug, body.url).run();

      const response: ShortenResponse = {
        slug,
        short_url: `https://go.shortedbro.xyz/${slug}`,
        expires_in: 30 * 24 * 60 * 60 // 30 days in seconds
      };

      return new Response(JSON.stringify(response), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Authenticated user link creation
    // Add advanced features if provided
    if (body.expires_at) {
      // Convert from user's timezone to UTC
      const timezone = body.timezone || 'UTC';
      linkData.expires_at = convertToUTC(body.expires_at, timezone);
    }

    if (body.timezone) {
      linkData.timezone = body.timezone;
    }

    if (body.max_clicks) {
      linkData.max_clicks = body.max_clicks;
    }

    if (body.password) {
      // Password-protected links (Pro feature)
      if (user.plan !== 'pro') {
        return new Response(
          JSON.stringify({
            error: 'Password-protected links are a Pro feature',
            code: 'PRO_FEATURE_REQUIRED'
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      linkData.password_hash = await hashPassword(body.password);
    }

    if (body.utm_template) {
      linkData.utm_template = body.utm_template;
    }

    if (body.device_routing) {
      // Device routing (Pro feature)
      if (user.plan !== 'pro') {
        return new Response(
          JSON.stringify({
            error: 'Device routing is a Pro feature',
            code: 'PRO_FEATURE_REQUIRED'
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      linkData.device_routing = body.device_routing;
    }

    if (body.geo_routing) {
      // Geographic routing (Pro feature)
      if (user.plan !== 'pro') {
        return new Response(
          JSON.stringify({
            error: 'Geographic routing is a Pro feature',
            code: 'PRO_FEATURE_REQUIRED'
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      linkData.geo_routing = body.geo_routing;
    }

    // Store in KV for fast redirects
    const expirationTtl = linkData.expires_at
      ? Math.floor((linkData.expires_at - now) / 1000)
      : undefined;

    await env.LINKS_KV.put(
      `slug:${slug}`,
      JSON.stringify(linkData),
      expirationTtl ? { expirationTtl } : {}
    );

    // Store in D1 for management
    await env.DB.prepare(`
      INSERT INTO links (
        slug, user_id, destination, custom_domain,
        created_at, updated_at, expires_at, timezone, max_clicks, click_count
      )
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), ?, ?, ?, 0)
    `).bind(
      slug,
      user.sub,
      body.url,
      body.custom_domain || null,
      body.expires_at || null,
      body.timezone || 'UTC',
      body.max_clicks || null
    ).run();

    // Update usage tracking
    await trackUsage(env, user.sub, 'links_created');

    const response: ShortenResponse = {
      slug,
      short_url: body.custom_domain
        ? `https://${body.custom_domain}/${slug}`
        : `https://go.shortedbro.xyz/${slug}`,
      expires_in: linkData.expires_at
        ? Math.floor((linkData.expires_at - now) / 1000)
        : undefined,
      qr_code_url: user.plan === 'pro' ? `https://go.shortedbro.xyz/api/qr/${slug}` : undefined
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create short link';

    return new Response(
      JSON.stringify({
        error: message,
        code: 'SHORTEN_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Track usage metrics
 */
async function trackUsage(
  env: Env,
  userId: string,
  metricType: 'links_created' | 'api_calls' | 'clicks_tracked'
): Promise<void> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Upsert usage record
  await env.DB.prepare(`
    INSERT INTO usage_tracking (id, user_id, metric_type, count, period_start, period_end)
    VALUES (?, ?, ?, 1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET count = count + 1
  `).bind(
    `${userId}:${metricType}:${periodStart.toISOString().slice(0, 7)}`,
    userId,
    metricType,
    periodStart.toISOString(),
    periodEnd.toISOString()
  ).run();
}

/**
 * Convert datetime from user's timezone to UTC timestamp
 * @param datetimeLocal - Datetime string from datetime-local input (e.g., "2025-11-15T04:39")
 * @param timezone - IANA timezone identifier (e.g., "Asia/Kolkata")
 * @returns UTC timestamp in milliseconds
 */
function convertToUTC(datetimeLocal: string, timezone: string): number {
  // Parse the datetime-local value (e.g., "2025-11-15T04:39")
  // This gives us year, month, day, hour, minute in the user's timezone

  // Create a date string in ISO format
  // The datetime-local input gives us "YYYY-MM-DDTHH:mm" format
  const dateStr = datetimeLocal.includes('T') ? datetimeLocal : `${datetimeLocal}T00:00`;

  // Use Intl.DateTimeFormat to parse the date in the user's timezone
  // We need to create a UTC date that represents the same wall-clock time in the user's timezone

  // Parse the components
  const [datePart, timePart = '00:00'] = dateStr.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  // Create a formatter for the user's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  // Create a date object in UTC with the wall-clock time
  // We'll use a binary search approach to find the UTC time that produces
  // the desired local time in the target timezone

  // Start with a naive UTC date
  const naiveDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

  // Get what this UTC time looks like in the target timezone
  const parts = formatter.formatToParts(naiveDate);
  const localYear = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const localMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0');
  const localDay = parseInt(parts.find(p => p.type === 'day')?.value || '0');
  const localHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const localMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');

  // Calculate the offset (difference between what we got and what we wanted)
  const targetTime = new Date(year, month - 1, day, hour, minute, 0).getTime();
  const actualTime = new Date(localYear, localMonth - 1, localDay, localHour, localMinute, 0).getTime();
  const offset = targetTime - actualTime;

  // Apply the offset to get the correct UTC time
  return naiveDate.getTime() + offset;
}
