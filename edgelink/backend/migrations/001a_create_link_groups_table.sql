-- EdgeLink Migration: Create link_groups table
-- Run this FIRST on your production D1 database
--
-- Command:
-- wrangler d1 execute edgelink-production --remote --file=migrations/001a_create_link_groups_table.sql

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

CREATE INDEX IF NOT EXISTS idx_link_groups_user ON link_groups(user_id);

CREATE TRIGGER IF NOT EXISTS update_link_groups_timestamp
AFTER UPDATE ON link_groups
BEGIN
  UPDATE link_groups SET updated_at = CURRENT_TIMESTAMP WHERE group_id = NEW.group_id;
END;
