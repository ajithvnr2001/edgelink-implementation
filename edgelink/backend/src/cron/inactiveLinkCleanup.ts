/**
 * Inactive Link Cleanup Service
 * Automatically removes inactive/abandoned links to prevent database bloat
 * and help users stay within their plan limits
 *
 * Cleanup Policies:
 * - Free Plan: Delete links with 0 clicks after 90 days, or inactive for 180 days
 * - Pro Plan: Delete links inactive for 365 days (1 year)
 *
 * Process:
 * 1. Find links eligible for cleanup based on plan policies
 * 2. Delete them directly (UI shows active/inactive status as notification)
 * 3. Clean up KV store to keep it in sync
 *
 * Users see inactive status in frontend dashboard with visual indicators
 */

import type { Env } from '../types';

export class InactiveLinkCleanupService {
  constructor(private env: Env) {}

  /**
   * Run complete inactive link cleanup process
   * Called by daily cron job
   */
  async run(): Promise<{
    linksDeleted: number;
    freeDeleted: number;
    proDeleted: number;
  }> {
    console.log('[InactiveLinkCleanup] Starting cleanup process...');

    const now = Math.floor(Date.now() / 1000);
    const day90 = 90 * 24 * 60 * 60;
    const day180 = 180 * 24 * 60 * 60;
    const day365 = 365 * 24 * 60 * 60;

    let freeDeleted = 0;
    let proDeleted = 0;

    try {
      // ====================================
      // FREE PLAN CLEANUP
      // ====================================
      // Delete links with 0 clicks after 90 days OR inactive for 180 days
      const freeInactiveLinks = await this.env.DB.prepare(`
        SELECT slug, user_id
        FROM links l
        JOIN users u ON l.user_id = u.user_id
        WHERE u.plan = 'free'
          AND (
            -- 0 clicks after 90 days
            (l.click_count = 0 AND unixepoch(l.created_at) < ?)
            OR
            -- Inactive for 180 days (last clicked)
            (l.last_clicked_at IS NOT NULL AND unixepoch(l.last_clicked_at) < ?)
            OR
            -- Created but never clicked for 180 days
            (l.last_clicked_at IS NULL AND l.click_count = 0 AND unixepoch(l.created_at) < ?)
          )
      `).bind(
        now - day90,  // Created 90+ days ago with 0 clicks
        now - day180, // Last clicked 180+ days ago
        now - day180  // Created 180+ days ago, never clicked
      ).all();

      // Delete free tier inactive links
      if (freeInactiveLinks.results && freeInactiveLinks.results.length > 0) {
        for (const link of freeInactiveLinks.results) {
          await this.deleteLink(link.slug as string, link.user_id as string);
          freeDeleted++;
        }
        console.log(`[InactiveLinkCleanup] Deleted ${freeDeleted} free tier links`);
      }

      // ====================================
      // PRO PLAN CLEANUP
      // ====================================
      // Delete links inactive for 365 days (1 year)
      const proInactiveLinks = await this.env.DB.prepare(`
        SELECT slug, user_id
        FROM links l
        JOIN users u ON l.user_id = u.user_id
        WHERE u.plan = 'pro'
          AND (
            -- Inactive for 365 days (last clicked)
            (l.last_clicked_at IS NOT NULL AND unixepoch(l.last_clicked_at) < ?)
            OR
            -- Created but never clicked for 365 days
            (l.last_clicked_at IS NULL AND l.click_count = 0 AND unixepoch(l.created_at) < ?)
          )
      `).bind(
        now - day365, // Last clicked 365+ days ago
        now - day365  // Created 365+ days ago, never clicked
      ).all();

      // Delete pro tier inactive links
      if (proInactiveLinks.results && proInactiveLinks.results.length > 0) {
        for (const link of proInactiveLinks.results) {
          await this.deleteLink(link.slug as string, link.user_id as string);
          proDeleted++;
        }
        console.log(`[InactiveLinkCleanup] Deleted ${proDeleted} pro tier links`);
      }

      console.log(`[InactiveLinkCleanup] Cleanup complete:
        - Free tier links deleted: ${freeDeleted}
        - Pro tier links deleted: ${proDeleted}
        - Total deleted: ${freeDeleted + proDeleted}
      `);

      return {
        linksDeleted: freeDeleted + proDeleted,
        freeDeleted,
        proDeleted
      };
    } catch (error) {
      console.error('[InactiveLinkCleanup] Cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Delete a single link from both D1 and KV
   */
  private async deleteLink(slug: string, userId: string): Promise<void> {
    // Delete from D1 (analytics will cascade delete via FK)
    await this.env.DB.prepare(`
      DELETE FROM links WHERE slug = ? AND user_id = ?
    `).bind(slug, userId).run();

    // Delete from KV
    await this.env.LINKS_KV.delete(`slug:${slug}`);

    console.log(`[InactiveLinkCleanup] Deleted link: ${slug}`);
  }

  /**
   * Get cleanup statistics for monitoring and frontend display
   */
  async getStats(): Promise<{
    freeInactiveCount: number;
    proInactiveCount: number;
    totalInactive: number;
  }> {
    const now = Math.floor(Date.now() / 1000);
    const day90 = 90 * 24 * 60 * 60;
    const day180 = 180 * 24 * 60 * 60;
    const day365 = 365 * 24 * 60 * 60;

    const [freeInactive, proInactive] = await Promise.all([
      this.env.DB.prepare(`
        SELECT COUNT(*) as count FROM links l
        JOIN users u ON l.user_id = u.user_id
        WHERE u.plan = 'free'
          AND (
            (l.click_count = 0 AND unixepoch(l.created_at) < ?)
            OR (l.last_clicked_at IS NOT NULL AND unixepoch(l.last_clicked_at) < ?)
            OR (l.last_clicked_at IS NULL AND l.click_count = 0 AND unixepoch(l.created_at) < ?)
          )
      `).bind(now - day90, now - day180, now - day180).first(),

      this.env.DB.prepare(`
        SELECT COUNT(*) as count FROM links l
        JOIN users u ON l.user_id = u.user_id
        WHERE u.plan = 'pro'
          AND (
            (l.last_clicked_at IS NOT NULL AND unixepoch(l.last_clicked_at) < ?)
            OR (l.last_clicked_at IS NULL AND l.click_count = 0 AND unixepoch(l.created_at) < ?)
          )
      `).bind(now - day365, now - day365).first()
    ]);

    const freeCount = (freeInactive?.count as number) || 0;
    const proCount = (proInactive?.count as number) || 0;

    return {
      freeInactiveCount: freeCount,
      proInactiveCount: proCount,
      totalInactive: freeCount + proCount
    };
  }
}
