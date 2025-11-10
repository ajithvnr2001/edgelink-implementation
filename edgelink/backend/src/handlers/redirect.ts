/**
 * URL Redirect Handler
 * Based on PRD FR-2: Link Redirect
 */

import type { Env, LinkKVValue, AnalyticsEvent } from '../types';
import { verifyPassword } from '../utils/password';
import { determineVariant } from './ab-testing';

/**
 * Handle GET /{slug}
 * Redirect to destination URL
 *
 * FR-2: Link Redirect
 * FR-2.1: HTTP 301 redirects (permanent, default)
 * FR-2.3: Redirect latency <50ms p95
 */
export async function handleRedirect(
  request: Request,
  env: Env,
  slug: string,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    // Get link data from KV (fast path)
    const linkDataStr = await env.LINKS_KV.get(`slug:${slug}`);

    if (!linkDataStr) {
      // Link not found - check for fallback URL
      // If FALLBACK_URL is set, proxy the request to the original website
      if (env.FALLBACK_URL) {
        const url = new URL(request.url);
        const fallbackUrl = `${env.FALLBACK_URL}${url.pathname}${url.search}`;

        // Proxy the request to the fallback URL
        try {
          const fallbackResponse = await fetch(fallbackUrl, {
            method: request.method,
            headers: request.headers,
            redirect: 'manual'
          });

          // Return the proxied response
          return new Response(fallbackResponse.body, {
            status: fallbackResponse.status,
            statusText: fallbackResponse.statusText,
            headers: fallbackResponse.headers
          });
        } catch (error) {
          console.error('Fallback URL fetch error:', error);
          // If fallback fails, return 404
          return new Response('Link not found', {
            status: 404,
            headers: { 'Content-Type': 'text/plain' }
          });
        }
      }

      // No fallback configured - return 404
      return new Response('Link not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const linkData: LinkKVValue = JSON.parse(linkDataStr);

    // Check time-based expiration
    if (linkData.expires_at && Date.now() > linkData.expires_at) {
      return new Response('Link expired', {
        status: 410,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Check click-count expiration (max_clicks)
    if (linkData.max_clicks && linkData.click_count >= linkData.max_clicks) {
      return new Response('Link has reached maximum click limit', {
        status: 410,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Check password protection (Pro feature)
    if (linkData.password_hash) {
      const url = new URL(request.url);
      const passwordFromQuery = url.searchParams.get('password');
      const passwordFromHeader = request.headers.get('X-Link-Password');
      const password = passwordFromQuery || passwordFromHeader;

      if (!password || !(await verifyPassword(password, linkData.password_hash))) {
        // For browser requests, show HTML password form
        const acceptHeader = request.headers.get('Accept') || '';
        if (acceptHeader.includes('text/html')) {
          return new Response(
            generatePasswordPage(slug),
            {
              status: 200,
              headers: { 'Content-Type': 'text/html' }
            }
          );
        }

        // For API requests, return JSON error
        return new Response(
          JSON.stringify({
            error: 'Password required',
            code: 'PASSWORD_REQUIRED'
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Determine destination based on routing rules (priority order)
    let destination = linkData.destination;

    // 1. A/B Testing (highest priority - uses determineVariant from ab-testing handler)
    const clientIp = request.headers.get('cf-connecting-ip') || '0.0.0.0';
    const abTestDestination = await determineVariant(env, slug, clientIp);
    if (abTestDestination) {
      destination = abTestDestination;
    } else {
      // 2. Time-based routing (check if current time matches any rule)
      if (linkData.time_routing) {
        const now = new Date();
        const currentHour = now.getUTCHours();
        const currentDay = now.getUTCDay(); // 0=Sunday, 6=Saturday

        for (const rule of linkData.time_routing) {
          let matches = true;

          // Check hour range
          if (rule.start_hour !== undefined && rule.end_hour !== undefined) {
            if (rule.start_hour <= rule.end_hour) {
              matches = currentHour >= rule.start_hour && currentHour < rule.end_hour;
            } else {
              // Wrap around midnight
              matches = currentHour >= rule.start_hour || currentHour < rule.end_hour;
            }
          }

          // Check day of week
          if (matches && rule.days && rule.days.length > 0) {
            matches = rule.days.includes(currentDay);
          }

          // Check timezone (use cf-timezone if available)
          if (matches && rule.timezone) {
            const timezone = request.headers.get('cf-timezone') || 'UTC';
            matches = timezone === rule.timezone;
          }

          if (matches && rule.destination) {
            destination = rule.destination;
            break;
          }
        }
      }

      // 3. Device-based routing
      if (linkData.device_routing) {
        const userAgent = request.headers.get('user-agent') || '';
        const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
        const isTablet = /iPad|Tablet/i.test(userAgent);

        if (isMobile && linkData.device_routing.mobile) {
          destination = linkData.device_routing.mobile;
        } else if (isTablet && linkData.device_routing.tablet) {
          destination = linkData.device_routing.tablet;
        } else if (!isMobile && !isTablet && linkData.device_routing.desktop) {
          destination = linkData.device_routing.desktop;
        }
      }

      // 4. Geographic routing
      if (linkData.geo_routing) {
        const country = request.headers.get('cf-ipcountry') || 'XX';
        if (linkData.geo_routing[country]) {
          destination = linkData.geo_routing[country];
        }
      }

      // 5. Referrer-based routing
      if (linkData.referrer_routing) {
        const referrer = request.headers.get('referer') || '';
        for (const [domain, url] of Object.entries(linkData.referrer_routing)) {
          if (referrer.includes(domain)) {
            destination = url;
            break;
          }
        }
      }
    }

    // Append UTM parameters (FR-12)
    if (linkData.utm_template) {
      const url = new URL(destination);
      const params = new URLSearchParams(linkData.utm_template);
      params.forEach((value, key) => {
        url.searchParams.append(key, value);
      });
      destination = url.toString();
    }

    // Track analytics (async, don't block redirect)
    ctx.waitUntil(
      trackAnalytics(env, slug, request, linkData).catch(err =>
        console.error('Analytics tracking failed:', err)
      )
    );

    // Increment click count (async) - CRITICAL: Use waitUntil to ensure it completes
    ctx.waitUntil(
      incrementClickCount(env, slug, linkData.user_id).catch(err =>
        console.error('Click count increment failed:', err)
      )
    );

    // Return redirect (FR-2.1: 301 permanent)
    return Response.redirect(destination, 301);
  } catch (error) {
    console.error('Redirect error:', error);
    return new Response('Internal server error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * Track analytics event
 * FR-3: Analytics Foundation
 */
async function trackAnalytics(
  env: Env,
  slug: string,
  request: Request,
  linkData: LinkKVValue
): Promise<void> {
  const userAgent = request.headers.get('user-agent') || '';
  const country = request.headers.get('cf-ipcountry') || 'XX';
  const city = request.headers.get('cf-ipcity') || '';
  const referrer = request.headers.get('referer') || 'direct';

  // Parse device info
  const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
  const isTablet = /iPad|Tablet/i.test(userAgent);
  const device = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

  // Parse browser
  let browser = 'unknown';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  // Parse OS
  let os = 'unknown';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';

  // Write to Analytics Engine
  const event: AnalyticsEvent = {
    timestamp: Date.now(),
    slug,
    country,
    city,
    device,
    browser,
    os,
    referrer,
    user_id: linkData.user_id,
    plan: undefined // We'd need to fetch this from DB
  };

  // Write to Analytics Engine (if available)
  if (env.ANALYTICS_ENGINE) {
    await env.ANALYTICS_ENGINE.writeDataPoint({
      indexes: [slug, country, device],
      blobs: [referrer, browser, os],
      doubles: [Date.now()]
    });
  } else {
    console.warn('ANALYTICS_ENGINE not configured, skipping analytics tracking');
  }
}

/**
 * Increment click count
 */
async function incrementClickCount(
  env: Env,
  slug: string,
  userId: string
): Promise<void> {
  try {
    console.log(`[incrementClickCount] Starting for slug: ${slug}, userId: ${userId}`);

    if (userId === 'anonymous') {
      const result = await env.DB.prepare(`
        UPDATE anonymous_links
        SET click_count = click_count + 1
        WHERE slug = ?
      `).bind(slug).run();
      console.log(`[incrementClickCount] Updated anonymous link, rows affected: ${result.meta.changes}`);
    } else {
      // Update D1 database
      const dbResult = await env.DB.prepare(`
        UPDATE links
        SET click_count = click_count + 1
        WHERE slug = ?
      `).bind(slug).run();
      console.log(`[incrementClickCount] Updated D1 database, rows affected: ${dbResult.meta.changes}`);

      // Update KV store to keep it in sync
      const linkDataStr = await env.LINKS_KV.get(`slug:${slug}`);
      if (linkDataStr) {
        const linkData: LinkKVValue = JSON.parse(linkDataStr);
        const oldCount = linkData.click_count || 0;
        linkData.click_count = oldCount + 1;
        await env.LINKS_KV.put(`slug:${slug}`, JSON.stringify(linkData));
        console.log(`[incrementClickCount] Updated KV store: ${oldCount} -> ${linkData.click_count}`);
      } else {
        console.warn(`[incrementClickCount] KV data not found for slug: ${slug}`);
      }
    }
    console.log(`[incrementClickCount] Completed successfully for slug: ${slug}`);
  } catch (error) {
    console.error(`[incrementClickCount] Error for slug ${slug}:`, error);
    throw error;
  }
}

/**
 * Generate HTML password protection page
 */
function generatePasswordPage(slug: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Protected Link - EdgeLink</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 40px;
      max-width: 400px;
      width: 100%;
    }
    .icon {
      width: 64px;
      height: 64px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 32px;
    }
    h1 {
      font-size: 24px;
      color: #1a202c;
      text-align: center;
      margin-bottom: 12px;
    }
    p {
      color: #718096;
      text-align: center;
      margin-bottom: 32px;
      font-size: 14px;
    }
    .form-group {
      margin-bottom: 24px;
    }
    label {
      display: block;
      color: #4a5568;
      font-weight: 500;
      margin-bottom: 8px;
      font-size: 14px;
    }
    input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 16px;
      transition: all 0.2s;
    }
    input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }
    button:active {
      transform: translateY(0);
    }
    .error {
      background: #fed7d7;
      color: #c53030;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🔒</div>
    <h1>Password Protected Link</h1>
    <p>This link is password protected. Enter the password to continue.</p>

    <div id="error" class="error"></div>

    <form id="passwordForm">
      <div class="form-group">
        <label for="password">Enter Password</label>
        <input
          type="password"
          id="password"
          name="password"
          placeholder="••••••••"
          required
          autofocus
        >
      </div>
      <button type="submit">Unlock Link</button>
    </form>
  </div>

  <script>
    document.getElementById('passwordForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('password').value;
      const errorDiv = document.getElementById('error');
      const button = e.target.querySelector('button');

      // Disable button and show loading
      button.disabled = true;
      button.textContent = 'Verifying...';
      errorDiv.style.display = 'none';

      // Redirect with password in query parameter
      const url = new URL(window.location.href);
      url.searchParams.set('password', password);
      window.location.href = url.toString();
    });
  </script>
</body>
</html>`;
}

/**
 * Hash string for consistent A/B testing
 */
async function hashString(input: string): Promise<number> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return hashArray[0];
}
