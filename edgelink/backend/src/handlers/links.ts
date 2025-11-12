/**
 * Link Management Handlers - Week 4
 * Enhanced link operations with password protection, expiration, and QR codes
 */

import type { Env } from '../types';
import { checkPasswordHash } from '../utils/password';
import { generateQRCodeSVG, generateQRCodeDataURL } from '../utils/qrcode';

/**
 * Handle GET /api/links - Get user's links with full details
 * Supports pagination and search via query parameters
 */
export async function handleGetLinks(
  env: Env,
  userId: string,
  searchParams?: URLSearchParams
): Promise<Response> {
  try {
    // Parse query parameters
    const page = parseInt(searchParams?.get('page') || '1', 10);
    const limit = parseInt(searchParams?.get('limit') || '50', 10);
    const search = searchParams?.get('search') || '';
    const searchField = searchParams?.get('searchField') || 'all';

    // Validate and sanitize
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100); // Max 100 per page
    const offset = (validPage - 1) * validLimit;

    // Build WHERE clause with search
    let whereClause = 'user_id = ?';
    const bindings: any[] = [userId];

    if (search) {
      if (searchField === 'slug') {
        whereClause += ' AND slug LIKE ?';
        bindings.push(`%${search}%`);
      } else if (searchField === 'destination') {
        whereClause += ' AND destination LIKE ?';
        bindings.push(`%${search}%`);
      } else if (searchField === 'date') {
        whereClause += ' AND created_at LIKE ?';
        bindings.push(`%${search}%`);
      } else {
        // Search all fields
        whereClause += ' AND (slug LIKE ? OR destination LIKE ? OR created_at LIKE ?)';
        bindings.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
    }

    // Get total count for pagination
    const countResult = await env.DB.prepare(`
      SELECT COUNT(*) as total
      FROM links
      WHERE ${whereClause}
    `).bind(...bindings).first();

    const total = (countResult?.total as number) || 0;

    // Get paginated results
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
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...bindings, validLimit, offset).all();

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
        total,
        page: validPage,
        limit: validLimit,
        totalPages: Math.ceil(total / validLimit)
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
      new_slug?: string;
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

    // Verify ownership and get full link data
    const link = await env.DB.prepare(`
      SELECT * FROM links WHERE slug = ?
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

    // Handle slug change (Pro feature only)
    let finalSlug = slug;
    if (body.new_slug && body.new_slug !== slug) {
      if (userPlan !== 'pro') {
        return new Response(
          JSON.stringify({
            error: 'Changing short code is a Pro feature. Upgrade to use it.',
            code: 'PRO_FEATURE_REQUIRED'
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Validate new slug format (5-20 chars, alphanumeric and dashes)
      const slugRegex = /^[a-zA-Z0-9-]{5,20}$/;
      if (!slugRegex.test(body.new_slug)) {
        return new Response(
          JSON.stringify({
            error: 'Invalid slug format. Must be 5-20 characters, alphanumeric and dashes only.',
            code: 'INVALID_SLUG_FORMAT'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Check if new slug is available
      const existingLink = await env.DB.prepare(`
        SELECT slug FROM links WHERE slug = ?
      `).bind(body.new_slug).first();

      if (existingLink) {
        return new Response(
          JSON.stringify({
            error: 'This short code is already taken. Please choose another.',
            code: 'SLUG_TAKEN'
          }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      finalSlug = body.new_slug;
      console.log(`[handleUpdateLink] Changing slug from ${slug} to ${finalSlug}`);
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
    // If slug is changing, we need to delete old and insert new (since slug is PRIMARY KEY)
    if (finalSlug !== slug) {
      // Preserve existing values if not provided in body
      const preservedExpires = body.expires_at !== undefined ? body.expires_at : link.expires_at;
      const preservedMaxClicks = body.max_clicks !== undefined ? body.max_clicks : link.max_clicks;
      const preservedPasswordHash = passwordHash !== null ? passwordHash : link.password_hash;
      const preservedDeviceRouting = body.device_routing !== undefined
        ? (body.device_routing ? JSON.stringify(body.device_routing) : null)
        : link.device_routing;
      const preservedGeoRouting = body.geo_routing !== undefined
        ? (body.geo_routing ? JSON.stringify(body.geo_routing) : null)
        : link.geo_routing;
      const preservedReferrerRouting = body.referrer_routing !== undefined
        ? (body.referrer_routing ? JSON.stringify(body.referrer_routing) : null)
        : link.referrer_routing;
      const preservedAbTesting = body.ab_testing !== undefined
        ? (body.ab_testing ? JSON.stringify(body.ab_testing) : null)
        : link.ab_testing;
      const preservedUtmParams = body.utm_params !== undefined ? body.utm_params : link.utm_params;

      console.log(`[handleUpdateLink] Inserting new record with slug: ${finalSlug}, preserving all existing data`);

      // Insert new record with new slug, preserving all existing data
      await env.DB.prepare(`
        INSERT INTO links (
          slug, user_id, destination, custom_domain,
          created_at, updated_at, expires_at, max_clicks, click_count,
          password_hash, device_routing, geo_routing, referrer_routing, ab_testing, utm_params
        )
        VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        finalSlug,
        userId,
        body.destination,
        link.custom_domain,
        link.created_at, // Preserve original creation date
        preservedExpires,
        preservedMaxClicks,
        link.click_count || 0, // Preserve click count
        preservedPasswordHash,
        preservedDeviceRouting,
        preservedGeoRouting,
        preservedReferrerRouting,
        preservedAbTesting,
        preservedUtmParams
      ).run();

      console.log(`[handleUpdateLink] New record inserted successfully`);

      // Delete old record
      await env.DB.prepare(`
        DELETE FROM links WHERE slug = ? AND user_id = ?
      `).bind(slug, userId).run();

      console.log(`[handleUpdateLink] Old record deleted`);

      // Delete old KV entry
      await env.LINKS_KV.delete(`slug:${slug}`);
      console.log(`[handleUpdateLink] Deleted old KV entry for slug: ${slug}`);
    } else {
      // Just update in place if slug hasn't changed
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
    }

    // Update KV - Always create/update the KV entry to ensure redirects work
    // Fetch current link data from D1 to get complete information
    const updatedLink = await env.DB.prepare(`
      SELECT
        slug, user_id, destination, custom_domain, click_count,
        expires_at, max_clicks, password_hash,
        device_routing, geo_routing, referrer_routing, ab_testing, utm_params
      FROM links
      WHERE slug = ? AND user_id = ?
    `).bind(finalSlug, userId).first();

    if (!updatedLink) {
      console.error(`[handleUpdateLink] Link not found in D1 after update: ${slug}`);
      return new Response(
        JSON.stringify({
          error: 'Link update failed - link not found after update',
          code: 'UPDATE_VERIFICATION_FAILED'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Build complete KV data structure
    const linkData: any = {
      slug: updatedLink.slug,
      user_id: updatedLink.user_id,
      destination: updatedLink.destination,
      custom_domain: updatedLink.custom_domain || null,
      click_count: updatedLink.click_count || 0,
      expires_at: updatedLink.expires_at ? new Date(updatedLink.expires_at as string).getTime() : null,
      max_clicks: updatedLink.max_clicks || null,
      password_hash: updatedLink.password_hash || null,
      device_routing: updatedLink.device_routing ? JSON.parse(updatedLink.device_routing as string) : null,
      geo_routing: updatedLink.geo_routing ? JSON.parse(updatedLink.geo_routing as string) : null,
      referrer_routing: updatedLink.referrer_routing ? JSON.parse(updatedLink.referrer_routing as string) : null,
      ab_testing: updatedLink.ab_testing ? JSON.parse(updatedLink.ab_testing as string) : null,
      utm_params: updatedLink.utm_params || null,
      utm_template: updatedLink.utm_params || null
    };

    console.log(`[handleUpdateLink] Updating KV for slug: ${finalSlug}, destination: ${linkData.destination}`);

    // Calculate TTL if there's an expiration
    const kvOptions: any = {};
    if (linkData.expires_at) {
      const expirationTtl = Math.floor((linkData.expires_at - Date.now()) / 1000);
      if (expirationTtl > 0) {
        kvOptions.expirationTtl = expirationTtl;
      }
    }

    // Always put to KV (create or update)
    try {
      await env.LINKS_KV.put(
        `slug:${finalSlug}`,
        JSON.stringify(linkData),
        Object.keys(kvOptions).length > 0 ? kvOptions : undefined
      );
      console.log(`[handleUpdateLink] Successfully updated KV for slug: ${finalSlug}`);

      // Verify the KV write by reading it back
      const verifyKV = await env.LINKS_KV.get(`slug:${finalSlug}`);
      if (verifyKV) {
        const verifiedData = JSON.parse(verifyKV);
        console.log(`[handleUpdateLink] KV verification - destination: ${verifiedData.destination}`);
        if (verifiedData.destination !== linkData.destination) {
          console.error(`[handleUpdateLink] KV verification FAILED! Expected: ${linkData.destination}, Got: ${verifiedData.destination}`);
        }
      } else {
        console.error(`[handleUpdateLink] KV verification FAILED! Entry not found after write`);
      }
    } catch (kvError) {
      console.error(`[handleUpdateLink] KV update failed for slug: ${finalSlug}`, kvError);
      // Don't fail the request, but log the error
    }

    return new Response(
      JSON.stringify({
        message: 'Link updated successfully',
        slug: finalSlug,
        slug_changed: finalSlug !== slug,
        old_slug: finalSlug !== slug ? slug : undefined
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
    const domain = link.custom_domain || 'go.shortedbro.xyz';
    const shortUrl = `https://${domain}/${slug}`;

    // Generate QR code using inline generator
    // Error correction level 'H' provides the highest error correction (~30%)
    if (format === 'svg') {
      const svg = generateQRCodeSVG(shortUrl, {
        cellSize: 8,
        margin: 4,
        errorCorrection: 'H'
      });

      return new Response(svg, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': `attachment; filename="${slug}-qr.svg"`
        }
      });
    } else {
      // For PNG format, generate data URL and convert to binary
      const dataUrl = generateQRCodeDataURL(shortUrl, {
        cellSize: 8,
        margin: 4,
        errorCorrection: 'H'
      });

      // Extract base64 data from data URL (format: data:image/svg+xml;base64,...)
      const base64Data = dataUrl.split(',')[1];
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      // Return SVG as PNG (browsers will render it correctly)
      return new Response(binaryData, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': `attachment; filename="${slug}-qr.svg"`
        }
      });
    }
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

