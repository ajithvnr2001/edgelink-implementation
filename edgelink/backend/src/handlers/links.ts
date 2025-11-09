/**
 * Link Management Handlers - Week 4
 * Enhanced link operations with password protection, expiration, and QR codes
 */

import type { Env } from '../types';
import { checkPasswordHash } from '../utils/password';

/**
 * Handle GET /api/links - Get user's links with full details
 */
export async function handleGetLinks(env: Env, userId: string): Promise<Response> {
  try {
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
        device_routing,
        geo_routing,
        referrer_routing,
        ab_testing,
        utm_params
      FROM links
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).bind(userId).all();

    // Remove password_hash from response
    const links = result.results.map((link: any) => ({
      ...link,
      password_protected: !!link.password_hash,
      password_hash: undefined,
      device_routing: link.device_routing ? JSON.parse(link.device_routing) : null,
      geo_routing: link.geo_routing ? JSON.parse(link.geo_routing) : null,
      referrer_routing: link.referrer_routing ? JSON.parse(link.referrer_routing) : null,
      ab_testing: link.ab_testing ? JSON.parse(link.ab_testing) : null,
      utm_params: link.utm_params ? JSON.parse(link.utm_params) : null
    }));

    return new Response(
      JSON.stringify({
        links,
        total: links.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Failed to fetch links:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch links',
        code: 'FETCH_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle PUT /api/links/:slug - Update link with advanced features
 */
export async function handleUpdateLink(
  request: Request,
  env: Env,
  userId: string,
  slug: string,
  userPlan: string
): Promise<Response> {
  try {
    const body = await request.json() as {
      destination?: string;
      expires_at?: string;
      max_clicks?: number;
      password?: string;
      device_routing?: any;
      geo_routing?: any;
      referrer_routing?: any;
      ab_testing?: any;
      utm_params?: string;
    };

    if (!body.destination) {
      return new Response(
        JSON.stringify({
          error: 'Destination URL required',
          code: 'INVALID_INPUT'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify ownership
    const link = await env.DB.prepare(`
      SELECT user_id FROM links WHERE slug = ?
    `).bind(slug).first();

    if (!link || link.user_id !== userId) {
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

    // Check Pro-only features
    const proFeatures = [
      'password',
      'device_routing',
      'geo_routing',
      'referrer_routing',
      'ab_testing'
    ];

    for (const feature of proFeatures) {
      if (body[feature as keyof typeof body] && userPlan !== 'pro') {
        return new Response(
          JSON.stringify({
            error: `${feature} is a Pro feature. Upgrade to use it.`,
            code: 'PRO_FEATURE_REQUIRED'
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Handle password if provided
    let passwordHash = null;
    if (body.password) {
      const encoder = new TextEncoder();
      const data = encoder.encode(body.password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      passwordHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    // Update link in D1
    await env.DB.prepare(`
      UPDATE links
      SET
        destination = ?,
        expires_at = ?,
        max_clicks = ?,
        password_hash = ?,
        device_routing = ?,
        geo_routing = ?,
        referrer_routing = ?,
        ab_testing = ?,
        utm_params = ?,
        updated_at = datetime('now')
      WHERE slug = ? AND user_id = ?
    `).bind(
      body.destination,
      body.expires_at || null,
      body.max_clicks || null,
      passwordHash,
      body.device_routing ? JSON.stringify(body.device_routing) : null,
      body.geo_routing ? JSON.stringify(body.geo_routing) : null,
      body.referrer_routing ? JSON.stringify(body.referrer_routing) : null,
      body.ab_testing ? JSON.stringify(body.ab_testing) : null,
      body.utm_params || null,
      slug,
      userId
    ).run();

    // Update KV
    const linkDataStr = await env.LINKS_KV.get(`slug:${slug}`);
    if (linkDataStr) {
      const linkData = JSON.parse(linkDataStr);
      linkData.destination = body.destination;
      linkData.expires_at = body.expires_at ? new Date(body.expires_at).getTime() : null;
      linkData.max_clicks = body.max_clicks || null;
      linkData.password_hash = passwordHash;
      linkData.device_routing = body.device_routing || null;
      linkData.geo_routing = body.geo_routing || null;
      linkData.referrer_routing = body.referrer_routing || null;
      linkData.ab_testing = body.ab_testing || null;
      linkData.utm_params = body.utm_params || null;

      await env.LINKS_KV.put(`slug:${slug}`, JSON.stringify(linkData));
    }

    return new Response(
      JSON.stringify({
        message: 'Link updated successfully',
        slug
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Failed to update link:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to update link',
        code: 'UPDATE_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle DELETE /api/links/:slug - Delete link
 */
export async function handleDeleteLink(
  env: Env,
  userId: string,
  slug: string
): Promise<Response> {
  try {
    // Verify ownership
    const link = await env.DB.prepare(`
      SELECT user_id FROM links WHERE slug = ?
    `).bind(slug).first();

    if (!link || link.user_id !== userId) {
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

    // Delete from D1
    await env.DB.prepare(`
      DELETE FROM links WHERE slug = ? AND user_id = ?
    `).bind(slug, userId).run();

    // Delete from KV
    await env.LINKS_KV.delete(`slug:${slug}`);

    return new Response(
      JSON.stringify({
        message: 'Link deleted successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Failed to delete link:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to delete link',
        code: 'DELETE_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle GET /api/links/:slug/qr - Generate QR code (Pro only)
 */
export async function handleGenerateQR(
  env: Env,
  userId: string,
  slug: string,
  userPlan: string,
  format: 'svg' | 'png' = 'svg'
): Promise<Response> {
  // Check Pro plan
  if (userPlan !== 'pro') {
    return new Response(
      JSON.stringify({
        error: 'QR code generation is a Pro feature',
        code: 'PRO_FEATURE_REQUIRED'
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Verify ownership
    const link = await env.DB.prepare(`
      SELECT user_id, custom_domain FROM links WHERE slug = ?
    `).bind(slug).first();

    if (!link || link.user_id !== userId) {
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

    // Construct short URL
    const domain = link.custom_domain || 'edgelink.io';
    const shortUrl = `https://${domain}/${slug}`;

    // Generate QR code SVG (simple implementation)
    const qrSvg = generateQRCodeSVG(shortUrl);

    if (format === 'svg') {
      return new Response(qrSvg, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': `attachment; filename="${slug}-qr.svg"`
        }
      });
    }

    // For PNG, return SVG with instructions to convert
    return new Response(
      JSON.stringify({
        qr_code: qrSvg,
        format: 'svg',
        message: 'PNG conversion available in production with image service',
        download_url: `/api/links/${slug}/qr?format=svg`
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate QR code',
        code: 'QR_GENERATION_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Simple QR code SVG generator
 * In production, use a proper QR code library
 */
function generateQRCodeSVG(data: string): string {
  // This is a simplified placeholder
  // In production, integrate with a QR code generation library
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="#ffffff"/>
    <text x="128" y="128" text-anchor="middle" font-size="12" fill="#000000">
      QR Code: ${data.substring(0, 20)}...
    </text>
    <text x="128" y="150" text-anchor="middle" font-size="10" fill="#666666">
      Use QR library in production
    </text>
  </svg>`;
}
