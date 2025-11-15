# Product Requirements Document (PRD)

## End-to-End Email Architecture for EdgeLink (Tiny SaaS Version)

**Product:** EdgeLink URL Shortener
**Version:** 3.0 (Simplified for Tiny SaaS)
**Author:** Product Engineering
**Date:** November 15, 2025, 3:24 AM IST
**Status:** Implementation Ready

***

## Executive Summary

This PRD defines the complete email architecture for EdgeLink, a tiny SaaS URL shortener, integrating transactional email capabilities into the existing Cloudflare Workers-based platform. The system handles authentication flows (email verification, password reset), security notifications, and **simplified automated cleanup for unverified accounts only**. The architecture prioritizes simplicity, cost efficiency (\$0 monthly), and ease of maintenance for solo developers, using Resend with exponential backoff retry logic. Verified users are never automatically deleted, keeping the system simple and user-friendly.

***

## Current State Analysis

### Existing EdgeLink Infrastructure[^1]

- **Backend**: Cloudflare Workers (TypeScript) at `go.shortedbro.xyz`
- **Frontend**: Next.js 14 at `shortedbro.xyz` (Cloudflare Pages)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare KV + R2
- **Authentication**: Custom JWT-based auth with endpoints:
    - `POST /auth/signup`
    - `POST /auth/login`
    - `POST /auth/refresh`
    - `POST /auth/logout`
- **Secrets**: `JWT_SECRET`, `REFRESH_TOKEN_SECRET` managed via Wrangler


### Current Gaps

- No email verification on signup[^1]
- No password reset functionality[^1]
- No security notifications[^1]
- No email service integration[^1]
- **No cleanup for abandoned unverified accounts**[^1]

***

## Problem Statement

EdgeLink users cannot verify their email addresses, recover forgotten passwords, or receive important notifications. Additionally, **abandoned unverified accounts accumulate in the database** (likely test accounts or spam), creating:

1. **Security risks**: Unverified accounts susceptible to abuse
2. **Poor UX**: Users locked out of accounts with no recovery method
3. **Database clutter**: Unverified test accounts consuming storage
4. **No GDPR data minimization**: Retaining abandoned signup data indefinitely[^2]
5. **No engagement**: No proactive communication about account status

***

## Goals \& Success Metrics

### Primary Goals

1. Implement secure email verification flow (verification rate >85%)
2. Enable password reset functionality (completion rate >70%)
3. Deliver transactional emails with 99%+ deliverability
4. **Simple cleanup: Delete only unverified accounts after 90 days** (GDPR-compliant data minimization)[^2]
5. Maintain \$0 monthly costs with minimal maintenance burden

### Success Metrics

- Email deliverability rate: >99%
- Email verification completion: >85% within 24 hours
- Password reset completion: >70% within 15 minutes
- Email sending latency: <500ms (p95)
- **Automated cleanup: 100% unverified accounts >90 days removed**
- **Zero verified user deletions** (all verified users kept indefinitely)
- **Maintenance time: <1 hour/month**
- Zero email-related security incidents

***

## Solution Overview

### Architecture Principles (Tiny SaaS Optimized)

1. **Simplicity First**: Minimal complexity, easy to maintain as solo developer
2. **Keep Verified Users**: Never auto-delete verified accounts (user-friendly)
3. **Clean Abandoned Signups**: Only delete unverified accounts after 90 days (generous grace period)
4. **Security First**: Token-based flows with expiration, hashing, single-use[^3][^4]
5. **Cost Efficiency**: 100% free tier usage (Resend 3,000/month, single cron)[^5][^6][^7]
6. **Cloudflare Native**: Workers-first with D1, KV, single Cron Trigger[^8][^1]
7. **Easy Migration**: Simple path to Cloudflare Queues when scaling[^9][^10]

### Technology Stack

| Component | Technology | Purpose | Cost |
| :-- | :-- | :-- | :-- |
| Email Provider | Resend | Authentication \& product emails | \$0 (3,000/mo free) [^5] |
| Payment Emails | DodoPayments | Automatic invoices/receipts | Included [^11] |
| Backend Runtime | Cloudflare Workers | Email API endpoints | \$0 (free tier) [^6] |
| Database | Cloudflare D1 | Token storage \& user data | \$0 (free tier) [^8] |
| Rate Limiting | Cloudflare KV | Per-user email limits | \$0 (free tier) [^8] |
| Retry Logic | Exponential Backoff | Handle Resend rate limits | \$0 (built-in) [^12] |
| Cron Jobs | Cloudflare Cron Trigger | Daily cleanup (1 job) | \$0 (free) [^7] |


***

## Email Types \& Ownership

### Resend-Handled Emails[^13][^5]

**Authentication Emails**

1. **Email Verification** - Sent on signup
2. **Password Reset** - Sent on forgot password request
3. **Password Changed Confirmation** - Sent after successful password update

**Account Lifecycle Emails** (Simplified)
4. **Unverified Account Warning (80 days)** - Single warning, 10 days before deletion
5. **Account Deletion Notice** - Account deleted after 90 days unverified

**Security Emails** (Optional - Future Enhancement)
6. **Suspicious Login Alert** - New device/location login
7. **API Key Created** - New API key generated

### DodoPayments-Handled Emails (Automatic)[^11][^14]

**Payment Emails**

1. **Payment Receipt** - Instant on successful payment
2. **Invoice** - Professional invoice with tax breakdown
3. **Subscription Renewal** - Monthly/annual billing
4. **Payment Failed** - Card declined notification
5. **Subscription Cancelled** - Cancellation confirmation

***

## Technical Architecture

### Database Schema

Add to existing `edgelink/backend/schema.sql`:[^1]

```sql
-- Extend users table with email and minimal account lifecycle tracking
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN email_verified_at INTEGER;
ALTER TABLE users ADD COLUMN last_login_at INTEGER DEFAULT (unixepoch());
ALTER TABLE users ADD COLUMN unverified_warning_sent_at INTEGER; -- Single warning tracking
ALTER TABLE users ADD COLUMN created_at INTEGER DEFAULT (unixepoch());
ALTER TABLE users ADD COLUMN updated_at INTEGER DEFAULT (unixepoch());

-- Email verification tokens
CREATE TABLE email_verification_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_verification_token_hash ON email_verification_tokens(token_hash);
CREATE INDEX idx_verification_expires ON email_verification_tokens(expires_at);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  used_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_reset_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_reset_expires ON password_reset_tokens(expires_at);

-- Email activity log (for debugging & compliance)
CREATE TABLE email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL, -- 'sent', 'failed', 'bounced', 'rate_limited'
  provider_message_id TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  sent_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_email_logs_user ON email_logs(user_id);
CREATE INDEX idx_email_logs_type ON email_logs(email_type);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at);

-- Account deletion log (optional - for your records and compliance)
CREATE TABLE account_deletions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  reason TEXT NOT NULL, -- 'unverified_90d', 'user_requested'
  link_count INTEGER DEFAULT 0,
  deleted_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_deletions_deleted_at ON account_deletions(deleted_at);

-- Performance indexes for cleanup queries
CREATE INDEX idx_users_email_verified_created ON users(email_verified, created_at);
CREATE INDEX idx_users_unverified_warning ON users(unverified_warning_sent_at);
```


### Backend File Structure

```
edgelink/backend/src/
├── handlers/
│   ├── auth/
│   │   ├── signup.ts              # Modified: Add email verification
│   │   ├── login.ts               # Modified: Update last_login_at, check email_verified
│   │   ├── verify-email.ts        # NEW: Handle verification link
│   │   ├── resend-verification.ts # NEW: Resend verification email
│   │   ├── request-reset.ts       # NEW: Send password reset email
│   │   ├── reset-password.ts      # NEW: Complete password reset
│   │   └── logout.ts              # Existing
│   │
│   ├── email/
│   │   └── webhook.ts             # NEW: Resend webhook handler (optional)
│   │
│   ├── user/
│   │   └── delete-account.ts      # NEW: User-requested account deletion
│   │
│   ├── links/
│   │   ├── create.ts              # Existing
│   │   ├── update.ts              # Existing
│   │   ├── delete.ts              # Existing
│   │   └── list.ts                # Existing
│   │
│   └── dodopayments/
│       └── webhook.ts              # Existing payment webhook
│
├── services/
│   ├── email/
│   │   ├── emailService.ts        # NEW: Core email sending with retry logic
│   │   ├── rateLimiter.ts         # NEW: KV-based rate limiting
│   │   └── templates/
│   │       ├── verification.ts     # Email verification HTML
│   │       ├── passwordReset.ts    # Password reset HTML
│   │       ├── passwordChanged.ts  # Password change confirmation
│   │       ├── unverifiedWarning.ts # NEW: Single warning (80 days)
│   │       └── accountDeleted.ts   # NEW: Deletion confirmation
│   │
│   ├── auth/
│   │   ├── tokenService.ts        # NEW: Token generation & validation
│   │   └── passwordService.ts     # Existing password hashing
│   │
│   ├── cleanup/
│   │   └── deletionService.ts     # NEW: Account deletion with cascade
│   │
│   └── analytics/                  # Existing analytics
│
├── cron/
│   └── dailyCleanup.ts            # NEW: Single daily cron job
│
├── middleware/
│   ├── auth.ts                     # Modified: Require email_verified, update last_login
│   ├── rateLimiter.ts             # Modified: Add email endpoint limits
│   └── validation.ts              # Modified: Add email validations
│
└── utils/
    ├── crypto.ts                   # NEW: Secure token generation
    ├── logger.ts                   # Existing
    └── errors.ts                   # Existing
```


### Frontend File Structure

```
edgelink/frontend/src/
├── app/
│   ├── verify-email/
│   │   └── page.tsx               # NEW: Email verification page
│   │
│   ├── forgot-password/
│   │   └── page.tsx               # NEW: Request password reset
│   │
│   ├── reset-password/
│   │   └── page.tsx               # NEW: Reset password form
│   │
│   ├── account/
│   │   ├── delete/
│   │   │   └── page.tsx           # NEW: Account deletion confirmation
│   │   └── settings/
│   │       └── page.tsx           # Modified: Show account info
│   │
│   └── auth/
│       ├── signup/
│       │   └── page.tsx           # Modified: Show verification prompt
│       └── login/
│           └── page.tsx           # Modified: Check verification status
│
├── components/
│   ├── auth/
│   │   ├── VerificationPrompt.tsx  # NEW: Resend verification UI
│   │   ├── PasswordResetForm.tsx   # NEW: Reset password form
│   │   └── EmailVerifiedBadge.tsx  # NEW: Verified status indicator
│   │
│   └── notifications/
│       └── EmailToast.tsx          # NEW: Email-specific toasts
│
└── lib/
    ├── api/
    │   ├── emailApi.ts             # NEW: Email-related API calls
    │   └── accountApi.ts           # NEW: Account management API
    │
    └── hooks/
        └── useEmailVerification.ts # NEW: Verification state management
```


***

## Detailed Feature Specifications

### Feature 1: Email Verification Flow

#### User Journey

1. User signs up at `/auth/signup`
2. Account created with `email_verified = 0`, `last_login_at = now()`
3. Verification email sent immediately (with retry logic)
4. User receives email with 48-hour valid link
5. User clicks link → redirected to `/verify-email?token=xyz`
6. Backend validates token, sets `email_verified = 1`, `email_verified_at = now()`
7. User redirected to dashboard with success message
8. Unverified users see prompt to verify on login

#### Technical Implementation

**Backend: `handlers/auth/signup.ts`**[^1]

```typescript
import { EmailService } from '../../services/email/emailService';
import { TokenService } from '../../services/auth/tokenService';
import { EmailRateLimiter } from '../../services/email/rateLimiter';

export async function handleSignup(request: Request, env: Env): Promise<Response> {
  const { email, password } = await request.json();
  
  // Validation
  if (!isValidEmail(email)) {
    return errorResponse('Invalid email format', 400);
  }
  
  // Check rate limit (5 signups per hour per email) [web:131]
  const rateLimiter = new EmailRateLimiter(env.KV);
  const allowed = await rateLimiter.checkRateLimit(email, 'verification');
  
  if (!allowed) {
    return errorResponse('Too many verification requests. Please try again in an hour.', 429);
  }
  
  // Check if user exists
  const existingUser = await env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(email).first();
  
  if (existingUser) {
    return errorResponse('Email already registered', 409);
  }
  
  // Create user
  const passwordHash = await hashPassword(password);
  const now = Math.floor(Date.now() / 1000);
  
  const result = await env.DB.prepare(`
    INSERT INTO users (email, password_hash, email_verified, last_login_at, created_at)
    VALUES (?, ?, 0, ?, ?)
  `).bind(email, passwordHash, now, now).run();
  
  const userId = result.meta.last_row_id;
  
  // Generate verification token
  const tokenService = new TokenService(env);
  const { token } = await tokenService.generateVerificationToken(userId);
  
  // Send verification email with retry logic [web:123][web:126]
  const emailService = new EmailService(env);
  try {
    await emailService.sendVerificationEmail(email, token);
  } catch (error) {
    // Email failed but account created - user can request resend
    console.error('Failed to send verification email:', error);
  }
  
  return jsonResponse({
    success: true,
    message: 'Account created. Please verify your email within 90 days.',
    userId
  }, 201);
}
```

**Backend: `services/auth/tokenService.ts`**

```typescript
import { createHash, randomBytes } from 'crypto';

export class TokenService {
  constructor(private env: Env) {}
  
  /**
   * Generate secure verification token with 48-hour expiration [web:54]
   */
  async generateVerificationToken(userId: number): Promise<{ token: string; tokenHash: string }> {
    // Generate cryptographically secure token (64 chars) [web:51]
    const token = randomBytes(32).toString('hex');
    
    // Hash token before storing (SHA-256) [web:51]
    const tokenHash = createHash('sha256').update(token).digest('hex');
    
    // Store in database with 48-hour expiration [web:54]
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
  async validateVerificationToken(token: string): Promise<{ valid: boolean; userId?: number }> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const now = Math.floor(Date.now() / 1000);
    
    const row = await this.env.DB.prepare(`
      SELECT vt.user_id, vt.expires_at, u.email_verified
      FROM email_verification_tokens vt
      JOIN users u ON vt.user_id = u.id
      WHERE vt.token_hash = ? AND vt.expires_at > ?
    `).bind(tokenHash, now).first();
    
    if (!row) {
      return { valid: false };
    }
    
    if (row.email_verified === 1) {
      return { valid: false }; // Already verified [web:54]
    }
    
    return { valid: true, userId: row.user_id };
  }
  
  /**
   * Generate password reset token with 15-minute expiration [web:51]
   */
  async generatePasswordResetToken(userId: number): Promise<{ token: string; tokenHash: string }> {
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    
    // 15-minute expiration for security [web:51]
    const expiresAt = Math.floor(Date.now() / 1000) + (15 * 60);
    
    // Delete any existing reset tokens for this user [web:51]
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
  async validatePasswordResetToken(token: string): Promise<{ valid: boolean; userId?: number }> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const now = Math.floor(Date.now() / 1000);
    
    const row = await this.env.DB.prepare(`
      SELECT user_id, expires_at, used_at
      FROM password_reset_tokens
      WHERE token_hash = ? AND expires_at > ?
    `).bind(tokenHash, now).first();
    
    if (!row || row.used_at) {
      return { valid: false }; // Token expired or already used [web:51]
    }
    
    return { valid: true, userId: row.user_id };
  }
}
```

**Backend: `services/email/emailService.ts`** (Core with Retry Logic)

```typescript
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
    this.fromAddress = env.EMAIL_FROM_ADDRESS || 'noreply@shortedbro.xyz';
    this.frontendUrl = env.FRONTEND_URL || 'https://shortedbro.xyz';
  }
  
  /**
   * Send verification email with exponential backoff retry
   * Handles Resend rate limits (2 req/sec) automatically [web:123][web:126]
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
        providerMessageId: result.id
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
        providerMessageId: result.id
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
        providerMessageId: result.id
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
        html: UnverifiedWarningTemplate({ daysUntilDeletion, loginUrl: `${this.frontendUrl}/auth/login` }),
        tags: [{ name: 'category', value: 'unverified_warning' }]
      });
      
      await this.logEmail({
        emailType: 'unverified_warning',
        recipientEmail: email,
        status: 'sent',
        providerMessageId: result.id
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
        providerMessageId: result.id
      });
      
      return result;
    }, email, 'account_deleted');
  }
  
  /**
   * Generic retry logic with exponential backoff
   * Handles Resend rate limits and temporary failures [web:123][web:126]
   */
  private async sendWithRetry<T>(
    sendFn: () => Promise<T>,
    recipientEmail: string,
    emailType: string,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await sendFn();
      } catch (error: any) {
        lastError = error;
        
        const statusCode = error.statusCode || error.status || 0;
        const retryAfterHeader = error.headers?.['retry-after'];
        
        // Handle rate limit (429) [web:123][web:126]
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
      errorMessage: lastError.message,
      retryCount: maxRetries
    });
    
    throw new Error(`Failed to send ${emailType} email after ${maxRetries} retries: ${lastError.message}`);
  }
  
  /**
   * Log email sending attempts to D1
   */
  private async logEmail(data: {
    emailType: string;
    recipientEmail: string;
    status: string;
    providerMessageId?: string;
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
```

**Backend: `services/email/rateLimiter.ts`** (KV-Based)

```typescript
/**
 * KV-based rate limiter to prevent email abuse
 * Uses Cloudflare KV (free tier: 100K reads/day) [web:131]
 */
export class EmailRateLimiter {
  constructor(private kv: KVNamespace) {}
  
  async checkRateLimit(
    email: string, 
    limitType: 'verification' | 'password_reset'
  ): Promise<boolean> {
    const key = `email_limit:${limitType}:${email}`;
    const countStr = await this.kv.get(key);
    
    const limits = {
      verification: 5,    // 5 verification emails per hour
      password_reset: 3   // 3 password reset emails per hour
    };
    
    const limit = limits[limitType];
    const count = countStr ? parseInt(countStr) : 0;
    
    if (count >= limit) {
      return false;
    }
    
    const newCount = count + 1;
    await this.kv.put(key, newCount.toString(), {
      expirationTtl: 3600 // 1 hour [web:131]
    });
    
    return true;
  }
}
```

**Backend: `services/email/templates/verification.ts`**[^15][^16]

```typescript
export function VerificationEmailTemplate({ verificationUrl }: { verificationUrl: string }): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #f0f0f0;">
    <h1 style="color: #4F46E5; margin: 0;">EdgeLink</h1>
    <p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">URL Shortener & Link Management</p>
  </div>
  
  <div style="padding: 40px 20px;">
    <h2 style="color: #1a1a1a; margin: 0 0 20px 0;">Verify your email address</h2>
    
    <p style="color: #555; font-size: 16px; margin: 0 0 20px 0;">
      Thanks for signing up for EdgeLink! To complete your registration and start creating short links, please verify your email address.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" 
         style="display: inline-block; background-color: #4F46E5; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Verify Email Address
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px; margin: 30px 0 0 0;">
      Or copy and paste this link into your browser:
    </p>
    <p style="color: #4F46E5; font-size: 13px; word-break: break-all; background: #f8f9fa; padding: 12px; border-radius: 4px; margin: 10px 0 0 0;">
      ${verificationUrl}
    </p>
    
    <p style="color: #999; font-size: 13px; margin: 30px 0 0 0;">
      This link will expire in 48 hours. Unverified accounts are automatically deleted after 90 days.
    </p>
  </div>
  
  <div style="border-top: 1px solid #e0e0e0; padding: 20px; text-align: center; color: #999; font-size: 12px;">
    <p style="margin: 0 0 10px 0;">EdgeLink - Smart URL Shortening</p>
    <p style="margin: 0 0 10px 0;">
      <a href="https://shortedbro.xyz" style="color: #4F46E5; text-decoration: none;">Dashboard</a> •
      <a href="https://shortedbro.xyz/help" style="color: #4F46E5; text-decoration: none;">Help Center</a>
    </p>
    <p style="margin: 0; color: #ccc;">© 2025 EdgeLink. All rights reserved.</p>
  </div>
  
</body>
</html>
  `.trim();
}
```

**Backend: `handlers/auth/verify-email.ts`**

```typescript
export async function handleVerifyEmail(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  
  if (!token) {
    return errorResponse('Missing verification token', 400);
  }
  
  const tokenService = new TokenService(env);
  const { valid, userId } = await tokenService.validateVerificationToken(token);
  
  if (!valid) {
    return errorResponse('Invalid or expired verification token', 400);
  }
  
  const now = Math.floor(Date.now() / 1000);
  
  // Mark user as verified and delete token
  await env.DB.batch([
    env.DB.prepare(`
      UPDATE users 
      SET email_verified = 1, 
          email_verified_at = ?, 
          updated_at = ?
      WHERE id = ?
    `).bind(now, now, userId),
    
    env.DB.prepare(`
      DELETE FROM email_verification_tokens 
      WHERE user_id = ?
    `).bind(userId)
  ]);
  
  return jsonResponse({
    success: true,
    message: 'Email verified successfully'
  });
}
```

**Backend: `handlers/auth/resend-verification.ts`**

```typescript
export async function handleResendVerification(request: Request, env: Env): Promise<Response> {
  const { email } = await request.json();
  
  if (!isValidEmail(email)) {
    return errorResponse('Invalid email format', 400);
  }
  
  // Check rate limit
  const rateLimiter = new EmailRateLimiter(env.KV);
  const allowed = await rateLimiter.checkRateLimit(email, 'verification');
  
  if (!allowed) {
    return errorResponse('Too many requests. Please try again in an hour.', 429);
  }
  
  // Get user
  const user = await env.DB.prepare(
    'SELECT id, email_verified FROM users WHERE email = ?'
  ).bind(email).first();
  
  if (!user) {
    return jsonResponse({
      success: true,
      message: 'If your account exists, a verification email has been sent.'
    });
  }
  
  if (user.email_verified === 1) {
    return errorResponse('Email already verified', 400);
  }
  
  // Delete old token
  await env.DB.prepare(
    'DELETE FROM email_verification_tokens WHERE user_id = ?'
  ).bind(user.id).run();
  
  // Generate new token
  const tokenService = new TokenService(env);
  const { token } = await tokenService.generateVerificationToken(user.id);
  
  // Send email
  const emailService = new EmailService(env);
  try {
    await emailService.sendVerificationEmail(email, token);
  } catch (error) {
    return errorResponse('Failed to send verification email. Please try again.', 500);
  }
  
  return jsonResponse({
    success: true,
    message: 'Verification email sent successfully'
  });
}
```

**Backend: `handlers/auth/login.ts`** (Modified)

```typescript
export async function handleLogin(request: Request, env: Env): Promise<Response> {
  const { email, password } = await request.json();
  
  const user = await env.DB.prepare(`
    SELECT id, email, password_hash, email_verified
    FROM users 
    WHERE email = ?
  `).bind(email).first();
  
  if (!user) {
    return errorResponse('Invalid credentials', 401);
  }
  
  const passwordValid = await verifyPassword(password, user.password_hash);
  if (!passwordValid) {
    return errorResponse('Invalid credentials', 401);
  }
  
  // Update last_login_at
  await env.DB.prepare(`
    UPDATE users SET last_login_at = ? WHERE id = ?
  `).bind(Math.floor(Date.now() / 1000), user.id).run();
  
  // Generate JWT tokens
  const accessToken = await generateAccessToken(user.id, env.JWT_SECRET);
  const refreshToken = await generateRefreshToken(user.id, env.REFRESH_TOKEN_SECRET);
  
  return jsonResponse({
    success: true,
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      emailVerified: user.email_verified === 1
    }
  });
}
```

**Frontend: `app/verify-email/page.tsx`**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { verifyEmail } from '@/lib/api/emailApi';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token');
      return;
    }
    
    verifyEmail(token)
      .then(() => {
        setStatus('success');
        setMessage('Email verified successfully!');
        setTimeout(() => router.push('/dashboard'), 2000);
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error.message || 'Verification failed');
      });
  }, [searchParams, router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-center mt-4 text-gray-600">Verifying your email...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="text-green-500 text-5xl text-center">✓</div>
            <h2 className="text-2xl font-bold text-center mt-4">Email Verified!</h2>
            <p className="text-center text-gray-600 mt-2">{message}</p>
            <p className="text-center text-sm text-gray-500 mt-4">Redirecting to dashboard...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="text-red-500 text-5xl text-center">✕</div>
            <h2 className="text-2xl font-bold text-center mt-4">Verification Failed</h2>
            <p className="text-center text-gray-600 mt-2">{message}</p>
            <button 
              onClick={() => router.push('/auth/login')}
              className="w-full mt-6 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```


***

### Feature 2: Password Reset Flow

#### User Journey[^3]

1. User clicks "Forgot Password" on login page
2. Enters email address → submits form
3. Always shows "Check your email" (no email enumeration)[^3]
4. User receives reset email with 15-minute valid link[^3]
5. Clicks link → redirected to `/reset-password?token=xyz`
6. Enters new password → submits
7. Backend validates token, updates password[^3]
8. User redirected to login with success message
9. Confirmation email sent to user[^3]

#### Technical Implementation

**Backend: `handlers/auth/request-reset.ts`**[^3]

```typescript
export async function handleRequestPasswordReset(request: Request, env: Env): Promise<Response> {
  const { email } = await request.json();
  
  if (!isValidEmail(email)) {
    return errorResponse('Invalid email format', 400);
  }
  
  // Check rate limit
  const rateLimiter = new EmailRateLimiter(env.KV);
  const allowed = await rateLimiter.checkRateLimit(email, 'password_reset');
  
  if (!allowed) {
    return errorResponse('Too many reset requests. Please try again in an hour.', 429);
  }
  
  // Check if user exists
  const user = await env.DB.prepare(
    'SELECT id, email FROM users WHERE email = ?'
  ).bind(email).first();
  
  // ALWAYS return success to prevent email enumeration [web:51]
  if (!user) {
    return jsonResponse({
      success: true,
      message: 'If an account exists with that email, you will receive a password reset link.'
    });
  }
  
  // Generate reset token
  const tokenService = new TokenService(env);
  const { token } = await tokenService.generatePasswordResetToken(user.id);
  
  // Send reset email
  const emailService = new EmailService(env);
  try {
    await emailService.sendPasswordResetEmail(user.email, token);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
  }
  
  return jsonResponse({
    success: true,
    message: 'If an account exists with that email, you will receive a password reset link.'
  });
}
```

**Backend: `handlers/auth/reset-password.ts`**[^3]

```typescript
export async function handleResetPassword(request: Request, env: Env): Promise<Response> {
  const { token, newPassword } = await request.json();
  
  if (newPassword.length < 8) {
    return errorResponse('Password must be at least 8 characters', 400);
  }
  
  const tokenService = new TokenService(env);
  const { valid, userId } = await tokenService.validatePasswordResetToken(token);
  
  if (!valid) {
    return errorResponse('Invalid or expired reset token', 400);
  }
  
  const passwordHash = await hashPassword(newPassword);
  const now = Math.floor(Date.now() / 1000);
  
  // Update password and mark token as used
  await env.DB.batch([
    env.DB.prepare(`
      UPDATE users 
      SET password_hash = ?, updated_at = ?
      WHERE id = ?
    `).bind(passwordHash, now, userId),
    
    env.DB.prepare(`
      UPDATE password_reset_tokens
      SET used_at = ?
      WHERE user_id = ? AND used_at IS NULL
    `).bind(now, userId)
  ]);
  
  // Get user email
  const user = await env.DB.prepare(
    'SELECT email FROM users WHERE id = ?'
  ).bind(userId).first();
  
  // Send confirmation email
  const emailService = new EmailService(env);
  try {
    await emailService.sendPasswordChangedEmail(user.email);
  } catch (error) {
    console.error('Failed to send password changed email:', error);
  }
  
  return jsonResponse({
    success: true,
    message: 'Password reset successfully'
  });
}
```

**Backend: `services/email/templates/passwordReset.ts`**[^16][^15]

```typescript
export function PasswordResetEmailTemplate({ resetUrl, expiryMinutes = 15 }: { resetUrl: string; expiryMinutes?: number }): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #f0f0f0;">
    <h1 style="color: #4F46E5; margin: 0;">EdgeLink</h1>
  </div>
  
  <div style="padding: 40px 20px;">
    <h2 style="color: #1a1a1a; margin: 0 0 20px 0;">Reset your password</h2>
    
    <p style="color: #555; font-size: 16px; margin: 0 0 20px 0;">
      You requested to reset your password. Click the button below to create a new password.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" 
         style="display: inline-block; background-color: #4F46E5; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Reset Password
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px; margin: 30px 0 0 0;">
      Or copy and paste this link into your browser:
    </p>
    <p style="color: #4F46E5; font-size: 13px; word-break: break-all; background: #f8f9fa; padding: 12px; border-radius: 4px; margin: 10px 0 0 0;">
      ${resetUrl}
    </p>
    
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 30px 0; border-radius: 4px;">
      <p style="color: #856404; font-size: 14px; margin: 0;">
        ⚠️ <strong>Security Notice:</strong> This link will expire in ${expiryMinutes} minutes. If you didn't request this reset, please ignore this email.
      </p>
    </div>
  </div>
  
  <div style="border-top: 1px solid #e0e0e0; padding: 20px; text-align: center; color: #999; font-size: 12px;">
    <p style="margin: 0 0 10px 0;">EdgeLink - Smart URL Shortening</p>
    <p style="margin: 0; color: #ccc;">© 2025 EdgeLink. All rights reserved.</p>
  </div>
  
</body>
</html>
  `.trim();
}
```

**Backend: `services/email/templates/passwordChanged.ts`**

```typescript
export function PasswordChangedEmailTemplate({ email }: { email: string }): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Changed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #f0f0f0;">
    <h1 style="color: #4F46E5; margin: 0;">EdgeLink</h1>
  </div>
  
  <div style="padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background: #10b981; color: white; width: 60px; height: 60px; border-radius: 50%; line-height: 60px; font-size: 30px;">✓</div>
    </div>
    
    <h2 style="color: #1a1a1a; margin: 0 0 20px 0; text-align: center;">Password Changed Successfully</h2>
    
    <p style="color: #555; font-size: 16px; margin: 0 0 20px 0;">
      Your EdgeLink password was changed successfully. You can now use your new password to log in.
    </p>
    
    <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 30px 0; border-radius: 4px;">
      <p style="color: #1e40af; font-size: 14px; margin: 0;">
        <strong>Account:</strong> ${email}<br>
        <strong>Changed at:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC
      </p>
    </div>
    
    <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 30px 0; border-radius: 4px;">
      <p style="color: #991b1b; font-size: 14px; margin: 0;">
        ⚠️ <strong>Didn't change your password?</strong><br>
        If you didn't make this change, please contact support immediately at support@shortedbro.xyz
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://shortedbro.xyz/auth/login" 
         style="display: inline-block; background-color: #4F46E5; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; font-size: 14px;">
        Log In Now
      </a>
    </div>
  </div>
  
  <div style="border-top: 1px solid #e0e0e0; padding: 20px; text-align: center; color: #999; font-size: 12px;">
    <p style="margin: 0 0 10px 0;">EdgeLink - Smart URL Shortening</p>
    <p style="margin: 0; color: #ccc;">© 2025 EdgeLink. All rights reserved.</p>
  </div>
  
</body>
</html>
  `.trim();
}
```

**Frontend: `app/forgot-password/page.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestPasswordReset } from '@/lib/api/emailApi';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };
  
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-green-500 text-5xl text-center">✓</div>
          <h2 className="text-2xl font-bold text-center mt-4">Check Your Email</h2>
          <p className="text-center text-gray-600 mt-2">
            If an account exists with that email, you'll receive a password reset link shortly.
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full mt-6 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-2">Forgot Password</h2>
        <p className="text-center text-gray-600 mb-6">
          Enter your email and we'll send you a reset link
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="you@example.com"
              required
            />
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/auth/login')}
            className="text-sm text-indigo-600 hover:underline"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Frontend: `app/reset-password/page.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { resetPassword } from '@/lib/api/emailApi';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    if (!token) {
      setError('Missing reset token');
      return;
    }
    
    setLoading(true);
    
    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => router.push('/auth/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };
  
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-green-500 text-5xl text-center">✓</div>
          <h2 className="text-2xl font-bold text-center mt-4">Password Reset!</h2>
          <p className="text-center text-gray-600 mt-2">
            Your password has been changed successfully.
          </p>
          <p className="text-center text-sm text-gray-500 mt-4">Redirecting to login...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-2">Reset Your Password</h2>
        <p className="text-center text-gray-600 mb-6">
          Enter your new password below
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
```


***

### Feature 3: Simplified Unverified Account Cleanup (Tiny SaaS)

#### Business Rules (Simplified)

**Unverified Accounts Only**[^17][^2]

- Retention period: **90 days from signup** (generous grace period)
- Single warning: **Day 80** (10 days before deletion)
- Deletion: **Day 90** (automatic)
- Justification: User never confirmed email, likely abandoned signup or test account

**Verified Accounts**

- **Never automatically deleted** (all verified users kept indefinitely)
- Justification: Verified users are real customers; deleting them would harm trust and UX

**Paid/Active Accounts**

- Never deleted (has active DodoPayments subscription)
- Subscription presence indicates active usage


#### User Journey

**Unverified Account Cleanup**

1. Day 0: User signs up, doesn't verify email
2. Day 1-79: No action
3. Day 80: Warning email sent ("10 days until deletion")
4. Day 90: Account automatically deleted, deletion confirmation email sent

**Verified Account**

1. User verifies email anytime
2. Account kept indefinitely (never auto-deleted)

#### Technical Implementation

**Backend: `services/cleanup/deletionService.ts`** (Simplified)

```typescript
/**
 * Simplified deletion service for tiny SaaS
 * Only deletes unverified accounts after 90 days
 */
export class DeletionService {
  constructor(private env: Env) {}
  
  /**
   * Delete user account and all associated data (CASCADE)
   */
  async deleteAccount(
    userId: number, 
    reason: string
  ): Promise<{ success: boolean; email: string; linkCount: number }> {
    // Get user data before deletion
    const user = await this.env.DB.prepare(`
      SELECT 
        u.id,
        u.email,
        COUNT(l.id) as link_count
      FROM users u
      LEFT JOIN links l ON l.user_id = u.id
      WHERE u.id = ?
      GROUP BY u.id
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
      user.id,
      user.email,
      reason,
      user.link_count || 0
    ).run();
    
    // Cascade delete all user data
    await env.DB.batch([
      // Delete links
      this.env.DB.prepare('DELETE FROM links WHERE user_id = ?').bind(userId),
      
      // Delete tokens (will cascade automatically with FOREIGN KEY ON DELETE CASCADE)
      // email_verification_tokens, password_reset_tokens auto-deleted
      
      // Delete user
      this.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId)
    ]);
    
    return { 
      success: true, 
      email: user.email,
      linkCount: user.link_count || 0
    };
  }
}
```

**Backend: `cron/dailyCleanup.ts`** (Single Simplified Cron Job)[^7]

```typescript
import { EmailService } from '../services/email/emailService';
import { DeletionService } from '../services/cleanup/deletionService';

/**
 * Single daily cron job for tiny SaaS
 * Runs at 2 AM UTC every day
 * 
 * Tasks:
 * 1. Send warnings to unverified accounts (80 days old)
 * 2. Delete unverified accounts (90+ days old)
 * 3. Clean up expired tokens (7+ days old)
 */
export async function dailyCleanup(env: Env): Promise<void> {
  console.log('[Cron] Starting daily cleanup');
  
  const emailService = new EmailService(env);
  const deletionService = new DeletionService(env);
  const now = Math.floor(Date.now() / 1000);
  
  let warningsSent = 0;
  let accountsDeleted = 0;
  
  try {
    // 1. Send warnings to unverified accounts (80 days old)
    const day80 = 80 * 24 * 60 * 60;
    const day81 = 81 * 24 * 60 * 60;
    
    const accountsForWarning = await env.DB.prepare(`
      SELECT id, email, created_at
      FROM users
      WHERE email_verified = 0
        AND unverified_warning_sent_at IS NULL
        AND created_at BETWEEN ? AND ?
    `).bind(now - day81, now - day80).all();
    
    console.log(`[Cron] Found ${accountsForWarning.results.length} accounts for warning`);
    
    for (const account of accountsForWarning.results) {
      try {
        // Send warning email (10 days until deletion)
        await emailService.sendUnverifiedWarning(account.email, 10);
        
        // Mark warning as sent
        await env.DB.prepare(`
          UPDATE users SET unverified_warning_sent_at = ? WHERE id = ?
        `).bind(now, account.id).run();
        
        warningsSent++;
      } catch (error) {
        console.error(`[Cron] Failed to send warning to ${account.email}:`, error);
      }
    }
    
    // 2. Delete unverified accounts (90+ days old)
    const day90 = 90 * 24 * 60 * 60;
    
    const accountsToDelete = await env.DB.prepare(`
      SELECT id, email, created_at
      FROM users
      WHERE email_verified = 0 
        AND created_at < ?
    `).bind(now - day90).all();
    
    console.log(`[Cron] Found ${accountsToDelete.results.length} accounts to delete`);
    
    for (const account of accountsToDelete.results) {
      try {
        const { email } = await deletionService.deleteAccount(
          account.id,
          'unverified_90d'
        );
        
        // Send deletion confirmation email
        await emailService.sendAccountDeleted(
          email, 
          'Your account was not verified within 90 days'
        );
        
        accountsDeleted++;
      } catch (error) {
        console.error(`[Cron] Failed to delete account ${account.id}:`, error);
      }
    }
    
    // 3. Clean up expired tokens (7+ days old)
    const day7 = 7 * 24 * 60 * 60;
    
    const verificationResult = await env.DB.prepare(`
      DELETE FROM email_verification_tokens WHERE expires_at < ?
    `).bind(now - day7).run();
    
    const resetResult = await env.DB.prepare(`
      DELETE FROM password_reset_tokens WHERE expires_at < ?
    `).bind(now - day7).run();
    
    const tokensDeleted = (verificationResult.meta.changes || 0) + (resetResult.meta.changes || 0);
    
    console.log(`[Cron] Daily cleanup complete:
      - Warnings sent: ${warningsSent}
      - Accounts deleted: ${accountsDeleted}
      - Expired tokens cleaned: ${tokensDeleted}
    `);
    
  } catch (error) {
    console.error('[Cron] Daily cleanup failed:', error);
    // Don't throw - allow cron to continue next day
  }
}
```

**Backend: `wrangler.toml`** (Single Cron Configuration)[^7]

```toml
name = "edgelink-production"
main = "src/index.ts"
compatibility_date = "2024-11-14"

# Existing configuration [attached_file:1]
[[d1_databases]]
binding = "DB"
database_name = "edgelink-production"
database_id = "your-d1-id"

[[kv_namespaces]]
binding = "KV"
id = "your-kv-id"

# Single Cron Trigger (Free) [web:141]
[triggers]
crons = ["0 2 * * *"]  # Daily at 2 AM UTC

# Environment variables
[vars]
FRONTEND_URL = "https://shortedbro.xyz"
EMAIL_FROM_ADDRESS = "noreply@shortedbro.xyz"
VERIFICATION_TOKEN_EXPIRY_HOURS = "48"
RESET_TOKEN_EXPIRY_MINUTES = "15"

# Simplified retention policy (tiny SaaS)
UNVERIFIED_RETENTION_DAYS = "90"
# Note: Verified users NEVER auto-deleted

# Secrets (set via wrangler secret put)
# RESEND_API_KEY
# JWT_SECRET
# REFRESH_TOKEN_SECRET
```

**Backend: `src/index.ts`** (Main Worker Entry Point)

```typescript
import { handleRequest } from './router';
import { dailyCleanup } from './cron/dailyCleanup';

export default {
  // HTTP requests
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handleRequest(request, env, ctx);
  },
  
  // Cron trigger [web:141]
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Single cron job handles all cleanup tasks
    await dailyCleanup(env);
  }
};
```

**Backend: `services/email/templates/unverifiedWarning.ts`**

```typescript
export function UnverifiedWarningTemplate(data: {
  daysUntilDeletion: number;
  loginUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your account</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #f0f0f0;">
    <h1 style="color: #4F46E5; margin: 0;">EdgeLink</h1>
  </div>
  
  <div style="padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background: #fbbf24; color: white; width: 60px; height: 60px; border-radius: 50%; line-height: 60px; font-size: 30px;">⚠️</div>
    </div>
    
    <h2 style="color: #1a1a1a; margin: 0 0 20px 0; text-align: center;">Don't lose your account!</h2>
    
    <p style="color: #555; font-size: 16px; margin: 0 0 20px 0;">
      You signed up for EdgeLink but never verified your email. Your account will be deleted in <strong>${data.daysUntilDeletion} days</strong> unless you verify now.
    </p>
    
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="color: #92400e; font-size: 14px; margin: 0;">
        <strong>Why are we doing this?</strong> We automatically remove unverified accounts after 90 days to keep our system clean and secure.
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.loginUrl}" 
         style="display: inline-block; background-color: #4F46E5; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Log In & Verify Email
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px; margin: 30px 0 0 0; text-align: center;">
      If you don't want this account, no action needed. It will be automatically deleted after ${data.daysUntilDeletion} days.
    </p>
  </div>
  
  <div style="border-top: 1px solid #e0e0e0; padding: 20px; text-align: center; color: #999; font-size: 12px;">
    <p style="margin: 0 0 10px 0;">EdgeLink - Smart URL Shortening</p>
    <p style="margin: 0; color: #ccc;">© 2025 EdgeLink. All rights reserved.</p>
  </div>
  
</body>
</html>
  `.trim();
}
```

**Backend: `services/email/templates/accountDeleted.ts`**

```typescript
export function AccountDeletedTemplate(data: {
  reason: string;
  deletedAt: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Deleted</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #f0f0f0;">
    <h1 style="color: #6b7280; margin: 0;">EdgeLink</h1>
  </div>
  
  <div style="padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background: #6b7280; color: white; width: 60px; height: 60px; border-radius: 50%; line-height: 60px; font-size: 30px;">✓</div>
    </div>
    
    <h2 style="color: #1a1a1a; margin: 0 0 20px 0; text-align: center;">Your Account Has Been Deleted</h2>
    
    <p style="color: #555; font-size: 15px; margin: 0 0 20px 0;">
      Your EdgeLink account and all associated data have been permanently deleted on ${data.deletedAt}.
    </p>
    
    <div style="background: #f3f4f6; border-left: 4px solid #6b7280; padding: 15px; margin: 30px 0; border-radius: 4px;">
      <p style="color: #374151; font-size: 14px; margin: 0;">
        <strong>Reason:</strong> ${data.reason}
      </p>
    </div>
    
    <h3 style="color: #1a1a1a; font-size: 17px; margin: 30px 0 15px 0;">What was deleted:</h3>
    <ul style="color: #555; font-size: 14px; margin: 0 0 20px 0; padding-left: 20px;">
      <li>Your account and login credentials</li>
      <li>All shortened links</li>
      <li>All analytics data</li>
    </ul>
    
    <h3 style="color: #1a1a1a; font-size: 17px; margin: 30px 0 15px 0;">Want to use EdgeLink again?</h3>
    <p style="color: #555; font-size: 14px; margin: 0 0 20px 0;">
      You're welcome to create a new account anytime at <a href="https://shortedbro.xyz/auth/signup" style="color: #4F46E5;">shortedbro.xyz</a>
    </p>
  </div>
  
  <div style="border-top: 1px solid #e0e0e0; padding: 20px; text-align: center; color: #999; font-size: 12px;">
    <p style="margin: 0 0 10px 0;">EdgeLink - Smart URL Shortening</p>
    <p style="margin: 0; color: #ccc;">© 2025 EdgeLink. All rights reserved.</p>
  </div>
  
</body>
</html>
  `.trim();
}
```


***

### Feature 4: User-Requested Account Deletion

**Backend: `handlers/user/delete-account.ts`**[^18]

```typescript
import { DeletionService } from '../../services/cleanup/deletionService';
import { EmailService } from '../../services/email/emailService';

/**
 * User-requested account deletion
 * GDPR Right to Erasure [web:135]
 */
export async function handleDeleteAccount(request: Request, env: Env): Promise<Response> {
  // Authenticate user
  const userId = await authenticateRequest(request, env);
  if (!userId) {
    return errorResponse('Unauthorized', 401);
  }
  
  const { password, confirmation } = await request.json();
  
  // Require typed confirmation for security [web:140]
  if (confirmation !== 'delete my account') {
    return errorResponse('Please type "delete my account" to confirm', 400);
  }
  
  // Get user
  const user = await env.DB.prepare(
    'SELECT id, email, password_hash FROM users WHERE id = ?'
  ).bind(userId).first();
  
  // Verify password [web:140]
  const passwordValid = await verifyPassword(password, user.password_hash);
  if (!passwordValid) {
    return errorResponse('Invalid password', 401);
  }
  
  // Delete account
  const deletionService = new DeletionService(env);
  const { email } = await deletionService.deleteAccount(userId, 'user_requested');
  
  // Send confirmation email
  const emailService = new EmailService(env);
  try {
    await emailService.sendAccountDeleted(email, 'You requested to delete your account');
  } catch (error) {
    console.error('Failed to send deletion confirmation:', error);
  }
  
  return jsonResponse({
    success: true,
    message: 'Your account has been permanently deleted'
  });
}
```

**Frontend: `app/account/delete/page.tsx`**[^19][^18]

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteAccount } from '@/lib/api/accountApi';

export default function DeleteAccountPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (confirmation !== 'delete my account') {
      setError('Please type "delete my account" exactly as shown');
      return;
    }
    
    if (!password) {
      setError('Please enter your password');
      return;
    }
    
    setLoading(true);
    
    try {
      await deleteAccount({ password, confirmation });
      router.push('/account/deleted');
    } catch (err: any) {
      setError(err.message || 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="inline-block bg-red-100 text-red-600 w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-4">
            ⚠️
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Delete Account</h1>
          <p className="text-gray-600 mt-2">This action cannot be undone</p>
        </div>
        
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <h3 className="font-semibold text-red-800 mb-2">What will be deleted:</h3>
          <ul className="text-red-700 text-sm space-y-1">
            <li>• Your account and login credentials</li>
            <li>• All shortened links (they will stop working)</li>
            <li>• All analytics data</li>
          </ul>
        </div>
        
        <form onSubmit={handleDelete} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm your password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Enter your password"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <strong>"delete my account"</strong> to confirm
            </label>
            <input
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="delete my account"
              required
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {error}
            </div>
          )}
          
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.push('/account/settings')}
              className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || confirmation !== 'delete my account'}
              className="flex-1 bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Deleting...' : 'Permanently Delete Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```


***

## Configuration \& Deployment

### Environment Variables

**Backend: `edgelink/backend/wrangler.toml`**[^1]

```toml
name = "edgelink-production"
main = "src/index.ts"
compatibility_date = "2024-11-14"

# Existing configuration [attached_file:1]
[[d1_databases]]
binding = "DB"
database_name = "edgelink-production"
database_id = "your-d1-id"

[[kv_namespaces]]
binding = "KV"
id = "your-kv-id"

# Single Cron Trigger (Free) [web:141]
[triggers]
crons = ["0 2 * * *"]  # Daily at 2 AM UTC

# Environment variables
[vars]
FRONTEND_URL = "https://shortedbro.xyz"
EMAIL_FROM_ADDRESS = "noreply@shortedbro.xyz"
VERIFICATION_TOKEN_EXPIRY_HOURS = "48"
RESET_TOKEN_EXPIRY_MINUTES = "15"

# Simplified retention policy (tiny SaaS)
UNVERIFIED_RETENTION_DAYS = "90"
# Note: Verified users NEVER auto-deleted

# Secrets (set via wrangler secret put)
# RESEND_API_KEY
# JWT_SECRET
# REFRESH_TOKEN_SECRET
```


### Frontend Environment Variables

**Frontend: `edgelink/frontend/.env.local`** (Development)

```env
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_SHORT_URL_DOMAIN=localhost:8787
```

**Frontend: `edgelink/frontend/.env.production`** (Production)

```env
NEXT_PUBLIC_API_URL=https://go.shortedbro.xyz
NEXT_PUBLIC_FRONTEND_URL=https://shortedbro.xyz
NEXT_PUBLIC_SHORT_URL_DOMAIN=go.shortedbro.xyz
```


### Deployment Steps

```bash
# 1. Set Resend API key
cd edgelink/backend
wrangler secret put RESEND_API_KEY
# Enter your Resend API key from https://resend.com/api-keys

# 2. Run database migrations
wrangler d1 execute edgelink-production --file=./migrations/001_email_tables.sql --local

# Verify schema
wrangler d1 execute edgelink-production --command "SELECT name FROM sqlite_master WHERE type='table';" --local

# 3. Test locally first
wrangler dev

# 4. Run migrations on production database
wrangler d1 execute edgelink-production --file=./migrations/001_email_tables.sql

# 5. Deploy backend to production
wrangler deploy --env production

# 6. Test cron trigger manually (optional)
curl -X POST http://localhost:8787/__scheduled \
  -H "Content-Type: application/json" \
  -d '{"cron": "0 2 * * *"}'

# 7. Deploy frontend
cd ../frontend
npm run build
wrangler pages deploy .next --project-name=edgelink-production

# 8. Verify deployment
curl https://go.shortedbro.xyz/health
curl https://shortedbro.xyz
```


### DNS Configuration (Resend Domain Verification)

Add these records to your Cloudflare DNS for `shortedbro.xyz`:[^5]

```
Type: TXT
Name: shortedbro.xyz
Value: v=spf1 include:_spf.resend.com ~all

Type: TXT  
Name: resend._domainkey.shortedbro.xyz
Value: [Provided by Resend after domain verification]

Type: TXT
Name: _dmarc.shortedbro.xyz
Value: v=DMARC1; p=none; rua=mailto:dmarc@shortedbro.xyz
```


### Resend Dashboard Setup[^5]

1. **Add domain**: Go to Resend dashboard → Domains → Add Domain → Enter `shortedbro.xyz`
2. **Verify DNS records**: Wait for DNS propagation (5-30 minutes), click "Verify"
3. **Create API key**: API Keys → Create API Key → Scope: "Send emails" → Copy key
4. **Set up webhook (optional)**: Webhooks → Add Webhook → URL: `https://go.shortedbro.xyz/webhooks/resend`
5. **Enable events (optional)**: Select: `email.delivered`, `email.bounced`
6. **(Optional) Request rate limit increase**: Support → "Please increase my rate limit to 5-10 req/sec"[^12]

***

## Security Considerations

### Token Security[^4][^3]

1. **Generation**: Use `crypto.randomBytes(32)` for 64-character tokens[^3]
2. **Storage**: Always hash tokens (SHA-256) before database storage[^3]
3. **Expiration**: Verification 48h, reset 15min[^4][^3]
4. **Single-use**: Delete tokens after consumption[^3]
5. **No enumeration**: Always return success for password reset requests[^3]

### Rate Limiting[^8]

1. **Per-user limits**: 5 verification emails/hour, 3 password resets/hour[^8]
2. **KV storage**: TTL-based auto-expiration (1 hour)[^8]
3. **No global limits**: Prevents single user from blocking others

### Email Security

1. **SPF/DKIM**: Configure DNS records in Cloudflare dashboard[^5]
2. **HTTPS only**: All links use HTTPS[^3]
3. **Retry logic**: Exponential backoff prevents rate limit abuse[^20][^12]
4. **Logging**: All email activity logged for audit[^4]

### Account Deletion Security[^18][^2]

1. **Password confirmation**: Required for user-requested deletions[^18]
2. **Typed confirmation**: User must type "delete my account"[^19][^18]
3. **Email notifications**: Sent after deletion
4. **Audit trail**: All deletions logged in `account_deletions` table[^2]
5. **Cascade deletion**: All associated data deleted atomically

### Data Privacy \& GDPR Compliance[^17][^2]

1. **Minimal data**: Only store email, password, links
2. **Automated retention**: 90 days for unverified only[^17]
3. **Verified users kept**: No deletion of verified accounts (user-friendly)
4. **Right to erasure**: User-requested deletion available[^2]
5. **Transparency**: Clear retention policy in Terms of Service[^2]

***

## Monitoring \& Observability

### Key Metrics

**Email Delivery Metrics**

- Sent emails by type (verification, reset, warning)
- Delivery rate (sent / attempted)
- Retry count distribution
- Rate limit hit frequency
- Bounce rate (via Resend webhooks - optional)

**Account Lifecycle Metrics** (Simplified)

- Accounts created (daily/weekly/monthly)
- Email verification rate (verified / created)
- Time to verification (median)
- Unverified accounts warned (daily)
- Unverified accounts deleted (daily)
- Total active verified users (growing)

**Performance Metrics**

- Email sending latency (p50, p95, p99)
- Retry delays and backoff times
- Token validation time
- KV rate limiter latency
- Cron job execution time

**Business Metrics**

- Email verification completion rate (target: >85%)
- Time to verify (median, target: <24 hours)
- Password reset completion rate (target: >70%)
- Database size (should stay small with cleanup)


### Monitoring Queries

**D1 Email Log Queries**

```sql
-- Email send stats (last 7 days)
SELECT 
  email_type,
  status,
  COUNT(*) as count,
  AVG(retry_count) as avg_retries
FROM email_logs
WHERE sent_at > unixepoch() - (7 * 24 * 60 * 60)
GROUP BY email_type, status
ORDER BY count DESC;

-- Rate limit hits (last 24 hours)
SELECT 
  COUNT(*) as rate_limited_count
FROM email_logs
WHERE status = 'rate_limited'
AND sent_at > unixepoch() - (24 * 60 * 60);

-- Failed emails needing attention
SELECT 
  email_type,
  recipient_email,
  error_message,
  datetime(sent_at, 'unixepoch') as sent_time
FROM email_logs 
WHERE status = 'failed'
AND sent_at > unixepoch() - (24 * 60 * 60)
ORDER BY sent_at DESC
LIMIT 50;
```

**D1 Account Lifecycle Queries**

```sql
-- Account overview
SELECT 
  COUNT(*) as total_accounts,
  SUM(CASE WHEN email_verified = 1 THEN 1 ELSE 0 END) as verified,
  SUM(CASE WHEN email_verified = 0 THEN 1 ELSE 0 END) as unverified
FROM users;

-- Unverified account age distribution
SELECT 
  CASE 
    WHEN (unixepoch() - created_at) / (24 * 60 * 60) < 30 THEN '0-30 days'
    WHEN (unixepoch() - created_at) / (24 * 60 * 60) < 60 THEN '30-60 days'
    WHEN (unixepoch() - created_at) / (24 * 60 * 60) < 80 THEN '60-80 days'
    WHEN (unixepoch() - created_at) / (24 * 60 * 60) < 90 THEN '80-90 days (warned)'
    ELSE '90+ days (should be deleted)'
  END as age_bucket,
  COUNT(*) as count
FROM users
WHERE email_verified = 0
GROUP BY age_bucket;

-- Deletion statistics (last 30 days)
SELECT 
  reason,
  COUNT(*) as count,
  AVG(link_count) as avg_links
FROM account_deletions
WHERE deleted_at > unixepoch() - (30 * 24 * 60 * 60)
GROUP BY reason;

-- Database health check
SELECT 
  'Total users' as metric,
  COUNT(*) as value
FROM users
UNION ALL
SELECT 
  'Unverified > 90 days (should be 0)',
  COUNT(*)
FROM users
WHERE email_verified = 0 AND created_at < unixepoch() - (90 * 24 * 60 * 60)
UNION ALL
SELECT 
  'Expired tokens not cleaned (should be 0)',
  (SELECT COUNT(*) FROM email_verification_tokens WHERE expires_at < unixepoch() - (7 * 24 * 60 * 60))
  +
  (SELECT COUNT(*) FROM password_reset_tokens WHERE expires_at < unixepoch() - (7 * 24 * 60 * 60));
```


### Alerting

**Set up alerts for:**

**Email System Health**

- Email delivery rate < 95% (24-hour window)
- Bounce rate > 5% (24-hour window)
- Rate limit hits > 10/hour
- Failed email sends > 50/hour
- Average retry count > 1.5

**Account Lifecycle Health** (Simplified)

- Deletion failures > 5/day
- Warning email failures > 10/day
- Unverified accounts > 90 days old (cron job failure)
- Cron job execution failures

**Database Health**

- D1 database size > 500 MB
- Query execution time > 1 second
- Expired tokens not cleaned up (7+ days old)

**Tools:**

- **Cloudflare Workers Analytics**[^1]
- **Resend Dashboard** (logs)[^5]
- **Custom D1 queries** on email_logs table
- **Slack/Discord webhooks** for critical alerts (optional)

***

## Error Handling \& Fallbacks

### Exponential Backoff Strategy[^12][^20]

The retry logic handles three scenarios:

1. **429 Rate Limit**[^20][^12]
    - Parse `retry-after` header from Resend response
    - Wait specified time before retry
    - Fallback to exponential delay: 2s, 4s, 8s
    - Max 3 retries
2. **5xx Server Errors**
    - Exponential backoff: 2s, 4s, 8s
    - Max 3 retries
    - Log each attempt
3. **4xx Client Errors** (except 429)
    - Don't retry (invalid request)
    - Log error immediately
    - Return error to user

### User-Facing Errors

| Scenario | User Message | Action |
| :-- | :-- | :-- |
| Email service down | "We're having trouble sending emails. Please try again in a few minutes." | Show "Resend" button after 60s |
| Invalid email format | "Please enter a valid email address" | Inline validation |
| Token expired | "This link has expired. Please request a new one." | Link to resend flow |
| Token already used | "This link has already been used" | Link to login |
| Rate limit hit | "Too many requests. Please try again in an hour." | Show countdown timer |

### Graceful Degradation

```typescript
// Example: Allow signup even if verification email fails
try {
  await emailService.sendVerificationEmail(email, token);
} catch (error) {
  // Log but don't block signup
  console.error('Failed to send verification email:', error);
  // User can request resend from dashboard
}

// Example: Log deletion failure but continue cron job
for (const account of accountsToDelete) {
  try {
    await deletionService.deleteAccount(account.id, 'unverified_90d');
  } catch (error) {
    console.error(`Failed to delete account ${account.id}:`, error);
    // Continue to next account, try again tomorrow
  }
}
```


### Cron Job Failure Handling[^7]

**Idempotency**: Cron job is idempotent - running multiple times has no side effects

- Queries use exact date ranges (won't re-warn or re-delete)
- Warning check uses `unverified_warning_sent_at` flag
- Token cleanup uses `expires_at < 7_days_ago` (safe to run multiple times)

**Manual Recovery**:

```bash
# If cron job fails, run manually via wrangler
wrangler d1 execute edgelink-production --command "
  DELETE FROM users 
  WHERE email_verified = 0 
  AND created_at < unixepoch() - (90 * 24 * 60 * 60);
"

# Check cron trigger logs
wrangler tail --format=pretty
```


***
## Testing Strategy

### Unit Tests

```typescript
// services/email/emailService.test.ts
describe('EmailService - Retry Logic', () => {
  it('should retry on 429 rate limit with exponential backoff', async () => {
    const mockResend = {
      emails: {
        send: jest.fn()
          .mockRejectedValueOnce({ statusCode: 429, headers: { 'retry-after': '2' } })
          .mockRejectedValueOnce({ statusCode: 429 })
          .mockResolvedValueOnce({ id: 'msg_123' })
      }
    };
    
    const emailService = new EmailService(mockEnv, mockResend);
    await emailService.sendVerificationEmail('test@example.com', 'token123');
    
    expect(mockResend.emails.send).toHaveBeenCalledTimes(3);
  });
  
  it('should not retry on 4xx client errors', async () => {
    const mockResend = {
      emails: {
        send: jest.fn().mockRejectedValue({ statusCode: 400, message: 'Invalid email' })
      }
    };
    
    const emailService = new EmailService(mockEnv, mockResend);
    
    await expect(
      emailService.sendVerificationEmail('invalid', 'token123')
    ).rejects.toThrow();
    
    expect(mockResend.emails.send).toHaveBeenCalledTimes(1); // No retries
  });
  
  it('should send unverified warning with correct data', async () => {
    const mockResend = {
      emails: {
        send: jest.fn().mockResolvedValue({ id: 'msg_456' })
      }
    };
    
    const emailService = new EmailService(mockEnv, mockResend);
    await emailService.sendUnverifiedWarning('test@example.com', 10);
    
    expect(mockResend.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('10 days')
      })
    );
  });
});

// services/email/rateLimiter.test.ts
describe('EmailRateLimiter', () => {
  it('should allow emails within rate limit', async () => {
    const rateLimiter = new EmailRateLimiter(mockKV);
    
    const allowed1 = await rateLimiter.checkRateLimit('test@example.com', 'verification');
    expect(allowed1).toBe(true);
    
    const allowed2 = await rateLimiter.checkRateLimit('test@example.com', 'verification');
    expect(allowed2).toBe(true);
  });
  
  it('should block emails exceeding rate limit', async () => {
    const rateLimiter = new EmailRateLimiter(mockKV);
    
    // Send 5 emails (limit)
    for (let i = 0; i < 5; i++) {
      await rateLimiter.checkRateLimit('test@example.com', 'verification');
    }
    
    // 6th email should be blocked
    const allowed = await rateLimiter.checkRateLimit('test@example.com', 'verification');
    expect(allowed).toBe(false);
  });
});

// services/cleanup/deletionService.test.ts
describe('DeletionService', () => {
  it('should delete account and all associated data', async () => {
    const service = new DeletionService(mockEnv);
    
    // Create test user with links
    const userId = await createTestUser(mockEnv, 'delete@example.com');
    await createTestLink(mockEnv, userId, 'test-slug');
    
    await service.deleteAccount(userId, 'unverified_90d');
    
    // Verify deletion
    const user = await mockEnv.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
    const links = await mockEnv.DB.prepare('SELECT * FROM links WHERE user_id = ?').bind(userId).all();
    const log = await mockEnv.DB.prepare('SELECT * FROM account_deletions WHERE user_id = ?').bind(userId).first();
    
    expect(user).toBeNull();
    expect(links.results.length).toBe(0);
    expect(log).toBeDefined();
    expect(log.reason).toBe('unverified_90d');
  });
  
  it('should log deletion with correct metadata', async () => {
    const service = new DeletionService(mockEnv);
    const userId = await createTestUser(mockEnv, 'meta@example.com');
    
    await service.deleteAccount(userId, 'user_requested');
    
    const log = await mockEnv.DB.prepare('SELECT * FROM account_deletions WHERE user_id = ?').bind(userId).first();
    
    expect(log.email).toBe('meta@example.com');
    expect(log.reason).toBe('user_requested');
  });
});

// cron/dailyCleanup.test.ts
describe('Daily Cleanup Cron', () => {
  it('should send warnings to 80-day-old unverified accounts', async () => {
    // Create test account 80 days old
    const now = Math.floor(Date.now() / 1000);
    const day80Ago = now - (80 * 24 * 60 * 60);
    
    await mockEnv.DB.prepare(`
      INSERT INTO users (email, email_verified, created_at, unverified_warning_sent_at)
      VALUES ('test@example.com', 0, ?, NULL)
    `).bind(day80Ago).run();
    
    const emailService = jest.spyOn(EmailService.prototype, 'sendUnverifiedWarning');
    
    await dailyCleanup(mockEnv);
    
    expect(emailService).toHaveBeenCalledWith('test@example.com', 10);
    
    // Verify warning was marked as sent
    const user = await mockEnv.DB.prepare('SELECT unverified_warning_sent_at FROM users WHERE email = ?').bind('test@example.com').first();
    expect(user.unverified_warning_sent_at).not.toBeNull();
  });
  
  it('should delete 90-day-old unverified accounts', async () => {
    const now = Math.floor(Date.now() / 1000);
    const day91Ago = now - (91 * 24 * 60 * 60);
    
    const userId = await mockEnv.DB.prepare(`
      INSERT INTO users (email, email_verified, created_at)
      VALUES ('delete@example.com', 0, ?)
      RETURNING id
    `).bind(day91Ago).first();
    
    await dailyCleanup(mockEnv);
    
    const user = await mockEnv.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
    expect(user).toBeNull();
    
    const log = await mockEnv.DB.prepare('SELECT * FROM account_deletions WHERE user_id = ?').bind(userId).first();
    expect(log.reason).toBe('unverified_90d');
  });
  
  it('should NOT delete verified accounts regardless of age', async () => {
    const now = Math.floor(Date.now() / 1000);
    const day365Ago = now - (365 * 24 * 60 * 60);
    
    const userId = await mockEnv.DB.prepare(`
      INSERT INTO users (email, email_verified, created_at)
      VALUES ('verified@example.com', 1, ?)
      RETURNING id
    `).bind(day365Ago).first();
    
    await dailyCleanup(mockEnv);
    
    const user = await mockEnv.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
    expect(user).not.toBeNull(); // Still exists
  });
  
  it('should clean up expired tokens', async () => {
    const now = Math.floor(Date.now() / 1000);
    const day8Ago = now - (8 * 24 * 60 * 60);
    
    // Create expired token
    await mockEnv.DB.prepare(`
      INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
      VALUES (1, 'hash123', ?)
    `).bind(day8Ago).run();
    
    await dailyCleanup(mockEnv);
    
    const token = await mockEnv.DB.prepare('SELECT * FROM email_verification_tokens WHERE token_hash = ?').bind('hash123').first();
    expect(token).toBeNull();
  });
});
```


### Integration Tests

```bash
# Test email sending (development only)
curl -X POST http://localhost:8787/api/test/send-email \
  -H "Content-Type: application/json" \
  -d '{"email": "your-test@email.com", "type": "verification"}'

# Test verification flow
curl -X POST http://localhost:8787/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "SecurePass123!"}'

# Check email_logs for retry count
wrangler d1 execute edgelink-production \
  --command "SELECT * FROM email_logs WHERE retry_count > 0 ORDER BY sent_at DESC LIMIT 10"

# Test rate limiting
for i in {1..6}; do
  curl -X POST http://localhost:8787/auth/resend-verification \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com"}'
done

# Test cleanup cron job manually
curl -X POST http://localhost:8787/__scheduled \
  -H "Content-Type: application/json" \
  -d '{"cron": "0 2 * * *"}'

# Verify cleanup worked (should be 0)
wrangler d1 execute edgelink-production \
  --command "SELECT COUNT(*) as old_unverified FROM users WHERE email_verified = 0 AND created_at < unixepoch() - (90 * 24 * 60 * 60);"
```


### Manual Testing Checklist

**Authentication Flow**

- [ ] Signup sends verification email immediately
- [ ] Verification link activates account
- [ ] Expired verification link shows error
- [ ] Resend verification works (rate limited after 5)
- [ ] Forgot password sends reset email
- [ ] Reset link updates password
- [ ] Expired reset link shows error
- [ ] Password change sends confirmation
- [ ] Login updates `last_login_at` timestamp

**Rate Limiting**

- [ ] Rate limiter blocks after threshold (5 verification, 3 reset)
- [ ] Rate limit resets after 1 hour
- [ ] Retry logic handles 429 errors gracefully
- [ ] Email logs show correct retry counts

**Account Lifecycle** (Simplified)

- [ ] Unverified account receives warning at day 80
- [ ] Unverified account deleted at day 90
- [ ] Verified accounts NEVER deleted (even after years)
- [ ] User-requested deletion works with password confirmation
- [ ] Deletion logs created in `account_deletions` table
- [ ] Warning email has 10-day countdown

**Email Templates**

- [ ] All email templates render correctly on mobile
- [ ] Links work in Gmail, Outlook, Apple Mail
- [ ] Unverified warning shows correct days until deletion
- [ ] Account deleted email sent successfully

**Cron Job**

- [ ] Cron runs daily at 2 AM UTC
- [ ] Cron logs show successful execution
- [ ] Failed warnings logged but don't stop cron
- [ ] Failed deletions logged but don't stop cron
- [ ] Token cleanup removes old tokens

***

## Migration Path to Cloudflare Queues (When Needed)

### When to Migrate[^1][^2]

✅ **Stick with Retry Logic if:**

- You have < 3,000 emails/month (within Resend free tier)[^3]
- You're a solo developer or small team
- Tiny SaaS (< 1,000 users)
- Simple email flows

⚠️ **Migrate to Queues when:**

- Sending > 3,000 emails/month consistently
- Getting 429 rate limit errors frequently
- Need guaranteed delivery (can't afford to lose emails)
- Scaling to 10,000+ users
- Adding complex workflows (multi-step email sequences)


### Migration Steps (Only 3 Changes!)[^2][^1]

**Step 1: Add Queue Configuration to wrangler.toml**

```toml
# Add to existing wrangler.toml
[[queues.producers]]
queue = "email-queue"
binding = "EMAIL_QUEUE"

[[queues.consumers]]
queue = "email-queue"
max_batch_size = 10
max_batch_timeout = 5
max_retries = 3
```

**Step 2: Update EmailService to Enqueue**

```typescript
// services/email/emailService.ts
// BEFORE (Retry Logic)
async sendVerificationEmail(email: string, token: string): Promise<void> {
  return this.sendWithRetry(async () => {
    const result = await this.resend.emails.send({...});
    await this.logEmail({...});
    return result;
  }, email, 'verification');
}

// AFTER (Queue)
async sendVerificationEmail(email: string, token: string): Promise<void> {
  // Just enqueue - that's it!
  await this.env.EMAIL_QUEUE.send({
    type: 'verification',
    email,
    token,
    timestamp: Date.now()
  });
}
```

**Step 3: Add Queue Consumer**

```typescript
// src/index.ts
export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  },
  
  async scheduled(event, env, ctx) {
    await dailyCleanup(env);
  },
  
  // NEW: Queue consumer (automatic retries built-in) [web:144]
  async queue(batch: MessageBatch, env: Env) {
    const emailService = new EmailService(env);
    
    for (const msg of batch.messages) {
      try {
        const data = msg.body;
        
        if (data.type === 'verification') {
          await emailService.sendVerificationEmailDirect(data.email, data.token);
        } else if (data.type === 'password_reset') {
          await emailService.sendPasswordResetEmailDirect(data.email, data.token);
        }
        // Add other email types...
        
        msg.ack(); // Mark as processed [web:144]
      } catch (error) {
        msg.retry(); // Automatic exponential backoff [web:144]
      }
    }
  }
};
```

**That's it!**[^1][^2]

### Migration Benefits

| Feature | Retry Logic (Current) | Cloudflare Queues |
| :-- | :-- | :-- |
| **Automatic retry** | Manual code | Built-in [^1] |
| **Exponential backoff** | Manual code | Built-in [^1] |
| **Dead letter queue** | Manual logging | Built-in [^1] |
| **Guaranteed delivery** | Best effort (3 retries) | Yes [^1] |
| **Code complexity** | ~100 lines | ~30 lines |
| **Cost** | \$0 | \$0 (free tier 1M ops) [^4] |
| **Migration time** | N/A | 1-2 hours |


***

## Rollout Plan

### Phase 1: Core Email System (Week 1)

- [ ] Database migrations (email tables)
- [ ] Token service implementation
- [ ] Email service with retry logic[^5][^6]
- [ ] KV rate limiter[^7]
- [ ] Email templates (verification, reset, changed)
- [ ] Unit tests (>80% coverage)
- [ ] Deploy to staging


### Phase 2: Authentication Flows (Week 2)

- [ ] Email verification on signup
- [ ] Password reset flow
- [ ] Password change confirmation
- [ ] Resend verification endpoint
- [ ] Frontend pages (verify, reset, forgot-password)
- [ ] Integration tests
- [ ] QA testing


### Phase 3: Cleanup System (Week 3)

- [ ] Deletion service implementation
- [ ] Single daily cron job[^8]
- [ ] Unverified warning template
- [ ] Account deleted template
- [ ] User-requested deletion flow[^9]
- [ ] Unit tests for cleanup logic
- [ ] Manual cron trigger testing


### Phase 4: Production Hardening (Week 4)

- [ ] DNS configuration (SPF, DKIM, DMARC)[^3]
- [ ] Resend domain verification[^3]
- [ ] Monitoring setup (email logs, cron logs)
- [ ] Alerting (email failures, cron failures)
- [ ] Load testing (100 signups/minute)
- [ ] Security audit
- [ ] Privacy policy update (90-day retention)[^10]


### Phase 5: Launch (Week 5)

- [ ] Production secrets configured
- [ ] Deploy backend with cron trigger[^8]
- [ ] Deploy frontend
- [ ] Monitor for 48 hours
    - [ ] Email delivery rates
    - [ ] Retry counts
    - [ ] Cron job execution
    - [ ] Warning email sends
- [ ] Create test accounts with backdated timestamps (verify cleanup)
- [ ] Document lessons learned

***

## Cost Analysis

### Free Tier Limits[^11][^7][^8][^3]

| Service | Free Tier | Estimated Usage (Tiny SaaS, 200 users/month) | Headroom |
| :-- | :-- | :-- | :-- |
| Resend | 3,000 emails/month [^3] | ~600 emails | 2,400 (80%) |
| Cloudflare Workers | 100,000 req/day [^11] | ~3,000/day | 97% remaining |
| Cloudflare D1 | 5M reads/day [^7] | ~10,000/day | 99.8% remaining |
| Cloudflare KV | 100K reads/day [^7] | ~500/day | 99.5% remaining |
| Cloudflare Cron Trigger | 1 per Worker (free) [^8] | 1 cron | 0% remaining (at limit) |
| DodoPayments | Unlimited receipts [^12] | ~30 payments | N/A (free) |

### Estimated Email Usage (200 Users/Month - Tiny SaaS)

**Email Breakdown**:

- 200 signups → 200 verification emails
- 30 password resets → 30 reset + 30 confirmation = 60 emails
- 20 unverified warnings → 20 emails (day 80)
- 10 account deletions → 10 deletion confirmations
- **Total: 290 emails/month** (9.7% of free tier)[^3]

**Cron Job Usage**:[^8]

- 1 cron trigger × 30 days = 30 executions/month
- Each execution: ~200ms average
- Total compute time: ~6 seconds/month
- **Cost: \$0** (within free tier)[^8]


### Cost Comparison: Tiny SaaS vs Business

| Feature | Tiny SaaS (This PRD) | Business-Level |
| :-- | :-- | :-- |
| **Unverified retention** | 90 days | 30 days |
| **Verified retention** | Never delete ✅ | 180 days inactive |
| **Warnings** | 1 warning (day 80) | 2 warnings (multi-stage) |
| **Cron jobs** | 1 job | 3 jobs |
| **Email templates** | 5 templates | 10+ templates |
| **Complexity** | Low ✅ | High |
| **Monthly cost** | \$0 ✅ | \$0 |
| **Maintenance** | <1 hour/month ✅ | ~5 hours/month |

### Scaling Thresholds

| Milestone | Monthly Emails | Resend Cost | Migration Needed |
| :-- | :-- | :-- | :-- |
| 0-500 users | <1,500 emails | \$0 [^3] | None |
| 500-1,000 users | 1,500-3,000 emails | \$0 [^3] | None |
| 1,000-3,000 users | 3,000-9,000 emails | \$7/month [^3] | Consider Queues |
| 3,000-10,000 users | 9,000-30,000 emails | \$20/month [^3] | Use Queues [^1] |

**Break-Even**: Can support up to **~900 users on free tier** before needing paid Resend plan

***

## Risks \& Mitigations

### Risk 1: Email Deliverability Issues

**Risk**: Emails land in spam, reducing verification rates

**Impact**: Users can't activate accounts, password resets fail

**Mitigations**:

1. Configure SPF, DKIM, DMARC records[^3]
2. Use reputable domain with clean history
3. Start with low volume (warm up sender reputation)
4. Monitor bounce rates via Resend dashboard[^3]
5. Use plain text + HTML versions[^13]
6. Avoid spam trigger words in subjects

**Success Criteria**: <2% bounce rate, >99% delivery rate

***

### Risk 2: Users Don't See Warning Emails

**Risk**: Warning email goes to spam, account deleted without notice

**Impact**: User complaints, bad reviews

**Mitigations**:

1. **Generous 90-day retention** (more forgiving than 30 days)
2. **10-day warning window** gives users time to see email
3. **Clear subject line** ("⚠️ Verify your account - 10 days remaining")
4. **Only unverified accounts** deleted (verified users safe forever)
5. Welcome email mentions 90-day policy

**Success Criteria**: <3 complaints per month about unexpected deletions

***

### Risk 3: Cron Job Fails Silently

**Risk**: Cron trigger fails, accounts not deleted, warnings not sent

**Impact**: Database bloat, unverified accounts accumulate

**Mitigations**:[^8]

1. **Logging**: Cron logs start, end, success/failure
2. **Alerting**: Slack alert if cron doesn't run for 48 hours
3. **Idempotency**: Safe to run multiple times manually
4. **Monitoring**: Daily query checks for 90+ day unverified accounts
5. **Manual fallback**: Document SQL commands for emergency cleanup

**Success Criteria**: 99%+ cron success rate, <24 hours to detect failure

***

### Risk 4: Retry Logic Causes Email Delays

**Risk**: Multiple retries delay email delivery by 14+ seconds[^6][^5]

**Impact**: User waits at signup screen

**Mitigations**:

1. Return success immediately (don't wait for email)[^5]
2. Show "Check your email" message after signup
3. Provide "Resend" button after 60 seconds
4. Log retry delays for monitoring
5. Request rate limit increase from Resend[^5]

**Success Criteria**: <1% of emails require 3 retries

***

### Risk 5: Increased Costs as User Base Grows

**Risk**: Growing beyond 3,000 emails/month requires paid Resend[^3]

**Impact**: \$7-20/month email costs

**Mitigations**:

1. Monitor email usage weekly[^3]
2. Budget \$20/month for email at scale
3. Migrate to Queues if needed[^1]
4. Consider per-email pricing vs fixed tier[^3]

**Success Criteria**: Email costs <5% of revenue

***

## Success Criteria

### Launch Criteria (Must-Have)

- ✅ Email verification flow complete and tested
- ✅ Password reset flow complete and tested
- ✅ Retry logic handles 429 errors with exponential backoff[^6][^5]
- ✅ KV rate limiting prevents abuse[^7]
- ✅ **Single daily cron job for cleanup**[^8]
- ✅ **Unverified account cleanup (90 days)** working
- ✅ **Verified users never auto-deleted** (confirmed)
- ✅ All email templates mobile-responsive[^14][^13]
- ✅ SPF/DKIM configured and verified[^3]
- ✅ Email logging for debugging
- ✅ Zero security vulnerabilities
- ✅ <500ms email sending latency (p95)


### Post-Launch (Week 1)

- ✅ >85% email verification completion rate
- ✅ >99% email delivery rate
- ✅ <2% bounce rate
- ✅ <5 support tickets related to emails
- ✅ <1% of emails require 3 retries[^5]
- ✅ **Cron job executing successfully (100% success)**[^8]
- ✅ **First batch of 90+ day accounts deleted**
- ✅ **Warning emails sent without errors**
- ✅ Zero security incidents


### Optimization (Month 1-3)

- ✅ <5 minute median time to verify email
- ✅ >70% password reset completion rate
- ✅ **Database size stable (not growing from old accounts)**
- ✅ **<3 complaints about deletions**
- ✅ **All verified users retained (0 accidental deletions)**
- ✅ Request Resend rate limit increase if needed[^5]

***

## Open Questions \& Future Enhancements

### Open Questions

1. Should we extend unverified retention to 120 days (even more forgiving)?
2. Should we send a second warning at day 87 (3 days before deletion)?
3. Do we need email preferences for users?
4. Should we implement magic link login (passwordless)?
5. When should we upgrade to Cloudflare Queues?

### Future Enhancements (Post-MVP)

**Email System**

1. **Request Higher Rate Limits**: Email Resend for 5-10 req/sec[^5]
2. **Magic Link Authentication**: Passwordless login[^15][^16]
3. **Email Preferences**: User control over notifications
4. **Localization**: Multi-language templates
5. **A/B Testing**: Optimize email copy
6. **SMS Backup**: Twilio for critical notifications

**Account Management**
7. **Data Export**: Download links before deletion[^10]
8. **Account Hibernation**: Freeze instead of delete
9. **Re-engagement Campaigns**: Win back deleted users

**Infrastructure**
10. **Cloudflare Queues**: Migrate when scaling[^2][^1]
11. **Monitoring Dashboard**: Grafana for metrics
12. **Automated Testing**: Scheduled integration tests

***

## Appendix

### A. Complete API Endpoints Reference

**Authentication \& Email**

```
POST   /auth/signup                      # Create account + send verification
POST   /auth/login                       # Check email_verified, update last_login_at
GET    /auth/verify-email?token=xyz      # Validate and activate account
POST   /auth/resend-verification         # Resend verification email (rate limited)
POST   /auth/request-password-reset      # Send password reset email (rate limited)
POST   /auth/reset-password              # Complete password reset
POST   /auth/logout                      # Existing
```

**Account Management**

```
DELETE /api/account/delete               # User-requested account deletion
GET    /api/account/status               # Get account info
```

**Admin/Internal**

```
POST   /__scheduled                      # Cron trigger endpoint (internal)
```


### B. Database Queries Reference

```sql
-- Check verification status
SELECT email_verified, email_verified_at, last_login_at
FROM users 
WHERE id = ?;

-- Retry statistics (last 24 hours)
SELECT 
  email_type,
  AVG(retry_count) as avg_retries,
  MAX(retry_count) as max_retries,
  COUNT(*) as total_emails
FROM email_logs
WHERE sent_at > unixepoch() - (24 * 60 * 60)
GROUP BY email_type;

-- Unverified accounts by age
SELECT 
  CASE 
    WHEN (unixepoch() - created_at) / (24 * 60 * 60) < 30 THEN '0-30 days'
    WHEN (unixepoch() - created_at) / (24 * 60 * 60) < 60 THEN '30-60 days'
    WHEN (unixepoch() - created_at) / (24 * 60 * 60) < 80 THEN '60-80 days'
    WHEN (unixepoch() - created_at) / (24 * 60 * 60) < 90 THEN '80-90 days (warned)'
    ELSE '90+ days (PROBLEM - should be deleted)'
  END as age_bucket,
  COUNT(*) as count
FROM users
WHERE email_verified = 0
GROUP BY age_bucket;

-- Deletion statistics
SELECT 
  reason,
  COUNT(*) as count,
  AVG(link_count) as avg_links
FROM account_deletions
WHERE deleted_at > unixepoch() - (30 * 24 * 60 * 60)
GROUP BY reason;

-- Health check (should all be 0)
SELECT 
  'Unverified > 90 days' as issue,
  COUNT(*) as count
FROM users
WHERE email_verified = 0 AND created_at < unixepoch() - (90 * 24 * 60 * 60)
UNION ALL
SELECT 
  'Expired tokens not cleaned',
  (SELECT COUNT(*) FROM email_verification_tokens WHERE expires_at < unixepoch() - (7 * 24 * 60 * 60))
  +
  (SELECT COUNT(*) FROM password_reset_tokens WHERE expires_at < unixepoch() - (7 * 24 * 60 * 60));
```


### C. Email Templates Summary

**You need exactly 5 email templates:**

1. ✅ **verification.ts** - Email verification (on signup)
2. ✅ **passwordReset.ts** - Password reset link (15min expiry)
3. ✅ **passwordChanged.ts** - Password changed confirmation
4. ✅ **unverifiedWarning.ts** - Single warning at 80 days (10 days notice)
5. ✅ **accountDeleted.ts** - Deletion confirmation

### D. Cron Schedule[^8]

```toml
# Single daily cron (runs at 2 AM UTC = 7:30 AM IST)
[triggers]
crons = ["0 2 * * *"]
```

**Tasks performed:**

1. Send warnings to 80-day-old unverified accounts
2. Delete 90-day-old unverified accounts
3. Clean up expired tokens (7+ days old)

**Execution time:** ~5-30 seconds (depends on account count)

### E. Privacy Policy Snippet[^10]

```markdown
## Data Retention Policy

### Unverified Accounts
If you create an account but do not verify your email address, your account will be automatically deleted after **90 days**. We will send you a reminder email 10 days before deletion.

### Verified Accounts
Once you verify your email, your account is kept **indefinitely**. We never automatically delete verified accounts, even if you don't use the service for years.

### User-Requested Deletion
You can delete your account at any time from your account settings. This action is permanent and cannot be undone.

### What We Delete
When an account is deleted, we permanently remove:
- Your login credentials
- All shortened links
- All analytics data

### Legal Basis
This policy complies with GDPR data minimization principles (Article 5).

For questions, contact privacy@shortedbro.xyz
```


### F. Migration Checklist (Retry Logic → Queues)

**When ready to migrate**:[^2][^1]

- [ ] Add queue configuration to wrangler.toml
- [ ] Update EmailService.sendVerificationEmail() to enqueue
- [ ] Update EmailService.sendPasswordResetEmail() to enqueue
- [ ] Add queue consumer in src/index.ts
- [ ] Deploy to staging and test
- [ ] Monitor queue metrics for 24 hours
- [ ] Deploy to production
- [ ] Remove old retry logic code

**Estimated time:** 1-2 hours
**Risk:** Low (can rollback easily)

***

## Conclusion

This simplified email architecture provides EdgeLink with:

✅ **Complete auth flows** (verification + password reset)
✅ **Production security** (token hashing, expiration, single-use)[^17][^18]
✅ **Zero cost** (\$0/month with retry logic)[^6][^5][^3]
✅ **Simple maintenance** (<1 hour/month for tiny SaaS)
✅ **User-friendly** (verified users never deleted)
✅ **GDPR compliant** (90-day cleanup of abandoned signups)[^10]
✅ **Easy migration** (3 changes to upgrade to Queues)[^1][^2]

### Key Design Decisions (Tiny SaaS Optimized)

1. **90-day retention** for unverified (vs 30 days business-level) - More forgiving
2. **Single warning** at day 80 (vs multiple warnings) - Simpler
3. **Verified users kept forever** (vs 180-day inactive deletion) - User-friendly
4. **One cron job** (vs three) - Easier maintenance[^8]
5. **5 email templates** (vs 10+) - Less complexity
6. **Retry logic** (vs Queues) - Zero cost, easy migration later[^1][^5]

### Total Monthly Cost: \$0

| Component | Cost |
| :-- | :-- |
| Resend (3,000 emails) | \$0 [^3] |
| Cloudflare Workers | \$0 [^11] |
| Cloudflare D1 | \$0 [^7] |
| Cloudflare KV | \$0 [^7] |
| Cloudflare Cron Trigger | \$0 [^8] |
| DodoPayments | \$0 [^12] |
| **Total** | **\$0** |

### Next Steps

1. ✅ **Review and approve PRD** ← You are here
2. Set up Resend account and verify domain[^3]
3. Run database migrations
4. Implement Phase 1 (email service + retry logic)
5. Implement Phase 2 (auth flows)
6. Implement Phase 3 (cleanup cron)
7. Test thoroughly
8. **Launch in 4-5 weeks**

***

**Document Status:** ✅ Complete - Tiny SaaS Optimized
**Last Updated:** November 15, 2025, 3:32 AM IST
**Version:** 3.0 (Simplified for Solo Developers)
**Total Length:** Complete PRD with all sections

***

**Perfect for:** Solo developers, tiny SaaS, <1,000 users, minimal maintenance

**Not suitable for:** Enterprise, high-volume (>10K users), complex workflows

**Migration path:** Easy upgrade to Queues when scaling[^2][^1]
