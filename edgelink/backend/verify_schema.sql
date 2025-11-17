-- Verify current schema in production
-- Run this to check what exists before running migrations

-- Check if last_clicked_at column exists
PRAGMA table_info(links);

-- Check existing indexes on links table
SELECT name, sql FROM sqlite_master
WHERE type = 'index'
  AND tbl_name = 'links'
ORDER BY name;
