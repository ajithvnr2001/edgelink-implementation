-- Migration 003: Make password_hash nullable for Clerk users
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- Step 1: Create new users table with password_hash as nullable
CREATE TABLE users_new (
  user_id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT, -- NOW NULLABLE for Clerk users
  name TEXT,
  plan TEXT DEFAULT 'free' CHECK(plan IN ('free', 'pro')),
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  deletion_requested_at TIMESTAMP,
  deletion_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  clerk_user_id TEXT, -- Clerk user ID (added in previous migration)
  clerk_metadata TEXT -- Clerk metadata (added in previous migration)
);

-- Step 2: Copy all data from old table to new table
INSERT INTO users_new (
  user_id, email, password_hash, name, plan, email_verified,
  verification_token, deletion_requested_at, deletion_reason,
  created_at, updated_at, last_login, clerk_user_id, clerk_metadata
)
SELECT
  user_id, email, password_hash, name, plan, email_verified,
  verification_token, deletion_requested_at, deletion_reason,
  created_at, updated_at, last_login, clerk_user_id, clerk_metadata
FROM users;

-- Step 3: Drop the old table
DROP TABLE users;

-- Step 4: Rename new table to users
ALTER TABLE users_new RENAME TO users;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_clerk_user_id ON users(clerk_user_id);

-- Step 6: Recreate trigger for updated_at
CREATE TRIGGER IF NOT EXISTS update_users_timestamp
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
END;
