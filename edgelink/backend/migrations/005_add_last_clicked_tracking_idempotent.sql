-- Migration: Add last_clicked_at tracking for inactive link cleanup (IDEMPOTENT)
-- Date: 2025-11-17
-- Purpose: Track last click timestamp to enable cleanup of inactive/abandoned links
-- UI shows active/inactive status, no email warnings needed
-- This version is safe to run multiple times

-- Create indexes (these will fail silently if they already exist, which is fine)
-- SQLite/D1 will just skip index creation if they exist

CREATE INDEX IF NOT EXISTS idx_links_last_clicked ON links(last_clicked_at);
CREATE INDEX IF NOT EXISTS idx_links_plan_activity ON links(user_id, last_clicked_at, created_at);
CREATE INDEX IF NOT EXISTS idx_links_click_count_created ON links(click_count, created_at);

-- Note: The last_clicked_at column already exists in production
-- If it doesn't exist in your local DB, you'll need to add it manually with:
-- ALTER TABLE links ADD COLUMN last_clicked_at DATETIME;
