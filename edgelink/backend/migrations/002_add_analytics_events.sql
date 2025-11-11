-- Migration: Add analytics_events table for FR-3 Analytics Foundation
-- Date: 2025-11-11
-- Description: Creates analytics_events table for detailed click tracking

-- FR-3: Analytics Foundation - Click Events Table
-- Stores individual click events for detailed analytics
-- This provides fallback when Analytics Engine is not available
CREATE TABLE IF NOT EXISTS analytics_events (
  event_id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  user_id TEXT, -- NULL for anonymous links
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Geographic data (from cf-ipcountry, cf-ipcity headers)
  country TEXT,
  city TEXT,
  -- Device detection
  device TEXT CHECK(device IN ('mobile', 'desktop', 'tablet', 'unknown')) DEFAULT 'unknown',
  -- Browser detection
  browser TEXT,
  -- OS detection
  os TEXT,
  -- Referrer
  referrer TEXT,
  -- User agent (for detailed analysis)
  user_agent TEXT,
  -- IP hash for unique visitor counting (GDPR compliant - hashed, not stored raw)
  ip_hash TEXT,
  FOREIGN KEY (slug) REFERENCES links(slug) ON DELETE CASCADE
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_slug ON analytics_events(slug);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_slug_timestamp ON analytics_events(slug, timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_country ON analytics_events(country);
CREATE INDEX IF NOT EXISTS idx_analytics_events_device ON analytics_events(device);
CREATE INDEX IF NOT EXISTS idx_analytics_events_browser ON analytics_events(browser);
