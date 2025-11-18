-- EdgeLink Migration: Add group_id to links table
-- Run this SECOND (after creating link_groups table)
--
-- Command:
-- wrangler d1 execute edgelink-production --remote --file=migrations/001b_add_group_id_to_links.sql
--
-- Note: This will error if column already exists - that's OK, just means it's already there

ALTER TABLE links ADD COLUMN group_id TEXT REFERENCES link_groups(group_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_links_group ON links(group_id);
