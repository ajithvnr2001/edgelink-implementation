/**
 * Email Service - Resend Integration with Exponential Backoff Retry
 * Handles all transactional email sending for EdgeLink
 */

import type { Env } from '../../types';
import { Resend } from 'resend';
import { VerificationEmailTemplate } from './templates/verification';
import { PasswordResetEmailTemplate } from './templates/passwordReset';
import { PasswordChangedEmailTemplate } from './templates/passwordChanged';
import { UnverifiedWarningTemplate } from './templates/unverifiedWarning';
import { AccountDeletedTemplate } from './templates/accountDeleted';

export class EmailService {
  private resend: Resend;
  private fromAddress: string;
  private frontendUrl: string;

  constructor(private env: Env) {
    this.resend = new Resend(env.RESEND_API_KEY);
    this.fromAddress = env.EMAIL_FROM_ADDRESS || 'EdgeLink <noreply@shortedbro.xyz>';
    this.frontendUrl = env.FRONTEND_URL || 'https://shortedbro.xyz';
  }

  /**
   * Send verification email with exponential backoff retry
   * Handles Resend rate limits (2 req/sec) automatically
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${token}`;

    return this.sendWithRetry(async () => {
      const result = await this.resend.emails.send({
        from: this.fromAddress,
        to: email,
        subject: 'Verify your EdgeLink account',
        html: VerificationEmailTemplate({ verificationUrl }),
        tags: [{ name: 'category', value: 'email_verification' }]
      });

      await this.logEmail({
        emailType: 'verification',
        recipientEmail: email,
        status: 'sent',
        providerMessageId: result.data?.id || null
      });

      return result;
    }, email, 'verification');
  }

  /**
   * Send password reset email with retry logic
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

    return this.sendWithRetry(async () => {
      const result = await this.resend.emails.send({
        from: this.fromAddress,
        to: email,
        subject: 'Reset your EdgeLink password',
        html: PasswordResetEmailTemplate({ resetUrl, expiryMinutes: 15 }),
        tags: [{ name: 'category', value: 'password_reset' }]
      });

      await this.logEmail({
        emailType: 'password_reset',
        recipientEmail: email,
        status: 'sent',
        providerMessageId: result.data?.id || null
      });

      return result;
    }, email, 'password_reset');
  }

  /**
   * Send password changed confirmation
   */
  async sendPasswordChangedEmail(email: string): Promise<void> {
    return this.sendWithRetry(async () => {
      const result = await this.resend.emails.send({
        from: this.fromAddress,
        to: email,
        subject: 'Your EdgeLink password was changed',
        html: PasswordChangedEmailTemplate({ email }),
        tags: [{ name: 'category', value: 'password_changed' }]
      });

      await this.logEmail({
        emailType: 'password_changed',
        recipientEmail: email,
        status: 'sent',
        providerMessageId: result.data?.id || null
      });

      return result;
    }, email, 'password_changed');
  }

  /**
   * Send unverified account warning (single warning at 80 days)
   */
  async sendUnverifiedWarning(email: string, daysUntilDeletion: number): Promise<void> {
    return this.sendWithRetry(async () => {
      const result = await this.resend.emails.send({
        from: this.fromAddress,
        to: email,
        subject: `⚠️ Verify your account - ${daysUntilDeletion} days remaining`,
        html: UnverifiedWarningTemplate({ daysUntilDeletion, loginUrl: `${this.frontendUrl}/login` }),
        tags: [{ name: 'category', value: 'unverified_warning' }]
      });

      await this.logEmail({
        emailType: 'unverified_warning',
        recipientEmail: email,
        status: 'sent',
        providerMessageId: result.data?.id || null
      });

      return result;
    }, email, 'unverified_warning');
  }

  /**
   * Send account deletion confirmation
   */
  async sendAccountDeleted(email: string, reason: string): Promise<void> {
    return this.sendWithRetry(async () => {
      const result = await this.resend.emails.send({
        from: this.fromAddress,
        to: email,
        subject: 'Your EdgeLink account has been deleted',
        html: AccountDeletedTemplate({ reason, deletedAt: new Date().toLocaleDateString() }),
        tags: [{ name: 'category', value: 'account_deleted' }]
      });

      await this.logEmail({
        emailType: 'account_deleted',
        recipientEmail: email,
        status: 'sent',
        providerMessageId: result.data?.id || null
      });

      return result;
    }, email, 'account_deleted');
  }

  /**
   * Generic retry logic with exponential backoff
   * Handles Resend rate limits and temporary failures
   */
  private async sendWithRetry<T>(
    sendFn: () => Promise<T>,
    recipientEmail: string,
    emailType: string,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await sendFn();
      } catch (error: any) {
        lastError = error;

        const statusCode = error.statusCode || error.status || 0;
        const retryAfterHeader = error.headers?.['retry-after'];

        // Handle rate limit (429)
        if (statusCode === 429) {
          const retryAfter = retryAfterHeader
            ? parseInt(retryAfterHeader)
            : Math.pow(2, attempt); // Exponential: 2s, 4s, 8s

          console.log(`[EmailService] Rate limited (429). Retrying after ${retryAfter}s. Attempt ${attempt}/${maxRetries}`);

          await this.logEmail({
            emailType,
            recipientEmail,
            status: 'rate_limited',
            errorMessage: `Rate limit hit, retry after ${retryAfter}s`,
            retryCount: attempt
          });

          await this.sleep(retryAfter * 1000);
          continue;
        }

        // Handle server errors (5xx)
        if (statusCode >= 500 && statusCode < 600) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`[EmailService] Server error (${statusCode}). Retrying after ${delay}ms. Attempt ${attempt}/${maxRetries}`);
          await this.sleep(delay);
          continue;
        }

        // For client errors (4xx except 429), don't retry
        console.error(`[EmailService] Client error (${statusCode}). Not retrying.`, error);
        break;
      }
    }

    // All retries failed
    await this.logEmail({
      emailType,
      recipientEmail,
      status: 'failed',
      errorMessage: lastError?.message || 'Unknown error',
      retryCount: maxRetries
    });

    throw new Error(`Failed to send ${emailType} email after ${maxRetries} retries: ${lastError?.message}`);
  }

  /**
   * Log email sending attempts to D1
   */
  private async logEmail(data: {
    emailType: string;
    recipientEmail: string;
    status: string;
    providerMessageId?: string | null;
    errorMessage?: string;
    retryCount?: number;
  }): Promise<void> {
    try {
      await this.env.DB.prepare(`
        INSERT INTO email_logs
        (email_type, recipient_email, status, provider_message_id, error_message, retry_count)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        data.emailType,
        data.recipientEmail,
        data.status,
        data.providerMessageId || null,
        data.errorMessage || null,
        data.retryCount || 0
      ).run();
    } catch (error) {
      console.error('[EmailService] Failed to log email:', error);
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
