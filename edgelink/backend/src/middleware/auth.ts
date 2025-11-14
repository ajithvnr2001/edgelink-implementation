/**
 * Authentication Middleware
 * Based on PRD FR-AUTH-2: JWT Validation
 * Supports both JWT tokens and API keys
 */

import { extractJWT, validateFingerprint } from '../auth/jwt';
import { verifyAPIKey } from '../handlers/apikeys';
import type { Env, JWTPayload } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

/**
 * Authentication Middleware
 * Extracts and validates JWT or API key from Authorization header
 * Priority: API Key -> JWT Token -> Anonymous
 *
 * @param request - Incoming request
 * @param env - Environment bindings
 * @returns Authenticated request or error response
 */
export async function authenticate(
  request: Request,
  env: Env
): Promise<{ request: AuthenticatedRequest; user: JWTPayload | null; error?: Response }> {
  try {
    // Extract Authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      // No auth provided - anonymous request
      return { request: request as AuthenticatedRequest, user: null };
    }

    // Extract token/key from "Bearer <token>"
    const token = authHeader.replace(/^Bearer\s+/i, '');

    // Check if it's an API key (starts with elk_)
    if (token.startsWith('elk_')) {
      const apiKeyResult = await verifyAPIKey(token, env);

      if (!apiKeyResult.valid) {
        return {
          request: request as AuthenticatedRequest,
          user: null,
          error: new Response(
            JSON.stringify({
              error: 'Invalid or expired API key',
              code: 'INVALID_API_KEY'
            }),
            {
              status: 401,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        };
      }

      // Create JWT-like payload from API key validation
      const payload: JWTPayload = {
        sub: apiKeyResult.user_id!,
        email: '', // API keys don't have email
        plan: apiKeyResult.plan || 'free',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
        fp: 'api_key' // Special fingerprint for API keys
      };

      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = payload;

      return { request: authenticatedRequest, user: payload };
    }

    // Otherwise, try JWT validation
    const payload = await extractJWT(request, env.JWT_SECRET);

    if (!payload) {
      // No token provided - anonymous request
      return { request: request as AuthenticatedRequest, user: null };
    }

    // Validate fingerprint (anti-theft protection) - only for JWT, not API keys
    if (!validateFingerprint(payload, request)) {
      return {
        request: request as AuthenticatedRequest,
        user: null,
        error: new Response(
          JSON.stringify({
            error: 'Token fingerprint mismatch - possible theft detected',
            code: 'INVALID_FINGERPRINT'
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      };
    }

    // Attach user to request
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = payload;

    return { request: authenticatedRequest, user: payload };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';

    return {
      request: request as AuthenticatedRequest,
      user: null,
      error: new Response(
        JSON.stringify({
          error: message,
          code: 'AUTH_FAILED'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    };
  }
}

/**
 * Require authentication middleware
 * Returns 401 if user is not authenticated
 */
export async function requireAuth(
  request: Request,
  env: Env
): Promise<{ user: JWTPayload; error?: Response }> {
  const { user, error } = await authenticate(request, env);

  if (error) {
    return { user: null as any, error };
  }

  if (!user) {
    return {
      user: null as any,
      error: new Response(
        JSON.stringify({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    };
  }

  return { user };
}
