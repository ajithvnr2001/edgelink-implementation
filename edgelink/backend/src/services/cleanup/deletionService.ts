/**
 * Deletion Service - Handles account and data deletion with cascade
 * Supports both user-requested and automated cleanup deletions
 */

import type { Env } from '../../types';

export class DeletionService {
  constructor(private env: Env) {}

  /**
   * Delete user account and all associated data (CASCADE)
   */
  async deleteAccount(
    userId: string,
    reason: string
  ): Promise<{ success: boolean; email: string; linkCount: number }> {
    // Get user data before deletion
    const user = await this.env.DB.prepare(`
      SELECT
        u.user_id,
        u.email,
        COUNT(l.slug) as link_count
      FROM users u
      LEFT JOIN links l ON l.user_id = u.user_id
      WHERE u.user_id = ?
      GROUP BY u.user_id
    `).bind(userId).first();

    if (!user) {
      throw new Error('User not found');
    }

    // Log deletion for records
    await this.env.DB.prepare(`
      INSERT INTO account_deletions
      (user_id, email, reason, link_count)
      VALUES (?, ?, ?, ?)
    `).bind(
      user.user_id,
      user.email,
      reason,
      user.link_count || 0
    ).run();

    // Cascade delete all user data
    // Note: Some tables have ON DELETE CASCADE, but we'll be explicit here
    await this.env.DB.batch([
      // Delete links (this will cascade to analytics_events due to FK)
      this.env.DB.prepare('DELETE FROM links WHERE user_id = ?').bind(userId),

      // Delete custom domains
      this.env.DB.prepare('DELETE FROM custom_domains WHERE user_id = ?').bind(userId),

      // Delete API keys
      this.env.DB.prepare('DELETE FROM api_keys WHERE user_id = ?').bind(userId),

      // Delete webhooks
      this.env.DB.prepare('DELETE FROM webhooks WHERE user_id = ?').bind(userId),

      // Delete refresh tokens
      this.env.DB.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').bind(userId),

      // Delete usage tracking
      this.env.DB.prepare('DELETE FROM usage_tracking WHERE user_id = ?').bind(userId),

      // Delete A/B tests
      this.env.DB.prepare('DELETE FROM ab_tests WHERE user_id = ?').bind(userId),

      // Delete analytics archives
      this.env.DB.prepare('DELETE FROM analytics_archive WHERE user_id = ?').bind(userId),

      // Delete team memberships
      this.env.DB.prepare('DELETE FROM team_members WHERE user_id = ?').bind(userId),

      // Delete teams owned by user
      this.env.DB.prepare('DELETE FROM teams WHERE owner_id = ?').bind(userId),

      // Tokens will be auto-deleted via FK CASCADE
      // email_verification_tokens, password_reset_tokens

      // Finally, delete the user
      this.env.DB.prepare('DELETE FROM users WHERE user_id = ?').bind(userId)
    ]);

    return {
      success: true,
      email: user.email as string,
      linkCount: user.link_count as number || 0
    };
  }
}
