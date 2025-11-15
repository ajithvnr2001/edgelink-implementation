/**
 * Token Service - Email Verification & Password Reset Token Management
 * Generates secure tokens with SHA-256 hashing
 */

import type { Env } from '../../types';

export class TokenService {
  constructor(private env: Env) {}

  /**
   * Generate secure verification token with 48-hour expiration
   */
  async generateVerificationToken(userId: string): Promise<{ token: string; tokenHash: string }> {
    // Generate cryptographically secure token (64 chars)
    const token = this.generateSecureToken();

    // Hash token before storing (SHA-256)
    const tokenHash = await this.hashToken(token);

    // Store in database with 48-hour expiration
    const expiresAt = Math.floor(Date.now() / 1000) + (48 * 60 * 60);

    await this.env.DB.prepare(`
      INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `).bind(userId, tokenHash, expiresAt).run();

    return { token, tokenHash };
  }

  /**
   * Validate verification token
   */
  async validateVerificationToken(token: string): Promise<{ valid: boolean; userId?: string }> {
    const tokenHash = await this.hashToken(token);
    const now = Math.floor(Date.now() / 1000);

    const row = await this.env.DB.prepare(`
      SELECT vt.user_id, vt.expires_at, u.email_verified
      FROM email_verification_tokens vt
      JOIN users u ON vt.user_id = u.user_id
      WHERE vt.token_hash = ? AND vt.expires_at > ?
    `).bind(tokenHash, now).first();

    if (!row) {
      return { valid: false };
    }

    if (row.email_verified === 1 || row.email_verified === true) {
      return { valid: false }; // Already verified
    }

    return { valid: true, userId: row.user_id as string };
  }

  /**
   * Generate password reset token with 15-minute expiration
   */
  async generatePasswordResetToken(userId: string): Promise<{ token: string; tokenHash: string }> {
    const token = this.generateSecureToken();
    const tokenHash = await this.hashToken(token);

    // 15-minute expiration for security
    const expiresAt = Math.floor(Date.now() / 1000) + (15 * 60);

    // Delete any existing reset tokens for this user
    await this.env.DB.prepare(
      'DELETE FROM password_reset_tokens WHERE user_id = ?'
    ).bind(userId).run();

    // Create new token
    await this.env.DB.prepare(`
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `).bind(userId, tokenHash, expiresAt).run();

    return { token, tokenHash };
  }

  /**
   * Validate password reset token
   */
  async validatePasswordResetToken(token: string): Promise<{ valid: boolean; userId?: string }> {
    const tokenHash = await this.hashToken(token);
    const now = Math.floor(Date.now() / 1000);

    const row = await this.env.DB.prepare(`
      SELECT user_id, expires_at, used_at
      FROM password_reset_tokens
      WHERE token_hash = ? AND expires_at > ?
    `).bind(tokenHash, now).first();

    if (!row || row.used_at) {
      return { valid: false }; // Token expired or already used
    }

    return { valid: true, userId: row.user_id as string };
  }

  /**
   * Mark password reset token as used
   */
  async markPasswordResetTokenUsed(token: string): Promise<void> {
    const tokenHash = await this.hashToken(token);
    const now = Math.floor(Date.now() / 1000);

    await this.env.DB.prepare(`
      UPDATE password_reset_tokens
      SET used_at = ?
      WHERE token_hash = ? AND used_at IS NULL
    `).bind(now, tokenHash).run();
  }

  /**
   * Generate cryptographically secure random token
   */
  private generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Hash token using SHA-256
   */
  private async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
