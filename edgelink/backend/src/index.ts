/**
 * EdgeLink Backend - Main Worker Entry Point
 * Developer-first URL shortener on Cloudflare Edge
 *
 * Based on PRD v4.1 - Week 1 Implementation
 */

import type { Env } from './types';
import { authenticate, requireAuth } from './middleware/auth';
import { requireClerkAuth } from './middleware/clerk-auth';
import { checkRateLimit, addRateLimitHeaders } from './middleware/ratelimit';
import { handleShorten } from './handlers/shorten';
import { handleRedirect } from './handlers/redirect';
import { handleSignup, handleLogin, handleRefresh, handleLogout } from './handlers/auth';
import { handleGetProfile, handleUpdateProfile, handleDeleteAccount, handleRequestAccountDeletion, handleCancelAccountDeletion, handleExportUserData } from './handlers/user';
import { handleGetAnalytics, handleGetAnalyticsSummary } from './handlers/analytics';
import { handleAddDomain, handleVerifyDomain, handleGetDomains, handleDeleteDomain } from './handlers/domains';
import { handleGenerateAPIKey, handleGetAPIKeys, handleRevokeAPIKey } from './handlers/apikeys';
import { handleGetLinks, handleUpdateLink, handleDeleteLink, handleGenerateQR } from './handlers/links';
import { handleCreateWebhook, handleGetWebhooks, handleDeleteWebhook } from './handlers/webhooks';
import { handleSuggestSlug } from './handlers/slug-suggestions';
import { handleLinkPreview } from './handlers/link-preview';
import { handleExportAnalytics, handleExportLinks } from './handlers/export';
import { handleBulkImport } from './handlers/bulk-import';
import { handleCreateABTest, handleGetABTestResults, handleDeleteABTest } from './handlers/ab-testing';
import { handleSetDeviceRouting, handleSetGeoRouting, handleSetTimeRouting, handleSetReferrerRouting, handleGetRouting, handleDeleteRouting } from './handlers/routing';
import { handleClerkWebhook } from './handlers/clerk-webhook';

/**
 * Main worker fetch handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Add CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Link-Password',
      'Access-Control-Max-Age': '86400'
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      // 🔍 DEEP LOGGING: Log all incoming requests with detailed info
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📥 INCOMING REQUEST`);
      console.log(`   Method: ${method}`);
      console.log(`   Full URL: ${request.url}`);
      console.log(`   Hostname: ${url.hostname}`);
      console.log(`   Path: ${path}`);
      console.log(`   Query: ${url.search}`);
      console.log(`   CF Ray: ${request.headers.get('cf-ray') || 'none'}`);
      console.log(`   CF Connecting IP: ${request.headers.get('cf-connecting-ip') || 'none'}`);
      console.log(`   CF Country: ${request.headers.get('cf-ipcountry') || 'none'}`);
      console.log(`   User Agent: ${request.headers.get('user-agent')?.substring(0, 50) || 'none'}...`);
      console.log(`   Referer: ${request.headers.get('referer') || 'none'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Route matching
      // Health check
      if (path === '/health' && method === 'GET') {
        console.log('✅ Health check endpoint hit');

        return new Response(
          JSON.stringify({
            status: 'healthy',
            timestamp: Date.now(),
            version: '1.0.0'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Manual cleanup endpoint (for testing)
      if (path === '/api/cleanup/expired' && method === 'POST') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        try {
          // Delete expired authenticated links
          const linksResult = await env.DB.prepare(`
            DELETE FROM links
            WHERE expires_at IS NOT NULL
            AND expires_at < datetime('now')
          `).run();

          // Delete expired anonymous links
          const anonResult = await env.DB.prepare(`
            DELETE FROM anonymous_links
            WHERE expires_at < datetime('now')
          `).run();

          const totalDeleted = (linksResult.meta.changes || 0) + (anonResult.meta.changes || 0);

          return new Response(
            JSON.stringify({
              message: 'Cleanup completed successfully',
              deleted: {
                authenticated_links: linksResult.meta.changes || 0,
                anonymous_links: anonResult.meta.changes || 0,
                total: totalDeleted
              }
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({
              error: 'Cleanup failed',
              code: 'CLEANUP_FAILED'
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }

      // Authentication endpoints (no auth required)
      if (path === '/auth/signup' && method === 'POST') {
        const response = await handleSignup(request, env);
        return addCorsHeaders(response, corsHeaders);
      }

      if (path === '/auth/login' && method === 'POST') {
        const response = await handleLogin(request, env);
        return addCorsHeaders(response, corsHeaders);
      }

      if (path === '/auth/refresh' && method === 'POST') {
        const response = await handleRefresh(request, env);
        return addCorsHeaders(response, corsHeaders);
      }

      if (path === '/auth/logout' && method === 'POST') {
        const response = await handleLogout(request, env);
        return addCorsHeaders(response, corsHeaders);
      }

      // URL shortening endpoint (anonymous or authenticated)
      if (path === '/api/shorten' && method === 'POST') {
        // Authenticate with Clerk (optional for this endpoint - supports anonymous)
        const authHeader = request.headers.get('Authorization');
        let user = null;

        if (authHeader) {
          const { user: clerkUser, error: authError } = await requireClerkAuth(request, env);
          if (authError) {
            return addCorsHeaders(authError, corsHeaders);
          }
          user = clerkUser;
        }

        // Check rate limit
        const { success, info, error: rateLimitError } = await checkRateLimit(
          request,
          env,
          user?.user_id
        );

        if (!success && rateLimitError) {
          return addCorsHeaders(rateLimitError, corsHeaders);
        }

        // Handle shortening
        const response = await handleShorten(request, env, user);
        const finalResponse = addRateLimitHeaders(response, info);
        return addCorsHeaders(finalResponse, corsHeaders);
      }

      // Get user's links (authenticated)
      if (path === '/api/links' && method === 'GET') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        // Check rate limit
        const { success, info, error: rateLimitError } = await checkRateLimit(
          request,
          env,
          user
        );

        if (!success && rateLimitError) {
          return addCorsHeaders(rateLimitError, corsHeaders);
        }

        // Pass search parameters for pagination and filtering
        const response = await handleGetLinks(env, user.user_id, url.searchParams);
        const finalResponse = addRateLimitHeaders(response, info);
        return addCorsHeaders(finalResponse, corsHeaders);
      }

      // Update link (authenticated) - Week 4 Enhanced
      if (path.startsWith('/api/links/') && !path.includes('/qr') && method === 'PUT') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const slug = path.split('/')[3];
        const response = await handleUpdateLink(request, env, user.user_id, slug, user.plan);
        return addCorsHeaders(response, corsHeaders);
      }

      // Delete link (authenticated)
      if (path.startsWith('/api/links/') && !path.includes('/qr') && method === 'DELETE') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const slug = path.split('/')[3];
        const response = await handleDeleteLink(env, user.user_id, slug);
        return addCorsHeaders(response, corsHeaders);
      }

      // Generate QR code (authenticated, Pro only) - Week 4
      if (path.startsWith('/api/links/') && path.endsWith('/qr') && method === 'GET') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const slug = path.split('/')[3];
        const format = (url.searchParams.get('format') as 'svg' | 'png') || 'svg';
        const response = await handleGenerateQR(env, user.user_id, slug, user.plan, format);
        return addCorsHeaders(response, corsHeaders);
      }

      // Get link stats (authenticated) - Legacy endpoint
      if (path.startsWith('/api/stats/') && method === 'GET') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const slug = path.split('/')[3];
        const response = await handleGetStats(env, user.user_id, slug);
        return addCorsHeaders(response, corsHeaders);
      }

      // Get detailed analytics for a link (authenticated)
      if (path.startsWith('/api/analytics/') && path.split('/').length === 4 && method === 'GET') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const slug = path.split('/')[3];
        const url = new URL(request.url);
        const timeRange = (url.searchParams.get('range') as '7d' | '30d') || '7d';
        const response = await handleGetAnalytics(env, user.user_id, slug, timeRange);
        return addCorsHeaders(response, corsHeaders);
      }

      // Get analytics summary (authenticated)
      if (path === '/api/analytics/summary' && method === 'GET') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleGetAnalyticsSummary(env, user.user_id);
        return addCorsHeaders(response, corsHeaders);
      }

      // Custom Domains endpoints (Week 3)
      // POST /api/domains - Add a new custom domain
      if (path === '/api/domains' && method === 'POST') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleAddDomain(request, env, user.user_id, user.plan);
        return addCorsHeaders(response, corsHeaders);
      }

      // GET /api/domains - Get user's domains
      if (path === '/api/domains' && method === 'GET') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleGetDomains(env, user.user_id);
        return addCorsHeaders(response, corsHeaders);
      }

      // POST /api/domains/:domainId/verify - Verify domain ownership
      if (path.startsWith('/api/domains/') && path.endsWith('/verify') && method === 'POST') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const domainId = path.split('/')[3];
        const response = await handleVerifyDomain(env, user.user_id, domainId);
        return addCorsHeaders(response, corsHeaders);
      }

      // DELETE /api/domains/:domainId - Delete domain
      if (path.startsWith('/api/domains/') && path.split('/').length === 4 && method === 'DELETE') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const domainId = path.split('/')[3];
        const response = await handleDeleteDomain(env, user.user_id, domainId);
        return addCorsHeaders(response, corsHeaders);
      }

      // API Keys endpoints (Week 3)
      // POST /api/keys - Generate new API key
      if (path === '/api/keys' && method === 'POST') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleGenerateAPIKey(request, env, user.user_id);
        return addCorsHeaders(response, corsHeaders);
      }

      // GET /api/keys - Get user's API keys
      if (path === '/api/keys' && method === 'GET') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleGetAPIKeys(env, user.user_id);
        return addCorsHeaders(response, corsHeaders);
      }

      // DELETE /api/keys/:keyId - Revoke API key
      if (path.startsWith('/api/keys/') && method === 'DELETE') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const keyId = path.split('/')[3];
        const response = await handleRevokeAPIKey(env, user.user_id, keyId);
        return addCorsHeaders(response, corsHeaders);
      }

      // Webhooks endpoints (Week 4)
      // POST /api/webhooks - Create new webhook
      if (path === '/api/webhooks' && method === 'POST') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleCreateWebhook(request, env, user.user_id, user.plan);
        return addCorsHeaders(response, corsHeaders);
      }

      // GET /api/webhooks - Get user's webhooks
      if (path === '/api/webhooks' && method === 'GET') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleGetWebhooks(env, user.user_id);
        return addCorsHeaders(response, corsHeaders);
      }

      // DELETE /api/webhooks/:webhookId - Delete webhook
      if (path.startsWith('/api/webhooks/') && method === 'DELETE') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const webhookId = path.split('/')[3];
        const response = await handleDeleteWebhook(env, user.user_id, webhookId);
        return addCorsHeaders(response, corsHeaders);
      }

      // Week 5 Features

      // POST /api/suggest-slug - AI slug suggestions (authenticated optional)
      if (path === '/api/suggest-slug' && method === 'POST') {
        const response = await handleSuggestSlug(request, env);
        return addCorsHeaders(response, corsHeaders);
      }

      // POST /api/preview - Link preview with Open Graph
      if (path === '/api/preview' && method === 'POST') {
        const response = await handleLinkPreview(request, env);
        return addCorsHeaders(response, corsHeaders);
      }

      // GET /api/export/analytics/:slug - Export analytics
      if (path.startsWith('/api/export/analytics/') && method === 'GET') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const slug = path.split('/')[4];
        const format = (url.searchParams.get('format') as 'csv' | 'json') || 'json';
        const timeRange = (url.searchParams.get('range') as '7d' | '30d' | '90d' | 'all') || '30d';
        const response = await handleExportAnalytics(env, user.user_id, slug, format, timeRange);
        return addCorsHeaders(response, corsHeaders);
      }

      // GET /api/export/links - Export all user links
      if (path === '/api/export/links' && method === 'GET') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const format = (url.searchParams.get('format') as 'csv' | 'json') || 'json';
        const response = await handleExportLinks(env, user.user_id, format);
        return addCorsHeaders(response, corsHeaders);
      }

      // POST /api/import/links - Bulk import links from CSV
      if (path === '/api/import/links' && method === 'POST') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleBulkImport(request, env, user.user_id, user.plan);
        return addCorsHeaders(response, corsHeaders);
      }

      // User Profile endpoints
      // GET /api/user/profile - Get user profile
      if (path === '/api/user/profile' && method === 'GET') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleGetProfile(request, env, user.user_id);
        return addCorsHeaders(response, corsHeaders);
      }

      // PUT /api/user/profile - Update user profile
      if (path === '/api/user/profile' && method === 'PUT') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleUpdateProfile(request, env, user.user_id);
        return addCorsHeaders(response, corsHeaders);
      }

      // POST /api/user/delete - Delete account (immediate)
      if (path === '/api/user/delete' && method === 'POST') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleDeleteAccount(request, env, user.user_id);
        return addCorsHeaders(response, corsHeaders);
      }

      // POST /api/user/request-deletion - Request account deletion (30-day grace period)
      if (path === '/api/user/request-deletion' && method === 'POST') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleRequestAccountDeletion(request, env, user.user_id);
        return addCorsHeaders(response, corsHeaders);
      }

      // POST /api/user/cancel-deletion - Cancel account deletion request
      if (path === '/api/user/cancel-deletion' && method === 'POST') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleCancelAccountDeletion(request, env, user.user_id);
        return addCorsHeaders(response, corsHeaders);
      }

      // GET /api/user/export - Export user data (GDPR)
      if (path === '/api/user/export' && method === 'GET') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleExportUserData(request, env, user.user_id);
        return addCorsHeaders(response, corsHeaders);
      }

      // A/B Testing endpoints
      // POST /api/links/:slug/ab-test - Create A/B test
      if (path.startsWith('/api/links/') && path.endsWith('/ab-test') && method === 'POST') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleCreateABTest(request, env, user.user_id, user.plan || 'free');
        return addCorsHeaders(response, corsHeaders);
      }

      // GET /api/links/:slug/ab-test - Get A/B test results
      if (path.startsWith('/api/links/') && path.endsWith('/ab-test') && method === 'GET') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleGetABTestResults(request, env, user.user_id);
        return addCorsHeaders(response, corsHeaders);
      }

      // DELETE /api/links/:slug/ab-test - Stop A/B test
      if (path.startsWith('/api/links/') && path.endsWith('/ab-test') && method === 'DELETE') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleDeleteABTest(request, env, user.user_id);
        return addCorsHeaders(response, corsHeaders);
      }

      // Smart Routing endpoints
      // POST /api/links/:slug/routing/device - Set device routing
      if (path.startsWith('/api/links/') && path.includes('/routing/device') && method === 'POST') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleSetDeviceRouting(request, env, user.user_id);
        return addCorsHeaders(response, corsHeaders);
      }

      // POST /api/links/:slug/routing/geo - Set geographic routing
      if (path.startsWith('/api/links/') && path.includes('/routing/geo') && method === 'POST') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleSetGeoRouting(request, env, user.user_id);
        return addCorsHeaders(response, corsHeaders);
      }

      // POST /api/links/:slug/routing/time - Set time-based routing
      if (path.startsWith('/api/links/') && path.includes('/routing/time') && method === 'POST') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleSetTimeRouting(request, env, user.user_id);
        return addCorsHeaders(response, corsHeaders);
      }

      // POST /api/links/:slug/routing/referrer - Set referrer-based routing
      if (path.startsWith('/api/links/') && path.includes('/routing/referrer') && method === 'POST') {
        const { user, error} = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleSetReferrerRouting(request, env, user.user_id);
        return addCorsHeaders(response, corsHeaders);
      }

      // GET /api/links/:slug/routing - Get all routing config
      if (path.startsWith('/api/links/') && path.endsWith('/routing') && method === 'GET') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleGetRouting(request, env, user.user_id);
        return addCorsHeaders(response, corsHeaders);
      }

      // DELETE /api/links/:slug/routing - Delete all routing
      if (path.startsWith('/api/links/') && path.endsWith('/routing') && method === 'DELETE') {
        const { user, error } = await requireClerkAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleDeleteRouting(request, env, user.user_id);
        return addCorsHeaders(response, corsHeaders);
      }

      // Clerk Webhook endpoint (public, signature-verified)
      // POST /webhooks/clerk - Sync user events from Clerk
      if (path === '/webhooks/clerk' && method === 'POST') {
        const response = await handleClerkWebhook(request, env);
        return addCorsHeaders(response, corsHeaders);
      }

      // Redirect endpoint (public, no auth)
      // This should be the last route to avoid conflicts
      if (path.length > 1 && method === 'GET') {
        const slug = path.slice(1); // Remove leading slash

        console.log(`🔄 REDIRECT HANDLER TRIGGERED`);
        console.log(`   Slug: ${slug}`);
        console.log(`   Hostname: ${url.hostname}`);

        // Skip if it looks like an API path
        if (slug.startsWith('api/') || slug.startsWith('auth/')) {
          console.log(`⚠️  Skipping - looks like API path`);
          return new Response('Not found', {
            status: 404,
            headers: corsHeaders
          });
        }

        console.log(`➡️  Calling handleRedirect for slug: ${slug}`);
        const response = await handleRedirect(request, env, slug, ctx);
        console.log(`✅ Redirect response status: ${response.status}`);
        return addCorsHeaders(response, corsHeaders);
      }

      // 404 Not Found
      return new Response(
        JSON.stringify({
          error: 'Not found',
          code: 'NOT_FOUND'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  },

  /**
   * Scheduled handler for periodic cleanup tasks
   * Runs every hour to delete expired links
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('[Cron] Starting scheduled cleanup task');

    try {
      // Clean up expired links from D1 database
      const now = new Date().toISOString();

      // Delete expired authenticated links
      const linksResult = await env.DB.prepare(`
        DELETE FROM links
        WHERE expires_at IS NOT NULL
        AND expires_at < datetime('now')
      `).run();

      // Delete expired anonymous links
      const anonResult = await env.DB.prepare(`
        DELETE FROM anonymous_links
        WHERE expires_at < datetime('now')
      `).run();

      const totalDeleted = (linksResult.meta.changes || 0) + (anonResult.meta.changes || 0);

      console.log(`[Cron] Cleanup complete: Deleted ${totalDeleted} expired links`);
      console.log(`[Cron] - Authenticated links: ${linksResult.meta.changes || 0}`);
      console.log(`[Cron] - Anonymous links: ${anonResult.meta.changes || 0}`);

      // Note: KV entries auto-expire via TTL, no need to manually delete
    } catch (error) {
      console.error('[Cron] Cleanup failed:', error);
    }
  }
};

/**
 * Add CORS headers to response
 */
function addCorsHeaders(response: Response, corsHeaders: Record<string, string>): Response {
  const newResponse = new Response(response.body, response);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });
  return newResponse;
}

/**
 * Handle GET /api/links - Get user's links
 */

/**
 * Handle GET /api/stats/:slug - Get link analytics
 */
async function handleGetStats(
  env: Env,
  userId: string,
  slug: string
): Promise<Response> {
  try {
    // Verify ownership
    const link = await env.DB.prepare(`
      SELECT user_id, click_count, created_at FROM links WHERE slug = ?
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

    // TODO: Query Analytics Engine for detailed stats
    // For now, return basic stats from D1
    return new Response(
      JSON.stringify({
        slug,
        total_clicks: link.click_count,
        created_at: link.created_at,
        analytics: {
          message: 'Detailed analytics coming soon'
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch stats',
        code: 'STATS_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
