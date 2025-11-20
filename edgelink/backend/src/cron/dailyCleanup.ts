/**
 * Daily Cleanup Cron Job
 * Runs at 2 AM UTC every day
 *
 * Tasks:
 * 1. Send warnings to unverified accounts (80 days old)
 * 2. Delete unverified accounts (90+ days old)
 * 3. Clean up expired tokens (7+ days old)
 * 4. Downgrade expired subscriptions to free
 * 5. Clean up inactive links (free: 90/180 days, pro: 365 days)
 * 6. Clean up old R2 logs (30+ days old)
 */

import type { Env } from '../types';
import { EmailService } from '../services/email/emailService';
import { DeletionService } from '../services/cleanup/deletionService';
import { InactiveLinkCleanupService } from './inactiveLinkCleanup';
import { createR2LogService } from '../services/logs/r2LogService';

export async function dailyCleanup(env: Env): Promise<void> {
  console.log('[Cron] Starting daily cleanup job');

  const emailService = new EmailService(env);
  const deletionService = new DeletionService(env);
  const now = Math.floor(Date.now() / 1000);

  let warningsSent = 0;
  let accountsDeleted = 0;
  let tokensDeleted = 0;
  let subscriptionsDowngraded = 0;
  let inactiveLinksDeleted = 0;
  let logsDeleted = 0;

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
    // TASK 4: Downgrade expired subscriptions
    // ========================================
    // Find all users with active/cancelled subscriptions that have expired
    // subscription_current_period_end is Unix timestamp
    const expiredSubscriptions = await env.DB.prepare(`
      SELECT user_id, email, subscription_plan, subscription_current_period_end
      FROM users
      WHERE subscription_current_period_end IS NOT NULL
        AND subscription_current_period_end < ?
        AND subscription_status IN ('active', 'cancelled')
        AND lifetime_access = 0
    `).bind(now).all();

    console.log(`[Cron] Found ${expiredSubscriptions.results.length} expired subscriptions`);

    for (const user of expiredSubscriptions.results) {
      try {
        // Downgrade to free plan
        await env.DB.prepare(`
          UPDATE users
          SET subscription_status = 'expired',
              subscription_plan = 'free',
              plan = 'free',
              subscription_id = NULL,
              subscription_current_period_start = NULL,
              subscription_current_period_end = NULL,
              subscription_cancel_at_period_end = 0,
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `).bind(user.user_id).run();

        subscriptionsDowngraded++;
        console.log(`[Cron] Downgraded expired subscription for user ${user.email} (ended: ${new Date((user.subscription_current_period_end as number) * 1000).toISOString()})`);

        // Optional: Send email notification about subscription expiration
        // You can uncomment this if you want to notify users
        // try {
        //   await emailService.sendSubscriptionExpired(user.email as string);
        // } catch (emailError) {
        //   console.error(`[Cron] Failed to send expiration email to ${user.email}:`, emailError);
        // }
      } catch (error) {
        console.error(`[Cron] Failed to downgrade subscription for user ${user.user_id}:`, error);
      }
    }

    // ========================================
    // TASK 5: Clean up inactive links
    // ========================================
    const inactiveLinkCleanup = new InactiveLinkCleanupService(env);
    const inactiveLinkResult = await inactiveLinkCleanup.run();

    inactiveLinksDeleted = inactiveLinkResult.linksDeleted;

    console.log(`[Cron] Inactive links cleanup:
      - Free tier deleted: ${inactiveLinkResult.freeDeleted}
      - Pro tier deleted: ${inactiveLinkResult.proDeleted}
      - Total deleted: ${inactiveLinksDeleted}
    `);

    // ========================================
    // TASK 6: Clean up old R2 logs (30+ days old)
    // ========================================
    if (env.R2_BUCKET) {
      const logger = createR2LogService(env);
      const day30 = 30 * 24 * 60 * 60 * 1000;
      const beforeDate = new Date(Date.now() - day30);

      // Get all users to clean their logs
      const allUsers = await env.DB.prepare(`
        SELECT user_id FROM users
      `).all();

      for (const user of allUsers.results) {
        try {
          const deleted = await logger.cleanupOldLogs(user.user_id as string, beforeDate);
          logsDeleted += deleted;
        } catch (error) {
          console.error(`[Cron] Failed to clean logs for user ${user.user_id}:`, error);
        }
      }

      // Also clean system logs
      try {
        // List and delete old system logs
        const systemPrefix = 'logs/system/';
        const listed = await env.R2_BUCKET.list({ prefix: systemPrefix });

        for (const object of listed.objects) {
          // Parse date from path: logs/system/{year}/{month}/{day}/{hour}/
          const pathParts = object.key.split('/');
          if (pathParts.length >= 5) {
            const year = parseInt(pathParts[2]);
            const month = parseInt(pathParts[3]) - 1;
            const day = parseInt(pathParts[4]);

            const fileDate = new Date(Date.UTC(year, month, day));

            if (fileDate < beforeDate) {
              await env.R2_BUCKET.delete(object.key);
              logsDeleted++;
            }
          }
        }
      } catch (error) {
        console.error('[Cron] Failed to clean system logs:', error);
      }

      console.log(`[Cron] Cleaned ${logsDeleted} old log files`);
    }

    // ========================================
    // SUMMARY
    // ========================================
    console.log(`[Cron] Daily cleanup complete:
      - Account warnings sent: ${warningsSent}
      - Accounts deleted: ${accountsDeleted}
      - Expired tokens cleaned: ${tokensDeleted}
      - Subscriptions downgraded: ${subscriptionsDowngraded}
      - Inactive links deleted: ${inactiveLinksDeleted}
      - Old log files deleted: ${logsDeleted}
    `);
  } catch (error) {
    console.error('[Cron] Daily cleanup failed:', error);
    // Don't throw - allow cron to continue next day
  }
}
