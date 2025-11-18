-- EdgeLink Migration: Add Groups Feature
-- Run this on your production D1 database
--
-- To apply this migration, run:
-- wrangler d1 execute edgelink-production --remote --file=migrations/001_add_groups_feature.sql

-- =============================================
-- 1. Create Link Groups table
-- =============================================
CREATE TABLE IF NOT EXISTS link_groups (
  group_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'folder',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  archived_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- =============================================
-- 2. Add group_id column to links table
-- =============================================
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE
-- This will error if column already exists, which is fine
ALTER TABLE links ADD COLUMN group_id TEXT REFERENCES link_groups(group_id) ON DELETE SET NULL;

-- =============================================
-- 3. Create indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_link_groups_user ON link_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_links_group ON links(group_id);

-- =============================================
-- 4. Create trigger for updated_at on link_groups
-- =============================================
CREATE TRIGGER IF NOT EXISTS update_link_groups_timestamp
AFTER UPDATE ON link_groups
BEGIN
  UPDATE link_groups SET updated_at = CURRENT_TIMESTAMP WHERE group_id = NEW.group_id;
END;

-- =============================================
-- Verification queries (run these to verify)
-- =============================================
-- SELECT name FROM sqlite_master WHERE type='table' AND name='link_groups';
-- SELECT sql FROM sqlite_master WHERE type='table' AND name='links';
-- SELECT * FROM link_groups LIMIT 5;
