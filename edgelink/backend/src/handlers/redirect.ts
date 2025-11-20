/**
 * URL Redirect Handler
 * Based on PRD FR-2: Link Redirect
 */

import type { Env, LinkKVValue, AnalyticsEvent } from '../types';
import { verifyPassword } from '../utils/password';
import { determineVariant } from './ab-testing';
import type { R2LogService } from '../services/logs/r2LogService';
import { PlanLimitsService } from '../services/payments/planLimits';

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
  ctx: ExecutionContext,
  logger?: R2LogService,
  requestId?: string
): Promise<Response> {
  try {
    const requestUrl = new URL(request.url);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔍 [handleRedirect] START`);
    console.log(`   Request URL: ${request.url}`);
    console.log(`   Hostname: ${requestUrl.hostname}`);
    console.log(`   Slug: ${slug}`);
    console.log(`   Method: ${request.method}`);

    // Get link data from KV (fast path)
    console.log(`📦 [handleRedirect] Fetching KV data for slug: ${slug}`);
    const linkDataStr = await env.LINKS_KV.get(`slug:${slug}`);

    if (!linkDataStr) {
      console.log(`❌ [handleRedirect] KV data NOT FOUND for slug: ${slug}`);
      console.log(`🔧 [handleRedirect] Checking for FALLBACK_URL...`);
      console.log(`   FALLBACK_URL configured: ${env.FALLBACK_URL ? 'YES - ' + env.FALLBACK_URL : 'NO'}`);

      // Link not found - check for fallback URL
      // If FALLBACK_URL is set, proxy the request to the original website
      if (env.FALLBACK_URL) {
        const url = new URL(request.url);
        const fallbackUrl = `${env.FALLBACK_URL}${url.pathname}${url.search}`;
        console.log(`🔄 [handleRedirect] Proxying to fallback URL: ${fallbackUrl}`);

        // Proxy the request to the fallback URL
        try {
          const fallbackResponse = await fetch(fallbackUrl, {
            method: request.method,
            headers: request.headers,
            redirect: 'manual'
          });

          console.log(`✅ [handleRedirect] Fallback response received: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

          // Return the proxied response
          return new Response(fallbackResponse.body, {
            status: fallbackResponse.status,
            statusText: fallbackResponse.statusText,
            headers: fallbackResponse.headers
          });
        } catch (error) {
          console.error(`❌ [handleRedirect] Fallback URL fetch error:`, error);
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
          // If fallback fails, return 404
          return new Response(generateNotFoundPage(), {
            status: 404,
            headers: { 'Content-Type': 'text/html' }
          });
        }
      }

      console.log(`⚠️  [handleRedirect] No fallback configured, returning 404`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      // No fallback configured - return 404
      return new Response(generateNotFoundPage(), {
        status: 404,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    console.log(`✅ [handleRedirect] KV data FOUND for slug: ${slug}`);

    const linkData: LinkKVValue = JSON.parse(linkDataStr);
    console.log(`📋 [handleRedirect] Link data parsed:`);
    console.log(`   Destination: ${linkData.destination}`);
    console.log(`   User ID: ${linkData.user_id}`);
    console.log(`   Click count: ${linkData.click_count || 0}`);
    console.log(`   Has password: ${linkData.password_hash ? 'YES' : 'NO'}`);
    console.log(`   Expires at: ${linkData.expires_at ? new Date(linkData.expires_at).toISOString() : 'NEVER'}`);

    // Check time-based expiration
    if (linkData.expires_at && Date.now() > linkData.expires_at) {
      return new Response(generateExpiredPage('time'), {
        status: 410,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Check click-count expiration (max_clicks)
    if (linkData.max_clicks && linkData.click_count >= linkData.max_clicks) {
      return new Response(generateExpiredPage('clicks'), {
        status: 410,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Check monthly click limit for the user (skip for anonymous links)
    if (linkData.user_id !== 'anonymous') {
      // Get user's plan from database
      const userResult = await env.DB.prepare(`
        SELECT plan FROM users WHERE user_id = ?
      `).bind(linkData.user_id).first();

      if (userResult) {
        const userPlan = (userResult.plan as string) || 'free';
        const clickLimitCheck = await PlanLimitsService.checkMonthlyClickLimit(env, linkData.user_id, userPlan);

        if (!clickLimitCheck.allowed) {
          console.log(`⚠️  [handleRedirect] Monthly click limit exceeded for user ${linkData.user_id}: ${clickLimitCheck.current}/${clickLimitCheck.limit}`);
          return new Response(generateMonthlyLimitPage(userPlan, clickLimitCheck.current || 0, clickLimitCheck.limit || 0), {
            status: 429,
            headers: { 'Content-Type': 'text/html' }
          });
        }
      }
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
        // Check for country-specific route first
        if (linkData.geo_routing[country]) {
          destination = linkData.geo_routing[country];
        } else if (linkData.geo_routing['default']) {
          // Fallback to default route for unmatched countries
          destination = linkData.geo_routing['default'];
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

    // Log redirect to R2 (async, don't block redirect)
    if (logger && linkData.user_id !== 'anonymous') {
      const userAgent = request.headers.get('user-agent') || '';
      const country = request.headers.get('cf-ipcountry') || 'XX';
      const city = request.headers.get('cf-ipcity') || '';
      const referrer = request.headers.get('referer') || 'direct';
      const clientIpForLog = request.headers.get('cf-connecting-ip') || '0.0.0.0';

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

      ctx.waitUntil(
        logger.logRedirect(linkData.user_id, {
          request_id: requestId,
          slug,
          destination,
          visitor_ip: clientIpForLog,
          country,
          city,
          device,
          browser,
          os,
          referrer
        }).catch(err => console.error('R2 redirect log failed:', err))
      );
    }

    // Return redirect (FR-2.1: 302 temporary for editable links)
    // Using 302 instead of 301 to prevent aggressive browser caching
    // This allows users to edit destinations and see changes immediately
    console.log(`🎯 [handleRedirect] FINAL REDIRECT DECISION:`);
    console.log(`   Slug: ${slug}`);
    console.log(`   Final destination: ${destination}`);
    console.log(`   Redirect status: 302`);
    console.log(`✅ [handleRedirect] SUCCESS - Returning redirect response`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    return Response.redirect(destination, 302);
  } catch (error) {
    console.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.error(`❌❌❌ [handleRedirect] CRITICAL ERROR`);
    console.error(`   Slug: ${slug}`);
    console.error(`   Error:`, error);
    console.error(`   Error stack:`, (error as Error).stack);
    console.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
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
    console.warn('ANALYTICS_ENGINE not configured, using D1 fallback');
  }

  // ALWAYS write to D1 as fallback/backup (FR-3 requirement)
  // This ensures analytics work even without Analytics Engine
  try {
    const eventId = crypto.randomUUID();
    const ua = request.headers.get('user-agent') || '';

    // Create IP hash for unique visitor counting (GDPR compliant)
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const ipHashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(ip + slug) // Salt with slug for privacy
    );
    const ipHash = Array.from(new Uint8Array(ipHashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    await env.DB.prepare(`
      INSERT INTO analytics_events (
        event_id, slug, user_id, timestamp, country, city,
        device, browser, os, referrer, user_agent, ip_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      eventId,
      slug,
      linkData.user_id,
      new Date().toISOString(),
      country,
      city,
      device,
      browser,
      os,
      referrer,
      ua,
      ipHash
    ).run();

    console.log(`[trackAnalytics] Recorded event ${eventId} for ${slug}`);
  } catch (error) {
    console.error('[trackAnalytics] D1 write failed:', error);
    // Don't throw - analytics failure shouldn't block redirects
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
      // Update D1 database (increment click count and update last clicked timestamp)
      const dbResult = await env.DB.prepare(`
        UPDATE links
        SET click_count = click_count + 1,
            last_clicked_at = CURRENT_TIMESTAMP
        WHERE slug = ?
      `).bind(slug).run();
      console.log(`[incrementClickCount] Updated D1 database, rows affected: ${dbResult.meta.changes}`);

      // Update persistent monthly click counter (survives link deletion)
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth() + 1; // 1-12
      const statId = `${userId}-${year}-${month}`;

      await env.DB.prepare(`
        INSERT INTO user_monthly_stats (stat_id, user_id, year, month, total_clicks, updated_at)
        VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, year, month)
        DO UPDATE SET
          total_clicks = total_clicks + 1,
          updated_at = CURRENT_TIMESTAMP
      `).bind(statId, userId, year, month).run();
      console.log(`[incrementClickCount] Updated monthly stats for ${userId}: ${year}-${month}`);

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
 * Generate HTML not found page
 */
function generateNotFoundPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Link Not Found - EdgeLink</title>
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
      max-width: 500px;
      width: 100%;
      text-align: center;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 40px;
    }
    h1 {
      font-size: 28px;
      color: #1a202c;
      margin-bottom: 16px;
    }
    p {
      color: #718096;
      margin-bottom: 32px;
      font-size: 16px;
      line-height: 1.6;
    }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }
    .btn:active {
      transform: translateY(0);
    }
    .info {
      margin-top: 24px;
      padding: 16px;
      background: #f7fafc;
      border-radius: 8px;
      font-size: 14px;
      color: #4a5568;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🔍</div>
    <h1>Link Not Found</h1>
    <p>This link doesn't exist or may have been deleted.</p>
    <a href="/" class="btn">Go to EdgeLink</a>
    <div class="info">
      Double-check the URL or contact the person who shared this link.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate HTML expired link page
 */
function generateExpiredPage(reason: 'time' | 'clicks'): string {
  const title = reason === 'time' ? 'Link Expired' : 'Link Unavailable';
  const message = reason === 'time'
    ? 'This link has expired and is no longer available.'
    : 'This link has reached its maximum click limit and is no longer available.';
  const icon = reason === 'time' ? '⏰' : '🚫';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - EdgeLink</title>
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
      max-width: 500px;
      width: 100%;
      text-align: center;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #fc8181 0%, #f56565 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 40px;
    }
    h1 {
      font-size: 28px;
      color: #1a202c;
      margin-bottom: 16px;
    }
    p {
      color: #718096;
      margin-bottom: 32px;
      font-size: 16px;
      line-height: 1.6;
    }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }
    .btn:active {
      transform: translateY(0);
    }
    .info {
      margin-top: 24px;
      padding: 16px;
      background: #f7fafc;
      border-radius: 8px;
      font-size: 14px;
      color: #4a5568;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/" class="btn">Go to EdgeLink</a>
    <div class="info">
      If you believe this is an error, please contact the link owner.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate HTML monthly limit exceeded page
 */
function generateMonthlyLimitPage(plan: string, current: number, limit: number): string {
  const upgradeMessage = plan === 'free'
    ? 'Upgrade to Pro for 500,000 clicks per month.'
    : 'Your monthly click limit has been reached. It will reset next month.';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monthly Limit Reached - EdgeLink</title>
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
      max-width: 500px;
      width: 100%;
      text-align: center;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 40px;
    }
    h1 {
      font-size: 28px;
      color: #1a202c;
      margin-bottom: 16px;
    }
    p {
      color: #718096;
      margin-bottom: 20px;
      font-size: 16px;
      line-height: 1.6;
    }
    .stats {
      background: #f7fafc;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .stats-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .stats-row:last-child {
      border-bottom: none;
    }
    .stats-label {
      color: #4a5568;
      font-weight: 500;
    }
    .stats-value {
      color: #ed8936;
      font-weight: 600;
    }
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      transition: transform 0.2s, box-shadow 0.2s;
      margin-top: 16px;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }
    .btn:active {
      transform: translateY(0);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚠️</div>
    <h1>Monthly Click Limit Reached</h1>
    <p>This link owner has reached their monthly click limit.</p>

    <div class="stats">
      <div class="stats-row">
        <span class="stats-label">Plan:</span>
        <span class="stats-value">${plan.toUpperCase()}</span>
      </div>
      <div class="stats-row">
        <span class="stats-label">Clicks Used:</span>
        <span class="stats-value">${current.toLocaleString()} / ${limit.toLocaleString()}</span>
      </div>
    </div>

    <p style="font-size: 14px;">${upgradeMessage}</p>

    <a href="/" class="btn">Go to EdgeLink</a>
  </div>
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
