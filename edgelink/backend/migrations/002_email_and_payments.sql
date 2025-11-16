-- Migration 002: Email Verification & DodoPayments Integration
-- Adds email verification, password reset, payment subscriptions, and account cleanup
-- Date: 2025-11-15

-- ====================================
-- PART 1: EMAIL VERIFICATION & AUTH
-- ====================================

-- Extend users table with email verification and account lifecycle tracking
ALTER TABLE users ADD COLUMN email_verified_at INTEGER;
ALTER TABLE users ADD COLUMN last_login_at INTEGER;
ALTER TABLE users ADD COLUMN unverified_warning_sent_at INTEGER;

-- Update existing users table columns (these already exist but we ensure they're set correctly)
-- email_verified BOOLEAN DEFAULT FALSE already exists
-- verification_token TEXT already exists

-- Email verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_verification_token_hash ON email_verification_tokens(token_hash);
CREATE INDEX idx_verification_expires ON email_verification_tokens(expires_at);
CREATE INDEX idx_verification_user_id ON email_verification_tokens(user_id);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  used_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_reset_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_reset_expires ON password_reset_tokens(expires_at);
CREATE INDEX idx_reset_user_id ON password_reset_tokens(user_id);

-- Email activity log (for debugging & compliance)
CREATE TABLE IF NOT EXISTS email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL, -- 'sent', 'failed', 'bounced', 'rate_limited'
  provider_message_id TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  sent_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_email_logs_user ON email_logs(user_id);
CREATE INDEX idx_email_logs_type ON email_logs(email_type);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX idx_email_logs_status ON email_logs(status);

-- Account deletion log (for compliance and audit trail)
CREATE TABLE IF NOT EXISTS account_deletions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  reason TEXT NOT NULL, -- 'unverified_90d', 'user_requested'
  link_count INTEGER DEFAULT 0,
  deleted_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_deletions_deleted_at ON account_deletions(deleted_at);
CREATE INDEX idx_deletions_reason ON account_deletions(reason);

-- Performance indexes for cleanup queries
CREATE INDEX IF NOT EXISTS idx_users_email_verified_created ON users(email_verified, created_at);
CREATE INDEX IF NOT EXISTS idx_users_unverified_warning ON users(unverified_warning_sent_at);

-- ====================================
-- PART 2: DODOPAYMENTS INTEGRATION
-- ====================================

-- Extend users table with subscription fields
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'free';
-- Possible values: 'free', 'active', 'past_due', 'cancelled', 'paused'

ALTER TABLE users ADD COLUMN subscription_plan TEXT DEFAULT 'free';
-- Possible values: 'free', 'pro_monthly', 'pro_annual', 'lifetime'

ALTER TABLE users ADD COLUMN subscription_id TEXT;
-- DodoPayments subscription ID

ALTER TABLE users ADD COLUMN customer_id TEXT;
-- DodoPayments customer ID

ALTER TABLE users ADD COLUMN subscription_current_period_start INTEGER;
ALTER TABLE users ADD COLUMN subscription_current_period_end INTEGER;
ALTER TABLE users ADD COLUMN subscription_cancel_at_period_end INTEGER DEFAULT 0;

ALTER TABLE users ADD COLUMN lifetime_access INTEGER DEFAULT 0;
-- 1 if user has lifetime plan

-- Create indexes for subscription lookups
CREATE INDEX IF NOT EXISTS idx_users_subscription_id ON users(subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_customer_id ON users(customer_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_plan ON users(subscription_plan);

-- Payments table: Track all payment transactions
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  payment_id TEXT NOT NULL UNIQUE, -- DodoPayments payment ID
  customer_id TEXT NOT NULL, -- DodoPayments customer ID
  subscription_id TEXT, -- NULL for one-time payments
  amount INTEGER NOT NULL, -- Amount in cents (e.g., 999 = $9.99)
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL, -- 'pending', 'succeeded', 'failed', 'refunded'
  payment_method TEXT, -- 'card', 'paypal', etc.
  plan TEXT NOT NULL, -- 'pro_monthly', 'pro_annual', 'lifetime'
  invoice_url TEXT, -- Link to DodoPayments invoice
  receipt_url TEXT, -- Link to receipt
  metadata TEXT, -- JSON string with additional data
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_payment_id ON payments(payment_id);
CREATE INDEX idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);

-- Webhook events table: Log all webhook events from DodoPayments for debugging
CREATE TABLE IF NOT EXISTS webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE, -- DodoPayments event ID
  event_type TEXT NOT NULL, -- 'payment.succeeded', 'subscription.cancelled', etc.
  customer_id TEXT,
  subscription_id TEXT,
  payment_id TEXT,
  payload TEXT NOT NULL, -- Full JSON payload
  processed INTEGER DEFAULT 0, -- 1 if successfully processed
  error_message TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at);
CREATE INDEX idx_webhook_events_customer_id ON webhook_events(customer_id);
CREATE INDEX idx_webhook_events_subscription_id ON webhook_events(subscription_id);

-- ====================================
-- DATA MIGRATION
-- ====================================

-- Update existing users to have last_login_at set to created_at if it's null
UPDATE users SET last_login_at = (SELECT unixepoch(created_at)) WHERE last_login_at IS NULL;

-- Update the plan column to sync with subscription_plan
UPDATE users SET subscription_plan = plan WHERE subscription_plan = 'free';
UPDATE users SET subscription_status = CASE
  WHEN plan = 'pro' THEN 'active'
  ELSE 'free'
END WHERE subscription_status = 'free';
