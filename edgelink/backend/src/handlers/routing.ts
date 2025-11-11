/**
 * Smart Routing Configuration Handler
 * Weeks 5-6: Advanced Routing Features
 *
 * Supports:
 * - Device-based routing (mobile/tablet/desktop)
 * - Geographic routing (by country)
 * - Time-based routing (by hour/day/timezone)
 * - Referrer-based routing (by source domain)
 */

import type { Env } from '../types';

/**
 * Configure device routing for a link
 * POST /api/links/:slug/routing/device
 */
export async function handleSetDeviceRouting(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const slug = url.pathname.split('/')[3];

    if (!slug) {
      return new Response(
        JSON.stringify({ error: 'Slug is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has Pro plan (device routing is a Pro feature)
    const user = await env.DB.prepare(
      'SELECT plan FROM users WHERE user_id = ?'
    ).bind(userId).first<{ plan: string }>();

    if (!user || user.plan !== 'pro') {
      return new Response(
        JSON.stringify({
          error: 'Device routing is a Pro feature',
          code: 'PRO_FEATURE_REQUIRED'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body: any = await request.json();
    const { mobile, tablet, desktop } = body;

    // Validation
    if (!mobile && !tablet && !desktop) {
      return new Response(
        JSON.stringify({ error: 'At least one device routing rule is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate URLs
    try {
      if (mobile) new URL(mobile);
      if (tablet) new URL(tablet);
      if (desktop) new URL(desktop);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prevent redirect loops - check if any URL contains the slug
    const urlsToCheck = [
      { url: mobile, name: 'Mobile' },
      { url: tablet, name: 'Tablet' },
      { url: desktop, name: 'Desktop' }
    ];

    for (const { url, name } of urlsToCheck) {
      if (url && url.includes(`/${slug}`)) {
        return new Response(
          JSON.stringify({
            error: `${name} URL cannot contain your short link (/${slug}). This would create a redirect loop. Please use only destination URLs.`,
            code: 'REDIRECT_LOOP_DETECTED'
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
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

    // Update link with device routing in KV
    const kvData = await env.LINKS_KV.get(`slug:${slug}`);
    if (kvData) {
      const linkData = JSON.parse(kvData);
      linkData.device_routing = { mobile, tablet, desktop };
      await env.LINKS_KV.put(`slug:${slug}`, JSON.stringify(linkData));
    }

    return new Response(
      JSON.stringify({
        message: 'Device routing configured successfully',
        slug,
        device_routing: { mobile, tablet, desktop }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error setting device routing:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to set device routing' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Configure geographic routing for a link
 * POST /api/links/:slug/routing/geo
 */
export async function handleSetGeoRouting(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const slug = url.pathname.split('/')[3];

    if (!slug) {
      return new Response(
        JSON.stringify({ error: 'Slug is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has Pro plan (geographic routing is a Pro feature)
    const user = await env.DB.prepare(
      'SELECT plan FROM users WHERE user_id = ?'
    ).bind(userId).first<{ plan: string }>();

    if (!user || user.plan !== 'pro') {
      return new Response(
        JSON.stringify({
          error: 'Geographic routing is a Pro feature',
          code: 'PRO_FEATURE_REQUIRED'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body: any = await request.json();
    const { routes } = body; // { "US": "https://...", "UK": "https://..." }

    // Validation
    if (!routes || typeof routes !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Routes object is required (country code -> URL)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate URLs
    try {
      for (const url of Object.values(routes)) {
        if (typeof url === 'string') new URL(url);
      }
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format in routes' }),
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

    // Update link with geo routing in KV
    const kvData = await env.LINKS_KV.get(`slug:${slug}`);
    if (kvData) {
      const linkData = JSON.parse(kvData);
      linkData.geo_routing = routes;
      await env.LINKS_KV.put(`slug:${slug}`, JSON.stringify(linkData));
    }

    return new Response(
      JSON.stringify({
        message: 'Geographic routing configured successfully',
        slug,
        geo_routing: routes
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error setting geo routing:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to set geo routing' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Configure time-based routing for a link
 * POST /api/links/:slug/routing/time
 */
export async function handleSetTimeRouting(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const slug = url.pathname.split('/')[3];

    if (!slug) {
      return new Response(
        JSON.stringify({ error: 'Slug is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has Pro plan (time-based routing is a Pro feature)
    const user = await env.DB.prepare(
      'SELECT plan FROM users WHERE user_id = ?'
    ).bind(userId).first<{ plan: string }>();

    if (!user || user.plan !== 'pro') {
      return new Response(
        JSON.stringify({
          error: 'Time-based routing is a Pro feature',
          code: 'PRO_FEATURE_REQUIRED'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body: any = await request.json();
    const { rules } = body; // [{ start_hour, end_hour, days, timezone, destination }]

    // Validation
    if (!rules || !Array.isArray(rules) || rules.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Rules array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate each rule
    for (const rule of rules) {
      if (typeof rule.start_hour !== 'number' || typeof rule.end_hour !== 'number') {
        return new Response(
          JSON.stringify({ error: 'start_hour and end_hour must be numbers (0-23)' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (rule.start_hour < 0 || rule.start_hour > 23 || rule.end_hour < 0 || rule.end_hour > 23) {
        return new Response(
          JSON.stringify({ error: 'Hours must be between 0-23' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (!rule.destination) {
        return new Response(
          JSON.stringify({ error: 'destination is required for each rule' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      try {
        new URL(rule.destination);
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid destination URL' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
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

    // Update link with time routing in KV
    const kvData = await env.LINKS_KV.get(`slug:${slug}`);
    if (kvData) {
      const linkData = JSON.parse(kvData);
      linkData.time_routing = rules;
      await env.LINKS_KV.put(`slug:${slug}`, JSON.stringify(linkData));
    }

    return new Response(
      JSON.stringify({
        message: 'Time-based routing configured successfully',
        slug,
        time_routing: rules
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error setting time routing:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to set time routing' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Get all routing configuration for a link
 * GET /api/links/:slug/routing
 */
export async function handleGetRouting(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const slug = url.pathname.split('/')[3];

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

    // Get routing configuration from KV
    const kvData = await env.LINKS_KV.get(`slug:${slug}`);
    if (!kvData) {
      return new Response(
        JSON.stringify({ error: 'Link data not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const linkData = JSON.parse(kvData);

    return new Response(
      JSON.stringify({
        slug,
        destination: linkData.destination,
        routing: {
          device: linkData.device_routing || null,
          geo: linkData.geo_routing || null,
          time: linkData.time_routing || null,
          referrer: linkData.referrer_routing || null
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error getting routing:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get routing configuration' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Delete all routing rules for a link
 * DELETE /api/links/:slug/routing
 */
export async function handleDeleteRouting(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const slug = url.pathname.split('/')[3];

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

    // Remove routing configuration from KV
    const kvData = await env.LINKS_KV.get(`slug:${slug}`);
    if (kvData) {
      const linkData = JSON.parse(kvData);
      delete linkData.device_routing;
      delete linkData.geo_routing;
      delete linkData.time_routing;
      delete linkData.referrer_routing;
      await env.LINKS_KV.put(`slug:${slug}`, JSON.stringify(linkData));
    }

    return new Response(
      JSON.stringify({
        message: 'All routing rules removed successfully',
        slug
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error deleting routing:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete routing configuration' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
