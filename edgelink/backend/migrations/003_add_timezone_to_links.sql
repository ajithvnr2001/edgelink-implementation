-- Migration: Add timezone column to links table
-- This allows users to specify their timezone when setting expiration dates
-- Expiration dates are stored as UTC but display in user's chosen timezone

-- Add timezone column to links table
ALTER TABLE links ADD COLUMN timezone TEXT DEFAULT 'UTC';

-- Add comment explaining the purpose
-- The timezone field stores IANA timezone identifiers (e.g., 'Asia/Kolkata', 'America/New_York', 'Europe/London')
-- This is used to properly display expiration times in the user's local timezone
-- The expires_at field continues to store UTC timestamps for consistency
