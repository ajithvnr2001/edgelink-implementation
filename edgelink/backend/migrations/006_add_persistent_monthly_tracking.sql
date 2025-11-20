-- Migration: Add persistent monthly click tracking
-- Date: 2025-11-20
-- Description: Creates user_monthly_stats table to track monthly clicks that persist even after link deletion

-- User monthly statistics table
-- Tracks monthly metrics independently of links table
CREATE TABLE IF NOT EXISTS user_monthly_stats (
  stat_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL, -- 1-12
  total_clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE(user_id, year, month)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_monthly_stats_user_month
ON user_monthly_stats(user_id, year, month);
