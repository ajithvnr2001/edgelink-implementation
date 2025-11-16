/**
 * Reset Password Handler
 * Handles POST /auth/reset-password
 */

import type { Env } from '../../types';
import { TokenService } from '../../services/auth/tokenService';
import { EmailService } from '../../services/email/emailService';
import { hashPassword } from '../../utils/password';
import { isValidPassword } from '../../utils/validation';

export async function handleResetPassword(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { token: string; newPassword: string };

    if (!body.token || !body.newPassword) {
      return new Response(
        JSON.stringify({
          error: 'Token and new password required',
          code: 'INVALID_INPUT'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!isValidPassword(body.newPassword)) {
      return new Response(
        JSON.stringify({
          error: 'Password must be at least 8 characters with uppercase, lowercase, and number',
          code: 'INVALID_PASSWORD'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const tokenService = new TokenService(env);
    const { valid, userId } = await tokenService.validatePasswordResetToken(body.token);

    if (!valid) {
      return new Response(
        JSON.stringify({
          error: 'Invalid or expired reset token',
          code: 'INVALID_TOKEN'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check 5-day rate limit
    const user = await env.DB.prepare(
      'SELECT last_password_reset_at FROM users WHERE user_id = ?'
    ).bind(userId).first();

    if (user && user.last_password_reset_at) {
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

    const passwordHash = await hashPassword(body.newPassword);
    const now = Math.floor(Date.now() / 1000);

    // Update password, set last_password_reset_at, and mark token as used
    await env.DB.batch([
      env.DB.prepare(`
        UPDATE users
        SET password_hash = ?, last_password_reset_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(passwordHash, now, userId),

      env.DB.prepare(`
        UPDATE password_reset_tokens
        SET used_at = ?
        WHERE user_id = ? AND used_at IS NULL
      `).bind(now, userId)
    ]);

    // Get user email
    const user = await env.DB.prepare(
      'SELECT email FROM users WHERE user_id = ?'
    ).bind(userId).first();

    // Send confirmation email
    if (user) {
      const emailService = new EmailService(env);
      try {
        await emailService.sendPasswordChangedEmail(user.email as string);
      } catch (error) {
        console.error('[ResetPassword] Failed to send confirmation email:', error);
        // Don't fail the request if email fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password reset successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[ResetPassword] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to reset password',
        code: 'RESET_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
