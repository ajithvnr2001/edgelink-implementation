/**
 * Email Verification Handler
 * Handles POST /auth/verify-email with token in body
 */

import type { Env } from '../../types';
import { TokenService } from '../../services/auth/tokenService';

export async function handleVerifyEmail(request: Request, env: Env): Promise<Response> {
  try {
    console.log('[VerifyEmail] Handler called');

    // Get token from request body
    console.log('[VerifyEmail] Reading request body...');
    const body = await request.json() as { token: string };
    const token = body.token;
    console.log('[VerifyEmail] Token received:', token ? 'yes' : 'no');

    if (!token) {
      console.log('[VerifyEmail] Missing token - returning 400');
      return new Response(
        JSON.stringify({
          error: 'Missing verification token',
          code: 'MISSING_TOKEN'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('[VerifyEmail] Validating token...');
    const tokenService = new TokenService(env);
    const { valid, userId } = await tokenService.validateVerificationToken(token);
    console.log('[VerifyEmail] Token validation result:', { valid, userId });

    if (!valid) {
      console.log('[VerifyEmail] Invalid token - returning 400');
      return new Response(
        JSON.stringify({
          error: 'Invalid or expired verification token',
          code: 'INVALID_TOKEN'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    console.log('[VerifyEmail] Updating user and deleting token...');

    // Mark user as verified and delete token
    await env.DB.batch([
      env.DB.prepare(`
        UPDATE users
        SET email_verified = TRUE,
            email_verified_at = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(now, userId),

      env.DB.prepare(`
        DELETE FROM email_verification_tokens
        WHERE user_id = ?
      `).bind(userId)
    ]);

    console.log('[VerifyEmail] Database updated successfully');
    console.log('[VerifyEmail] Returning success response');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email verified successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[VerifyEmail] Error:', error);
    console.error('[VerifyEmail] Error stack:', error instanceof Error ? error.stack : 'no stack');
    return new Response(
      JSON.stringify({
        error: 'Verification failed',
        code: 'VERIFICATION_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
