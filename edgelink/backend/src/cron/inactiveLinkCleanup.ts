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
 * 2. Send warning emails 7 days before deletion
 * 3. Delete warned links after 7-day grace period
 * 4. Clean up KV store to keep it in sync
 */

import type { Env } from '../types';
import { EmailService } from '../services/email/emailService';

export class InactiveLinkCleanupService {
  constructor(private env: Env) {}

  /**
   * Run complete inactive link cleanup process
   * Called by daily cron job
   */
  async run(): Promise<{
    warningsSent: number;
    linksDeleted: number;
    usersNotified: number;
  }> {
    console.log('[InactiveLinkCleanup] Starting cleanup process...');

    const emailService = new EmailService(this.env);
    const now = Math.floor(Date.now() / 1000);

    let warningsSent = 0;
    let linksDeleted = 0;
    let usersNotified = 0;

    try {
      // Step 1: Process pending deletions (links warned 7+ days ago)
      const deletionResult = await this.processScheduledDeletions(now);
      linksDeleted = deletionResult.linksDeleted;
      usersNotified += deletionResult.usersNotified;

      // Step 2: Find and warn users about eligible inactive links
      const warningResult = await this.sendInactivityWarnings(emailService, now);
      warningsSent = warningResult.warningsSent;
      usersNotified += warningResult.usersNotified;

      console.log(`[InactiveLinkCleanup] Cleanup complete:
        - Warnings sent: ${warningsSent} users
        - Links deleted: ${linksDeleted}
        - Users notified: ${usersNotified}
      `);

      return { warningsSent, linksDeleted, usersNotified };
    } catch (error) {
      console.error('[InactiveLinkCleanup] Cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Delete links that were warned 7+ days ago
   */
  private async processScheduledDeletions(
    now: number
  ): Promise<{ linksDeleted: number; usersNotified: number }> {
    console.log('[InactiveLinkCleanup] Processing scheduled deletions...');

    // Find warnings ready for deletion (7+ days old)
    const warnings = await this.env.DB.prepare(`
      SELECT warning_id, user_id, link_slugs, deletion_scheduled_at
      FROM inactive_link_warnings
      WHERE status = 'pending'
        AND deletion_scheduled_at <= ?
    `).bind(now).all();

    if (!warnings.results || warnings.results.length === 0) {
      console.log('[InactiveLinkCleanup] No scheduled deletions found');
      return { linksDeleted: 0, usersNotified: 0 };
    }

    console.log(`[InactiveLinkCleanup] Found ${warnings.results.length} warnings ready for deletion`);

    let totalDeleted = 0;
    const usersNotified = new Set<string>();

    for (const warning of warnings.results) {
      try {
        const slugs: string[] = JSON.parse(warning.link_slugs as string);
        const userId = warning.user_id as string;

        // Delete links from database
        for (const slug of slugs) {
          await this.deleteLink(slug, userId);
          totalDeleted++;
        }

        // Mark warning as completed
        await this.env.DB.prepare(`
          UPDATE inactive_link_warnings
          SET status = 'deleted'
          WHERE warning_id = ?
        `).bind(warning.warning_id).run();

        usersNotified.add(userId);

        console.log(`[InactiveLinkCleanup] Deleted ${slugs.length} links for user ${userId}`);
      } catch (error) {
        console.error(`[InactiveLinkCleanup] Failed to delete links for warning ${warning.warning_id}:`, error);
      }
    }

    return { linksDeleted: totalDeleted, usersNotified: usersNotified.size };
  }

  /**
   * Find inactive links and send warning emails
   */
  private async sendInactivityWarnings(
    emailService: EmailService,
    now: number
  ): Promise<{ warningsSent: number; usersNotified: number }> {
    console.log('[InactiveLinkCleanup] Finding inactive links for warnings...');

    const day90 = 90 * 24 * 60 * 60;
    const day180 = 180 * 24 * 60 * 60;
    const day365 = 365 * 24 * 60 * 60;

    // Free plan: Links with 0 clicks after 90 days OR inactive for 180 days
    const freeInactiveLinks = await this.env.DB.prepare(`
      SELECT l.slug, l.user_id, u.email, u.plan,
             l.created_at, l.last_clicked_at, l.click_count
      FROM links l
      JOIN users u ON l.user_id = u.user_id
      WHERE u.plan = 'free'
        AND l.slug NOT IN (
          SELECT json_each.value
          FROM inactive_link_warnings,
               json_each(inactive_link_warnings.link_slugs)
          WHERE inactive_link_warnings.status = 'pending'
        )
        AND (
          -- 0 clicks after 90 days
          (l.click_count = 0 AND unixepoch(l.created_at) < ?)
          OR
          -- Inactive for 180 days
          (l.last_clicked_at IS NOT NULL AND unixepoch(l.last_clicked_at) < ?)
          OR
          -- Created but never clicked for 180 days
          (l.last_clicked_at IS NULL AND l.click_count = 0 AND unixepoch(l.created_at) < ?)
        )
      ORDER BY l.user_id, l.created_at DESC
    `).bind(
      now - day90,  // Created 90+ days ago with 0 clicks
      now - day180, // Last clicked 180+ days ago
      now - day180  // Created 180+ days ago, never clicked
    ).all();

    // Pro plan: Links inactive for 365 days (1 year)
    const proInactiveLinks = await this.env.DB.prepare(`
      SELECT l.slug, l.user_id, u.email, u.plan,
             l.created_at, l.last_clicked_at, l.click_count
      FROM links l
      JOIN users u ON l.user_id = u.user_id
      WHERE u.plan = 'pro'
        AND l.slug NOT IN (
          SELECT json_each.value
          FROM inactive_link_warnings,
               json_each(inactive_link_warnings.link_slugs)
          WHERE inactive_link_warnings.status = 'pending'
        )
        AND (
          -- Inactive for 365 days
          (l.last_clicked_at IS NOT NULL AND unixepoch(l.last_clicked_at) < ?)
          OR
          -- Created but never clicked for 365 days
          (l.last_clicked_at IS NULL AND l.click_count = 0 AND unixepoch(l.created_at) < ?)
        )
      ORDER BY l.user_id, l.created_at DESC
    `).bind(
      now - day365, // Last clicked 365+ days ago
      now - day365  // Created 365+ days ago, never clicked
    ).all();

    const allInactiveLinks = [
      ...(freeInactiveLinks.results || []),
      ...(proInactiveLinks.results || [])
    ];

    if (allInactiveLinks.length === 0) {
      console.log('[InactiveLinkCleanup] No inactive links found');
      return { warningsSent: 0, usersNotified: 0 };
    }

    console.log(`[InactiveLinkCleanup] Found ${allInactiveLinks.length} inactive links`);

    // Group links by user
    const linksByUser = new Map<string, typeof allInactiveLinks>();
    for (const link of allInactiveLinks) {
      const userId = link.user_id as string;
      if (!linksByUser.has(userId)) {
        linksByUser.set(userId, []);
      }
      linksByUser.get(userId)!.push(link);
    }

    let warningsSent = 0;

    // Send warning emails to each user
    for (const [userId, links] of linksByUser) {
      try {
        const user = links[0]; // Get user info from first link
        const email = user.email as string;
        const plan = user.plan as string;
        const slugs = links.map(l => l.slug as string);

        // Create warning record
        const warningId = crypto.randomUUID();
        const deletionScheduledAt = now + (7 * 24 * 60 * 60); // 7 days from now

        await this.env.DB.prepare(`
          INSERT INTO inactive_link_warnings
          (warning_id, user_id, link_slugs, warning_sent_at, deletion_scheduled_at, status)
          VALUES (?, ?, ?, ?, ?, 'pending')
        `).bind(
          warningId,
          userId,
          JSON.stringify(slugs),
          now,
          deletionScheduledAt
        ).run();

        // Send email notification
        await this.sendInactivityWarningEmail(emailService, email, plan, links, deletionScheduledAt);

        warningsSent++;
        console.log(`[InactiveLinkCleanup] Sent warning to ${email} for ${slugs.length} inactive links`);
      } catch (error) {
        console.error(`[InactiveLinkCleanup] Failed to send warning for user ${userId}:`, error);
      }
    }

    return { warningsSent, usersNotified: warningsSent };
  }

  /**
   * Send inactivity warning email to user
   */
  private async sendInactivityWarningEmail(
    emailService: EmailService,
    email: string,
    plan: string,
    links: any[],
    deletionScheduledAt: number
  ): Promise<void> {
    const deletionDate = new Date(deletionScheduledAt * 1000).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    const linksList = links.slice(0, 10).map(l => {
      const slug = l.slug as string;
      const lastClicked = l.last_clicked_at
        ? new Date(l.last_clicked_at).toLocaleDateString()
        : 'Never';
      return `  • /${slug} (Last clicked: ${lastClicked}, Clicks: ${l.click_count})`;
    }).join('\n');

    const moreLinksNote = links.length > 10
      ? `\n  ... and ${links.length - 10} more links`
      : '';

    const policyNote = plan === 'free'
      ? 'Free plan links are cleaned up if they have 0 clicks after 90 days, or are inactive for 180 days.'
      : 'Pro plan links are cleaned up if they are inactive for 365 days.';

    const subject = `⚠️ ${links.length} inactive link${links.length > 1 ? 's' : ''} will be deleted in 7 days`;

    const message = `
Hello,

We've detected that you have ${links.length} inactive link${links.length > 1 ? 's' : ''} on EdgeLink that will be automatically deleted on ${deletionDate} to help manage your account.

${policyNote}

Inactive links scheduled for deletion:
${linksList}${moreLinksNote}

**To keep these links:**
1. Visit any of these links (or have someone click them)
2. The links will be automatically marked as active and won't be deleted

**What happens on ${deletionDate}:**
- These links will be permanently deleted
- Short URLs will stop working (404 errors)
- Click analytics will be removed
- This action cannot be undone

**Why are we doing this?**
- Keeps your dashboard clean and organized
- Ensures your link limits reflect your actual usage
- Prevents database bloat

Need help? Reply to this email or visit https://edgelink.com/support

Best regards,
The EdgeLink Team
`;

    // Use Resend to send email
    await emailService.sendEmail(email, subject, message);
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
   * Get cleanup statistics for monitoring
   */
  async getStats(): Promise<{
    pendingWarnings: number;
    scheduledDeletions: number;
    freeInactiveCount: number;
    proInactiveCount: number;
  }> {
    const now = Math.floor(Date.now() / 1000);
    const day90 = 90 * 24 * 60 * 60;
    const day180 = 180 * 24 * 60 * 60;
    const day365 = 365 * 24 * 60 * 60;

    const [warnings, scheduled, freeInactive, proInactive] = await Promise.all([
      this.env.DB.prepare(`
        SELECT COUNT(*) as count FROM inactive_link_warnings WHERE status = 'pending'
      `).first(),

      this.env.DB.prepare(`
        SELECT COUNT(*) as count FROM inactive_link_warnings
        WHERE status = 'pending' AND deletion_scheduled_at <= ?
      `).bind(now).first(),

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

    return {
      pendingWarnings: (warnings?.count as number) || 0,
      scheduledDeletions: (scheduled?.count as number) || 0,
      freeInactiveCount: (freeInactive?.count as number) || 0,
      proInactiveCount: (proInactive?.count as number) || 0
    };
  }
}
