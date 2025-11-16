/**
 * Request Password Reset Handler
 * Handles POST /auth/request-reset
 */

import type { Env } from '../../types';
import { TokenService } from '../../services/auth/tokenService';
import { EmailService } from '../../services/email/emailService';
import { EmailRateLimiter } from '../../services/email/rateLimiter';
import { isValidEmail } from '../../utils/validation';

export async function handleRequestPasswordReset(request: Request, env: Env): Promise<Response> {
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
    const allowed = await rateLimiter.checkRateLimit(body.email, 'password_reset');

    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many reset requests. Please try again in an hour.',
          code: 'RATE_LIMIT_EXCEEDED'
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user exists
    const user = await env.DB.prepare(
      'SELECT user_id, email, last_password_reset_at FROM users WHERE email = ?'
    ).bind(body.email).first();

    // ALWAYS return success to prevent email enumeration
    if (!user) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'If an account exists with that email, you will receive a password reset link.'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check 5-day rate limit BEFORE sending email
    if (user.last_password_reset_at) {
      const lastResetAt = user.last_password_reset_at as number;
      const now = Math.floor(Date.now() / 1000);
      const fiveDaysInSeconds = 5 * 24 * 60 * 60; // 5 days
      const timeSinceLastReset = now - lastResetAt;

      if (timeSinceLastReset < fiveDaysInSeconds) {
        const timeRemaining = fiveDaysInSeconds - timeSinceLastReset;
        const daysRemaining = Math.ceil(timeRemaining / (24 * 60 * 60));
        const hoursRemaining = Math.ceil(timeRemaining / (60 * 60));

        return new Response(
          JSON.stringify({
            error: `You can only reset your password once every 5 days. Please try again in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} (${hoursRemaining} hours).`,
            code: 'RESET_RATE_LIMIT',
            timeRemaining: timeRemaining,
            daysRemaining: daysRemaining,
            hoursRemaining: hoursRemaining
          }),
          {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Generate reset token
    const tokenService = new TokenService(env);
    const { token } = await tokenService.generatePasswordResetToken(user.user_id as string);

    // Send reset email
    const emailService = new EmailService(env);
    try {
      await emailService.sendPasswordResetEmail(user.email as string, token);
    } catch (error) {
      console.error('[RequestReset] Email send failed:', error);
      // Still return success to prevent enumeration
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'If an account exists with that email, you will receive a password reset link.'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[RequestReset] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process request',
        code: 'REQUEST_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
