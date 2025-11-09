/**
 * Authentication Middleware
 * Based on PRD FR-AUTH-2: JWT Validation
 */

import { extractJWT, validateFingerprint } from '../auth/jwt';
import type { Env, JWTPayload } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

/**
 * JWT Authentication Middleware
 * Extracts and validates JWT from Authorization header
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
    // Extract JWT from Authorization header
    const payload = await extractJWT(request, env.JWT_SECRET);

    if (!payload) {
      // No token provided - anonymous request
      return { request: request as AuthenticatedRequest, user: null };
    }

    // Validate fingerprint (anti-theft protection)
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
