-- Migration: Add last_clicked_at tracking for inactive link cleanup
-- Date: 2025-11-17
-- Purpose: Track last click timestamp to enable cleanup of inactive/abandoned links

-- Add last_clicked_at column to links table
ALTER TABLE links ADD COLUMN last_clicked_at DATETIME;

-- Add index for efficient cleanup queries
CREATE INDEX idx_links_last_clicked ON links(last_clicked_at);
CREATE INDEX idx_links_plan_activity ON links(user_id, last_clicked_at, created_at);

-- Add table for tracking inactive link cleanup warnings
CREATE TABLE IF NOT EXISTS inactive_link_warnings (
  warning_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  link_slugs TEXT NOT NULL, -- JSON array of slugs
  warning_sent_at INTEGER NOT NULL, -- Unix timestamp
  deletion_scheduled_at INTEGER NOT NULL, -- Unix timestamp (warning + 7 days)
  status TEXT DEFAULT 'pending', -- 'pending', 'deleted', 'kept_active'
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_inactive_warnings_user ON inactive_link_warnings(user_id);
CREATE INDEX idx_inactive_warnings_deletion ON inactive_link_warnings(deletion_scheduled_at, status);
