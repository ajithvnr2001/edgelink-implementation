-- Migration 004: Add Password Reset Rate Limit
-- Adds last_password_reset_at field to users table for 5-day rate limiting
-- Date: 2025-11-16

-- Add last_password_reset_at to users table
ALTER TABLE users ADD COLUMN last_password_reset_at INTEGER;

-- Create index for password reset queries
CREATE INDEX IF NOT EXISTS idx_users_last_password_reset ON users(last_password_reset_at);
