/**
 * Resend Verification Email Handler
 * Handles POST /auth/resend-verification
 */

import type { Env } from '../../types';
import { TokenService } from '../../services/auth/tokenService';
import { EmailService } from '../../services/email/emailService';
import { EmailRateLimiter } from '../../services/email/rateLimiter';
import { isValidEmail } from '../../utils/validation';

export async function handleResendVerification(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { email: string };

    if (!body.email || !isValidEmail(body.email)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid email format',
          code: 'INVALID_EMAIL'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check rate limit
    const rateLimiter = new EmailRateLimiter(env.LINKS_KV);
    const allowed = await rateLimiter.checkRateLimit(body.email, 'verification');

    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests. Please try again in an hour.',
          code: 'RATE_LIMIT_EXCEEDED'
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user
    const user = await env.DB.prepare(
      'SELECT user_id, email_verified FROM users WHERE email = ?'
    ).bind(body.email).first();

    // Always return success to prevent email enumeration
    if (!user) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'If your account exists, a verification email has been sent.'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (user.email_verified === true || user.email_verified === 1) {
      return new Response(
        JSON.stringify({
          error: 'Email already verified',
          code: 'ALREADY_VERIFIED'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Delete old token
    await env.DB.prepare(
      'DELETE FROM email_verification_tokens WHERE user_id = ?'
    ).bind(user.user_id).run();

    // Generate new token
    const tokenService = new TokenService(env);
    const { token } = await tokenService.generateVerificationToken(user.user_id as string);

    // Send email
    const emailService = new EmailService(env);
    try {
      await emailService.sendVerificationEmail(body.email, token);
    } catch (error) {
      console.error('[ResendVerification] Email send failed:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to send verification email. Please try again.',
          code: 'EMAIL_SEND_FAILED'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification email sent successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[ResendVerification] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to resend verification',
        code: 'RESEND_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
