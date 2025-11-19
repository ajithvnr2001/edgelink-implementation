/**
 * EdgeLink Backend - Main Worker Entry Point
 * Developer-first URL shortener on Cloudflare Edge
 *
 * Based on PRD v4.1 - Week 1 Implementation
 */

import type { Env } from './types';
import { authenticate, requireAuth } from './middleware/auth';
import { checkRateLimit, checkAuthRateLimit, addRateLimitHeaders } from './middleware/ratelimit';
import { createR2LogService, R2LogService } from './services/logs/r2LogService';
import { handleShorten } from './handlers/shorten';
import { handleRedirect } from './handlers/redirect';
import { handleSignup, handleLogin, handleRefresh, handleLogout } from './handlers/auth';
import { handleGetProfile, handleUpdateProfile, handleDeleteAccount, handleRequestAccountDeletion, handleCancelAccountDeletion, handleExportUserData } from './handlers/user';
import { handleGetUsage } from './handlers/usage';
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
import { handleCreateGroup, handleGetGroups, handleGetGroup, handleUpdateGroup, handleDeleteGroup, handleAddLinksToGroup, handleRemoveLinksFromGroup, handleMoveLink, handleBulkMoveLinks } from './handlers/groups';
import { handleGetGroupAnalytics, handleGetOverallAnalytics, handleCompareGroups } from './handlers/group-analytics';
import { handleVerifyEmail } from './handlers/auth/verify-email';
import { handleResendVerification } from './handlers/auth/resend-verification';
import { handleRequestPasswordReset } from './handlers/auth/request-reset';
import { handleResetPassword } from './handlers/auth/reset-password';
import { handleCreateCheckout } from './handlers/payments/create-checkout';
import { handleDodoPaymentsWebhook } from './handlers/payments/webhook';
import { handleGetSubscriptionStatus } from './handlers/payments/subscription-status';
import { handleCreateCustomerPortal } from './handlers/payments/customer-portal';
import { handleGetPaymentHistory } from './handlers/payments/payment-history';
import { handleResendWebhook } from './handlers/email/resend-webhook';
import { dailyCleanup } from './cron/dailyCleanup';

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

    // Initialize R2 logging service
    const logger = createR2LogService(env);
    const requestId = logger.generateRequestId();
    const startTime = Date.now();

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
        const { user, error } = await requireAuth(request, env);
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

      // Authentication endpoints (no auth required, but rate limited)
      if (path === '/auth/signup' && method === 'POST') {
        // Check auth rate limit for signup
        const { success, error: rateLimitError } = await checkAuthRateLimit(request, env, 'signup');
        if (!success && rateLimitError) {
          return addCorsHeaders(rateLimitError, corsHeaders);
        }

        const response = await handleSignup(request, env);
        return addCorsHeaders(response, corsHeaders);
      }

      if (path === '/auth/login' && method === 'POST') {
        // Check auth rate limit for login
        const { success, error: rateLimitError } = await checkAuthRateLimit(request, env, 'login');
        if (!success && rateLimitError) {
          return addCorsHeaders(rateLimitError, corsHeaders);
        }

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

      // Email verification endpoints (no auth required)
      if (path === '/auth/verify-email' && method === 'POST') {
        const response = await handleVerifyEmail(request, env);
        return addCorsHeaders(response, corsHeaders);
      }

      if (path === '/auth/resend-verification' && method === 'POST') {
        const response = await handleResendVerification(request, env);
        return addCorsHeaders(response, corsHeaders);
      }

      if (path === '/auth/request-reset' && method === 'POST') {
        // Check auth rate limit for password reset
        const { success, error: rateLimitError } = await checkAuthRateLimit(request, env, 'reset');
        if (!success && rateLimitError) {
          return addCorsHeaders(rateLimitError, corsHeaders);
        }

        const response = await handleRequestPasswordReset(request, env);
        return addCorsHeaders(response, corsHeaders);
      }

      if (path === '/auth/reset-password' && method === 'POST') {
        const response = await handleResetPassword(request, env);
        return addCorsHeaders(response, corsHeaders);
      }

      // Payment endpoints (authenticated)
      if (path === '/api/payments/create-checkout' && method === 'POST') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleCreateCheckout(request, env, user.sub);
        return addCorsHeaders(response, corsHeaders);
      }

      if (path === '/api/payments/subscription-status' && method === 'GET') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleGetSubscriptionStatus(env, user.sub);
        return addCorsHeaders(response, corsHeaders);
      }

      if (path === '/api/payments/customer-portal' && method === 'POST') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleCreateCustomerPortal(request, env, user.sub);
        return addCorsHeaders(response, corsHeaders);
      }

      if (path === '/api/payments/history' && method === 'GET') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleGetPaymentHistory(env, user.sub);
        return addCorsHeaders(response, corsHeaders);
      }

      // DodoPayments webhook (no auth - verified by signature)
      if (path === '/webhooks/dodopayments' && method === 'POST') {
        const response = await handleDodoPaymentsWebhook(request, env);
        return addCorsHeaders(response, corsHeaders);
      }

      // Resend webhook (no auth - email delivery tracking)
      if (path === '/webhooks/resend' && method === 'POST') {
        const response = await handleResendWebhook(request, env);
        return addCorsHeaders(response, corsHeaders);
      }

      // URL shortening endpoint (anonymous or authenticated)
      if (path === '/api/shorten' && method === 'POST') {
        // Authenticate (optional for this endpoint)
        const { user, error: authError } = await authenticate(request, env);
        if (authError) {
          return addCorsHeaders(authError, corsHeaders);
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

        // Handle shortening
        const response = await handleShorten(request, env, user);
        const finalResponse = addRateLimitHeaders(response, info);

        // Log API request to R2 for authenticated users
        if (user) {
          ctx.waitUntil(
            logApiRequest(logger, user.sub, request, response, requestId, startTime)
              .catch(err => console.error('R2 API log failed:', err))
          );
        }

        return addCorsHeaders(finalResponse, corsHeaders);
      }

      // Get user's links (authenticated)
      if (path === '/api/links' && method === 'GET') {
        const { user, error } = await requireAuth(request, env);
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
        const response = await handleGetLinks(env, user.sub, url.searchParams);
        const finalResponse = addRateLimitHeaders(response, info);

        // Log API request to R2
        ctx.waitUntil(
          logApiRequest(logger, user.sub, request, response, requestId, startTime)
            .catch(err => console.error('R2 API log failed:', err))
        );

        return addCorsHeaders(finalResponse, corsHeaders);
      }

      // Update link (authenticated) - Week 4 Enhanced
      if (path.startsWith('/api/links/') && !path.includes('/qr') && !path.endsWith('/group') && method === 'PUT') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const slug = path.split('/')[3];
        const response = await handleUpdateLink(request, env, user.sub, slug, user.plan);
        return addCorsHeaders(response, corsHeaders);
      }

      // Delete link (authenticated)
      if (path.startsWith('/api/links/') && !path.includes('/qr') && method === 'DELETE') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const slug = path.split('/')[3];
        const response = await handleDeleteLink(env, user.sub, slug);

        // Log API request to R2
        ctx.waitUntil(
          logApiRequest(logger, user.sub, request, response, requestId, startTime)
            .catch(err => console.error('R2 API log failed:', err))
        );

        return addCorsHeaders(response, corsHeaders);
      }

      // Generate QR code (authenticated, Pro only) - Week 4
      if (path.startsWith('/api/links/') && path.endsWith('/qr') && method === 'GET') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const slug = path.split('/')[3];
        const format = (url.searchParams.get('format') as 'svg' | 'png') || 'svg';
        const response = await handleGenerateQR(env, user.sub, slug, user.plan, format);
        return addCorsHeaders(response, corsHeaders);
      }

      // Get link stats (authenticated) - Legacy endpoint
      if (path.startsWith('/api/stats/') && method === 'GET') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const slug = path.split('/')[3];
        const response = await handleGetStats(env, user.sub, slug);
        return addCorsHeaders(response, corsHeaders);
      }

      // Get detailed analytics for a link (authenticated)
      // Exclude reserved paths: overview, summary, groups
      if (path.startsWith('/api/analytics/') && path.split('/').length === 4 && method === 'GET') {
        const slug = path.split('/')[3];

        // Skip reserved paths - they have their own handlers
        if (slug === 'overview' || slug === 'summary' || slug === 'groups') {
          // Let it fall through to the specific handlers below
        } else {
          const { user, error } = await requireAuth(request, env);
          if (error) {
            return addCorsHeaders(error, corsHeaders);
          }

          const url = new URL(request.url);
          const timeRange = (url.searchParams.get('range') as '7d' | '30d') || '7d';
          const response = await handleGetAnalytics(env, user.sub, slug, timeRange);
          return addCorsHeaders(response, corsHeaders);
        }
      }

      // Get analytics summary (authenticated)
      if (path === '/api/analytics/summary' && method === 'GET') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleGetAnalyticsSummary(env, user.sub);
        return addCorsHeaders(response, corsHeaders);
      }

      // Custom Domains endpoints (Week 3)
      // POST /api/domains - Add a new custom domain
      if (path === '/api/domains' && method === 'POST') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleAddDomain(request, env, user.sub, user.plan);
        return addCorsHeaders(response, corsHeaders);
      }

      // GET /api/domains - Get user's domains
      if (path === '/api/domains' && method === 'GET') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleGetDomains(env, user.sub);
        return addCorsHeaders(response, corsHeaders);
      }

      // POST /api/domains/:domainId/verify - Verify domain ownership
      if (path.startsWith('/api/domains/') && path.endsWith('/verify') && method === 'POST') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const domainId = path.split('/')[3];
        const response = await handleVerifyDomain(env, user.sub, domainId);
        return addCorsHeaders(response, corsHeaders);
      }

      // DELETE /api/domains/:domainId - Delete domain
      if (path.startsWith('/api/domains/') && path.split('/').length === 4 && method === 'DELETE') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const domainId = path.split('/')[3];
        const response = await handleDeleteDomain(env, user.sub, domainId);
        return addCorsHeaders(response, corsHeaders);
      }

      // API Keys endpoints (Week 3)
      // POST /api/keys - Generate new API key
      if (path === '/api/keys' && method === 'POST') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleGenerateAPIKey(request, env, user.sub, user.plan);
        return addCorsHeaders(response, corsHeaders);
      }

      // GET /api/keys - Get user's API keys
      if (path === '/api/keys' && method === 'GET') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleGetAPIKeys(env, user.sub);
        return addCorsHeaders(response, corsHeaders);
      }

      // DELETE /api/keys/:keyId - Revoke API key
      if (path.startsWith('/api/keys/') && method === 'DELETE') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const keyId = path.split('/')[3];
        const response = await handleRevokeAPIKey(env, user.sub, keyId);
        return addCorsHeaders(response, corsHeaders);
      }

      // Webhooks endpoints (Week 4)
      // POST /api/webhooks - Create new webhook
      if (path === '/api/webhooks' && method === 'POST') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleCreateWebhook(request, env, user.sub, user.plan);
        return addCorsHeaders(response, corsHeaders);
      }

      // GET /api/webhooks - Get user's webhooks
      if (path === '/api/webhooks' && method === 'GET') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleGetWebhooks(env, user.sub);
        return addCorsHeaders(response, corsHeaders);
      }

      // DELETE /api/webhooks/:webhookId - Delete webhook
      if (path.startsWith('/api/webhooks/') && method === 'DELETE') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const webhookId = path.split('/')[3];
        const response = await handleDeleteWebhook(env, user.sub, webhookId);
        return addCorsHeaders(response, corsHeaders);
      }

      // Link Groups endpoints (Pro feature)
      // POST /api/groups - Create new group
      if (path === '/api/groups' && method === 'POST') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleCreateGroup(request, env, user.sub, user.plan);
        return addCorsHeaders(response, corsHeaders);
      }

      // GET /api/groups - Get all user's groups
      if (path === '/api/groups' && method === 'GET') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleGetGroups(env, user.sub, user.plan);
        return addCorsHeaders(response, corsHeaders);
      }

      // GET /api/groups/:groupId - Get single group with links
      if (path.startsWith('/api/groups/') && !path.includes('/links') && method === 'GET') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const groupId = path.split('/')[3];
        const response = await handleGetGroup(env, user.sub, groupId, url.searchParams);
        return addCorsHeaders(response, corsHeaders);
      }

      // PUT /api/groups/:groupId - Update group
      if (path.startsWith('/api/groups/') && !path.includes('/links') && method === 'PUT') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const groupId = path.split('/')[3];
        const response = await handleUpdateGroup(request, env, user.sub, groupId);
        return addCorsHeaders(response, corsHeaders);
      }

      // DELETE /api/groups/:groupId - Delete group
      if (path.startsWith('/api/groups/') && !path.includes('/links') && method === 'DELETE') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const groupId = path.split('/')[3];
        const response = await handleDeleteGroup(env, user.sub, groupId);
        return addCorsHeaders(response, corsHeaders);
      }

      // POST /api/groups/:groupId/links - Add links to group
      if (path.startsWith('/api/groups/') && path.endsWith('/links') && method === 'POST') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const groupId = path.split('/')[3];
        const response = await handleAddLinksToGroup(request, env, user.sub, groupId);
        return addCorsHeaders(response, corsHeaders);
      }

      // DELETE /api/groups/:groupId/links - Remove links from group
      if (path.startsWith('/api/groups/') && path.endsWith('/links') && method === 'DELETE') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const groupId = path.split('/')[3];
        const response = await handleRemoveLinksFromGroup(request, env, user.sub, groupId);
        return addCorsHeaders(response, corsHeaders);
      }

      // PUT /api/links/:slug/group - Move single link to group
      if (path.startsWith('/api/links/') && path.endsWith('/group') && method === 'PUT') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const slug = path.split('/')[3];
        const response = await handleMoveLink(request, env, user.sub, slug);
        return addCorsHeaders(response, corsHeaders);
      }

      // POST /api/links/bulk-group - Bulk move links to group
      if (path === '/api/links/bulk-group' && method === 'POST') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleBulkMoveLinks(request, env, user.sub);
        return addCorsHeaders(response, corsHeaders);
      }

      // GET /api/groups/:groupId/analytics - Get group analytics
      if (path.startsWith('/api/groups/') && path.endsWith('/analytics') && method === 'GET') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const groupId = path.split('/')[3];
        const timeRange = (url.searchParams.get('range') as '7d' | '30d') || '7d';
        const response = await handleGetGroupAnalytics(env, user.sub, groupId, timeRange);
        return addCorsHeaders(response, corsHeaders);
      }

      // GET /api/analytics/overview - Get overall analytics for all links
      if (path === '/api/analytics/overview' && method === 'GET') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const timeRange = (url.searchParams.get('range') as '7d' | '30d') || '7d';
        const response = await handleGetOverallAnalytics(env, user.sub, user.plan, timeRange);
        return addCorsHeaders(response, corsHeaders);
      }

      // GET /api/analytics/groups/compare - Compare analytics between groups
      if (path === '/api/analytics/groups/compare' && method === 'GET') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleCompareGroups(request, env, user.sub, user.plan);
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
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const slug = path.split('/')[4];
        const format = (url.searchParams.get('format') as 'csv' | 'json') || 'json';
        const timeRange = (url.searchParams.get('range') as '7d' | '30d' | '90d' | 'all') || '30d';
        const response = await handleExportAnalytics(env, user.sub, slug, format, timeRange);

        // Log export action to R2
        if (response.status === 200) {
          ctx.waitUntil(
            logger.logExport(user.sub, {
              request_id: requestId,
              export_type: format,
              record_count: 0, // Would need to get actual count from response
              filters: { slug, timeRange }
            }).catch(err => console.error('R2 export log failed:', err))
          );
        }

        // Log API request
        ctx.waitUntil(
          logApiRequest(logger, user.sub, request, response, requestId, startTime)
            .catch(err => console.error('R2 API log failed:', err))
        );

        return addCorsHeaders(response, corsHeaders);
      }

      // GET /api/export/links - Export all user links
      if (path === '/api/export/links' && method === 'GET') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const format = (url.searchParams.get('format') as 'csv' | 'json') || 'json';
        const response = await handleExportLinks(env, user.sub, format, user.plan);

        // Log export action to R2
        if (response.status === 200) {
          ctx.waitUntil(
            logger.logExport(user.sub, {
              request_id: requestId,
              export_type: format,
              record_count: 0,
              filters: { type: 'links' }
            }).catch(err => console.error('R2 export log failed:', err))
          );
        }

        // Log API request
        ctx.waitUntil(
          logApiRequest(logger, user.sub, request, response, requestId, startTime)
            .catch(err => console.error('R2 API log failed:', err))
        );

        return addCorsHeaders(response, corsHeaders);
      }

      // POST /api/import/links - Bulk import links from CSV
      if (path === '/api/import/links' && method === 'POST') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleBulkImport(request, env, user.sub, user.plan);
        return addCorsHeaders(response, corsHeaders);
      }

      // User Profile endpoints
      // GET /api/user/profile - Get user profile
      if (path === '/api/user/profile' && method === 'GET') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleGetProfile(request, env, user.sub);
        return addCorsHeaders(response, corsHeaders);
      }

      // PUT /api/user/profile - Update user profile
      if (path === '/api/user/profile' && method === 'PUT') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleUpdateProfile(request, env, user.sub);
        return addCorsHeaders(response, corsHeaders);
      }

      // POST /api/user/delete - Delete account (immediate)
      if (path === '/api/user/delete' && method === 'POST') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleDeleteAccount(request, env, user.sub);
        return addCorsHeaders(response, corsHeaders);
      }

      // POST /api/user/request-deletion - Request account deletion (30-day grace period)
      if (path === '/api/user/request-deletion' && method === 'POST') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleRequestAccountDeletion(request, env, user.sub);
        return addCorsHeaders(response, corsHeaders);
      }

      // POST /api/user/cancel-deletion - Cancel account deletion request
      if (path === '/api/user/cancel-deletion' && method === 'POST') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleCancelAccountDeletion(request, env, user.sub);
        return addCorsHeaders(response, corsHeaders);
      }

      // GET /api/user/export - Export user data (GDPR)
      if (path === '/api/user/export' && method === 'GET') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleExportUserData(request, env, user.sub);
        return addCorsHeaders(response, corsHeaders);
      }

      // GET /api/usage - Get user's usage and plan limits
      if (path === '/api/usage' && method === 'GET') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleGetUsage(request, env, user.sub, user.plan);
        return addCorsHeaders(response, corsHeaders);
      }

      // A/B Testing endpoints
      // POST /api/links/:slug/ab-test - Create A/B test
      if (path.startsWith('/api/links/') && path.endsWith('/ab-test') && method === 'POST') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleCreateABTest(request, env, user.sub, user.plan || 'free');
        return addCorsHeaders(response, corsHeaders);
      }

      // GET /api/links/:slug/ab-test - Get A/B test results
      if (path.startsWith('/api/links/') && path.endsWith('/ab-test') && method === 'GET') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleGetABTestResults(request, env, user.sub);
        return addCorsHeaders(response, corsHeaders);
      }

      // DELETE /api/links/:slug/ab-test - Stop A/B test
      if (path.startsWith('/api/links/') && path.endsWith('/ab-test') && method === 'DELETE') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleDeleteABTest(request, env, user.sub);
        return addCorsHeaders(response, corsHeaders);
      }

      // Smart Routing endpoints
      // POST /api/links/:slug/routing/device - Set device routing
      if (path.startsWith('/api/links/') && path.includes('/routing/device') && method === 'POST') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleSetDeviceRouting(request, env, user.sub);
        return addCorsHeaders(response, corsHeaders);
      }

      // POST /api/links/:slug/routing/geo - Set geographic routing
      if (path.startsWith('/api/links/') && path.includes('/routing/geo') && method === 'POST') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleSetGeoRouting(request, env, user.sub);
        return addCorsHeaders(response, corsHeaders);
      }

      // POST /api/links/:slug/routing/time - Set time-based routing
      if (path.startsWith('/api/links/') && path.includes('/routing/time') && method === 'POST') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleSetTimeRouting(request, env, user.sub);
        return addCorsHeaders(response, corsHeaders);
      }

      // POST /api/links/:slug/routing/referrer - Set referrer-based routing
      if (path.startsWith('/api/links/') && path.includes('/routing/referrer') && method === 'POST') {
        const { user, error} = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleSetReferrerRouting(request, env, user.sub);
        return addCorsHeaders(response, corsHeaders);
      }

      // GET /api/links/:slug/routing - Get all routing config
      if (path.startsWith('/api/links/') && path.endsWith('/routing') && method === 'GET') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleGetRouting(request, env, user.sub);
        return addCorsHeaders(response, corsHeaders);
      }

      // DELETE /api/links/:slug/routing - Delete all routing
      if (path.startsWith('/api/links/') && path.endsWith('/routing') && method === 'DELETE') {
        const { user, error } = await requireAuth(request, env);
        if (error) {
          return addCorsHeaders(error, corsHeaders);
        }

        const response = await handleDeleteRouting(request, env, user.sub);
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
        const response = await handleRedirect(request, env, slug, ctx, logger, requestId);
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

      // Log system error to R2
      ctx.waitUntil(
        logger.logSystemError({
          request_id: requestId,
          error_type: error instanceof Error ? error.name : 'UnknownError',
          message: error instanceof Error ? error.message : String(error),
          path: new URL(request.url).pathname,
          stack: error instanceof Error ? error.stack : undefined
        })
      );

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
   * Runs daily at 2 AM UTC for:
   * - Cleaning up expired links
   * - Sending 80-day warnings to unverified accounts
   * - Deleting 90-day unverified accounts
   * - Cleaning expired tokens
   * - Cleaning up inactive links (free: 90/180 days, pro: 365 days)
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    try {
      // Run comprehensive daily cleanup
      await dailyCleanup(env);

      // Also clean up expired links (existing functionality)
      const linksResult = await env.DB.prepare(`
        DELETE FROM links
        WHERE expires_at IS NOT NULL
        AND expires_at < datetime('now')
      `).run();

      const anonResult = await env.DB.prepare(`
        DELETE FROM anonymous_links
        WHERE expires_at < datetime('now')
      `).run();

      const totalDeleted = (linksResult.meta.changes || 0) + (anonResult.meta.changes || 0);
      console.log(`[Cron] Expired links cleaned: ${totalDeleted}`);
    } catch (error) {
      console.error('[Cron] Scheduled task failed:', error);
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
 * Log API request to R2
 */
async function logApiRequest(
  logger: R2LogService,
  userId: string,
  request: Request,
  response: Response,
  requestId: string,
  startTime: number
): Promise<void> {
  const url = new URL(request.url);
  await logger.logRequest(userId, {
    request_id: requestId,
    method: request.method,
    path: url.pathname,
    status: response.status,
    duration_ms: Date.now() - startTime,
    ip: request.headers.get('cf-connecting-ip') || '0.0.0.0',
    country: request.headers.get('cf-ipcountry') || 'XX',
    city: request.headers.get('cf-ipcity') || undefined,
    user_agent: request.headers.get('user-agent') || '',
    referer: request.headers.get('referer') || undefined,
    query: url.search || undefined
  });
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
