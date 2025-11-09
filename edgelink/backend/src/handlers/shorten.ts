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
        short_url: `https://edgelink.io/${slug}`,
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
      linkData.expires_at = new Date(body.expires_at).getTime();
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
        created_at, updated_at, expires_at, max_clicks, click_count
      )
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), ?, ?, 0)
    `).bind(
      slug,
      user.sub,
      body.url,
      body.custom_domain || null,
      body.expires_at || null,
      body.max_clicks || null
    ).run();

    // Update usage tracking
    await trackUsage(env, user.sub, 'links_created');

    const response: ShortenResponse = {
      slug,
      short_url: body.custom_domain
        ? `https://${body.custom_domain}/${slug}`
        : `https://edgelink.io/${slug}`,
      expires_in: linkData.expires_at
        ? Math.floor((linkData.expires_at - now) / 1000)
        : undefined,
      qr_code_url: user.plan === 'pro' ? `https://edgelink.io/api/qr/${slug}` : undefined
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
