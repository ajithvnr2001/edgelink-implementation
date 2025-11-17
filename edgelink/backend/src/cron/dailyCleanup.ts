/**
 * Daily Cleanup Cron Job
 * Runs at 2 AM UTC every day
 *
 * Tasks:
 * 1. Send warnings to unverified accounts (80 days old)
 * 2. Delete unverified accounts (90+ days old)
 * 3. Clean up expired tokens (7+ days old)
 * 4. Clean up inactive links (free: 90/180 days, pro: 365 days)
 */

import type { Env } from '../types';
import { EmailService } from '../services/email/emailService';
import { DeletionService } from '../services/cleanup/deletionService';
import { InactiveLinkCleanupService } from './inactiveLinkCleanup';

export async function dailyCleanup(env: Env): Promise<void> {
  console.log('[Cron] Starting daily cleanup job');

  const emailService = new EmailService(env);
  const deletionService = new DeletionService(env);
  const now = Math.floor(Date.now() / 1000);

  let warningsSent = 0;
  let accountsDeleted = 0;
  let tokensDeleted = 0;
  let inactiveLinksDeleted = 0;
  let inactiveLinksWarned = 0;

  try {
    // ========================================
    // TASK 1: Send warnings to 80-day unverified accounts
    // ========================================
    const day80 = 80 * 24 * 60 * 60;
    const day81 = 81 * 24 * 60 * 60;

    // Find accounts created between 80-81 days ago that haven't received warning yet
    const accountsForWarning = await env.DB.prepare(`
      SELECT user_id, email, created_at
      FROM users
      WHERE email_verified = 0
        AND unverified_warning_sent_at IS NULL
        AND unixepoch(created_at) BETWEEN ? AND ?
    `).bind(now - day81, now - day80).all();

    console.log(`[Cron] Found ${accountsForWarning.results.length} accounts for warning`);

    for (const account of accountsForWarning.results) {
      try {
        // Send warning email (10 days until deletion)
        await emailService.sendUnverifiedWarning(account.email as string, 10);

        // Mark warning as sent
        await env.DB.prepare(`
          UPDATE users SET unverified_warning_sent_at = ? WHERE user_id = ?
        `).bind(now, account.user_id).run();

        warningsSent++;
        console.log(`[Cron] Sent warning to ${account.email}`);
      } catch (error) {
        console.error(`[Cron] Failed to send warning to ${account.email}:`, error);
      }
    }

    // ========================================
    // TASK 2: Delete 90-day unverified accounts
    // ========================================
    const day90 = 90 * 24 * 60 * 60;

    // Find accounts created 90+ days ago that are still unverified
    const accountsToDelete = await env.DB.prepare(`
      SELECT user_id, email, created_at
      FROM users
      WHERE email_verified = 0
        AND unixepoch(created_at) < ?
    `).bind(now - day90).all();

    console.log(`[Cron] Found ${accountsToDelete.results.length} accounts to delete`);

    for (const account of accountsToDelete.results) {
      try {
        const { email } = await deletionService.deleteAccount(
          account.user_id as string,
          'unverified_90d'
        );

        // Send deletion confirmation email
        try {
          await emailService.sendAccountDeleted(
            email,
            'Your account was not verified within 90 days'
          );
        } catch (emailError) {
          console.error(`[Cron] Failed to send deletion email to ${email}:`, emailError);
          // Continue even if email fails
        }

        accountsDeleted++;
        console.log(`[Cron] Deleted account ${email}`);
      } catch (error) {
        console.error(`[Cron] Failed to delete account ${account.user_id}:`, error);
      }
    }

    // ========================================
    // TASK 3: Clean up expired tokens (7+ days old)
    // ========================================
    const day7 = 7 * 24 * 60 * 60;

    const verificationResult = await env.DB.prepare(`
      DELETE FROM email_verification_tokens WHERE expires_at < ?
    `).bind(now - day7).run();

    const resetResult = await env.DB.prepare(`
      DELETE FROM password_reset_tokens WHERE expires_at < ?
    `).bind(now - day7).run();

    tokensDeleted = (verificationResult.meta.changes || 0) + (resetResult.meta.changes || 0);

    // ========================================
    // TASK 4: Clean up inactive links
    // ========================================
    const inactiveLinkCleanup = new InactiveLinkCleanupService(env);
    const inactiveLinkResult = await inactiveLinkCleanup.run();

    inactiveLinksWarned = inactiveLinkResult.warningsSent;
    inactiveLinksDeleted = inactiveLinkResult.linksDeleted;

    console.log(`[Cron] Inactive links cleanup:
      - Warnings sent: ${inactiveLinksWarned}
      - Links deleted: ${inactiveLinksDeleted}
    `);

    // ========================================
    // SUMMARY
    // ========================================
    console.log(`[Cron] Daily cleanup complete:
      - Account warnings sent: ${warningsSent}
      - Accounts deleted: ${accountsDeleted}
      - Expired tokens cleaned: ${tokensDeleted}
      - Inactive link warnings: ${inactiveLinksWarned}
      - Inactive links deleted: ${inactiveLinksDeleted}
    `);
  } catch (error) {
    console.error('[Cron] Daily cleanup failed:', error);
    // Don't throw - allow cron to continue next day
  }
}
