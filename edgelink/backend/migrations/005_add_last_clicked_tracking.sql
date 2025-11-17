-- Migration: Add last_clicked_at tracking for inactive link cleanup
-- Date: 2025-11-17
-- Purpose: Track last click timestamp to enable cleanup of inactive/abandoned links
-- UI shows active/inactive status, no email warnings needed

-- Add last_clicked_at column to links table
ALTER TABLE links ADD COLUMN last_clicked_at DATETIME;

-- Add indexes for efficient cleanup queries and UI display
CREATE INDEX idx_links_last_clicked ON links(last_clicked_at);
CREATE INDEX idx_links_plan_activity ON links(user_id, last_clicked_at, created_at);
CREATE INDEX idx_links_click_count_created ON links(click_count, created_at);
