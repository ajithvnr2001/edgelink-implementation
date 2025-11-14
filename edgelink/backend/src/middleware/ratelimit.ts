/**
 * Rate Limiting Middleware
 * Based on PRD FR-7.6: Rate limits 1k/day free, 10k/day pro
 */

import type { Env, JWTPayload, RateLimitInfo } from '../types';

/**
 * Rate limit configuration by plan
 */
const RATE_LIMITS = {
  anonymous: { limit: 10, period: 3600 },      // 10 per hour for anonymous
  free: { limit: 1000, period: 86400 },        // 1,000 per day
  pro: { limit: 10000, period: 86400 }         // 10,000 per day
};

/**
 * Apply rate limiting based on user plan
 *
 * @param request - Incoming request
 * @param env - Environment bindings
 * @param user - Authenticated user (or null for anonymous)
 * @returns Rate limit info or error response
 */
export async function checkRateLimit(
  request: Request,
  env: Env,
  user: JWTPayload | null
): Promise<{ success: boolean; info: RateLimitInfo; error?: Response }> {
  // Determine rate limit based on user plan
  let plan: 'anonymous' | 'free' | 'pro' = 'anonymous';
  let userId = 'anonymous';

  if (user) {
    plan = user.plan;
    userId = user.sub;
  } else {
    // For anonymous, use IP address as identifier
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    userId = `anon:${ip}`;
  }

  const config = RATE_LIMITS[plan];
  const key = `ratelimit:${userId}`;

  try {
    // Use KV for simple rate limiting (alternative to Rate Limiting API for initial version)
    const now = Date.now();
    const windowStart = Math.floor(now / (config.period * 1000)) * config.period * 1000;

    // Get current count from KV
    const countStr = await env.LINKS_KV.get(key);
    const currentCount = countStr ? parseInt(countStr, 10) : 0;

    // Check if limit exceeded
    if (currentCount >= config.limit) {
      const resetAfter = windowStart + (config.period * 1000) - now;

      const error = new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          limit: config.limit,
          remaining: 0,
          resetAfter: Math.ceil(resetAfter / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(resetAfter / 1000).toString(),
            'X-RateLimit-Limit': config.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil((windowStart + (config.period * 1000)) / 1000).toString()
          }
        }
      );

      return {
        success: false,
        info: {
          success: false,
          limit: config.limit,
          remaining: 0,
          resetAfter: Math.ceil(resetAfter / 1000)
        },
        error
      };
    }

    // Increment counter
    const newCount = currentCount + 1;
    await env.LINKS_KV.put(key, newCount.toString(), {
      expirationTtl: config.period
    });

    const remaining = config.limit - newCount;

    return {
      success: true,
      info: {
        success: true,
        limit: config.limit,
        remaining,
        resetAfter: Math.ceil((windowStart + (config.period * 1000) - now) / 1000)
      }
    };
  } catch (error) {
    console.error('Rate limiting error:', error);

    // If rate limiting fails, allow the request but log the error
    return {
      success: true,
      info: {
        success: true,
        limit: config.limit,
        remaining: config.limit,
        resetAfter: config.period
      }
    };
  }
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(response: Response, info: RateLimitInfo): Response {
  const newResponse = new Response(response.body, response);

  newResponse.headers.set('X-RateLimit-Limit', info.limit.toString());
  newResponse.headers.set('X-RateLimit-Remaining', info.remaining.toString());

  return newResponse;
}
