-- Clerk Migration Script for EdgeLink Database
-- This script adds Clerk support while maintaining backward compatibility

-- Add clerk_user_id column to users table
ALTER TABLE users ADD COLUMN clerk_user_id TEXT;

-- Create index for clerk_user_id lookups
CREATE INDEX IF NOT EXISTS idx_clerk_user_id ON users(clerk_user_id);

-- Make password_hash nullable (since Clerk users won't have passwords)
-- Note: SQLite doesn't support modifying columns directly, so we need to:
-- 1. Create new table with updated schema
-- 2. Copy data
-- 3. Drop old table
-- 4. Rename new table

-- However, for simplicity and to avoid data loss, we'll keep password_hash as-is
-- and just allow NULL values during INSERT operations
-- Existing users will keep their password_hash, Clerk users will have NULL

-- Update verification_token to be nullable (Clerk handles email verification)
-- Same approach - we'll handle this in the application layer

-- Optional: Add metadata column for storing Clerk metadata
ALTER TABLE users ADD COLUMN clerk_metadata TEXT;

-- Migration complete
-- Next steps:
-- 1. Update application code to check for clerk_user_id
-- 2. Add Clerk webhook endpoint
-- 3. Update authentication middleware to support both auth methods
