-- EdgeLink D1 Database Schema
-- Based on PRD Section 9.3: Data Models
-- Version: 1.0

-- Users table: User accounts and authentication
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  plan TEXT DEFAULT 'free' CHECK(plan IN ('free', 'pro')),
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  deletion_requested_at TIMESTAMP,
  deletion_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Links table: URL mappings and metadata
CREATE TABLE IF NOT EXISTS links (
  slug TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  destination TEXT NOT NULL,
  custom_domain TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  max_clicks INTEGER,
  click_count INTEGER DEFAULT 0,
  password_hash TEXT,
  utm_template TEXT,
  device_routing TEXT, -- JSON: {"mobile": "url", "desktop": "url", "tablet": "url"}
  geo_routing TEXT, -- JSON: {"US": "url", "IN": "url", "default": "url"}
  referrer_routing TEXT, -- JSON: {"twitter.com": "url", "linkedin.com": "url", "default": "url"}
  ab_testing TEXT, -- JSON: {"variant_a": "url", "variant_b": "url", "split": 50}
  utm_params TEXT, -- UTM parameters to auto-append
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Refresh tokens table: JWT refresh token storage
CREATE TABLE IF NOT EXISTS refresh_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Custom domains table: User domain management
CREATE TABLE IF NOT EXISTS custom_domains (
  domain_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  domain_name TEXT UNIQUE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Usage tracking table: Monitor user limits (links/month, API calls/day)
CREATE TABLE IF NOT EXISTS usage_tracking (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  metric_type TEXT NOT NULL CHECK(metric_type IN ('links_created', 'api_calls', 'clicks_tracked')),
  count INTEGER DEFAULT 0,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Anonymous links table: Track links created without authentication
CREATE TABLE IF NOT EXISTS anonymous_links (
  slug TEXT PRIMARY KEY,
  destination TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL, -- Auto-expire in 30 days
  click_count INTEGER DEFAULT 0
);

-- Webhooks table: User-configured webhook endpoints
CREATE TABLE IF NOT EXISTS webhooks (
  webhook_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  events TEXT NOT NULL, -- JSON array of event types
  secret TEXT NOT NULL, -- HMAC secret for signature verification
  slug TEXT, -- Specific link slug (NULL = all links)
  active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- API Keys table: Long-lived API authentication tokens (Week 3)
CREATE TABLE IF NOT EXISTS api_keys (
  key_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- First 11 chars for display (elk_xxxxxxx)
  key_hash TEXT NOT NULL, -- Hashed full key
  name TEXT NOT NULL, -- User-defined key name
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_user_links ON links(user_id);
CREATE INDEX IF NOT EXISTS idx_user_domains ON custom_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user ON usage_tracking(user_id, metric_type, period_start);
CREATE INDEX IF NOT EXISTS idx_links_expires_at ON links(expires_at);
CREATE INDEX IF NOT EXISTS idx_anonymous_links_expires_at ON anonymous_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- Triggers for updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_users_timestamp
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
END;

CREATE TRIGGER IF NOT EXISTS update_links_timestamp
AFTER UPDATE ON links
BEGIN
  UPDATE links SET updated_at = CURRENT_TIMESTAMP WHERE slug = NEW.slug;
END;

-- Week 6: Team Collaboration Tables

-- Teams table: Team information
CREATE TABLE IF NOT EXISTS teams (
  team_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  plan TEXT DEFAULT 'pro' CHECK(plan IN ('free', 'pro')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Team members table: User membership in teams
CREATE TABLE IF NOT EXISTS team_members (
  member_id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT CHECK(role IN ('owner', 'admin', 'member')) NOT NULL,
  status TEXT CHECK(status IN ('active', 'pending', 'suspended')) DEFAULT 'active',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE(team_id, user_id)
);

-- Team invitations table: Pending team invitations
CREATE TABLE IF NOT EXISTS team_invitations (
  invitation_id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin', 'member')) NOT NULL,
  invited_by TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  status TEXT CHECK(status IN ('pending', 'accepted', 'expired', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Indexes for team tables
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);

-- Triggers for team tables
CREATE TRIGGER IF NOT EXISTS update_teams_timestamp
AFTER UPDATE ON teams
BEGIN
  UPDATE teams SET updated_at = CURRENT_TIMESTAMP WHERE team_id = NEW.team_id;
END;

-- Week 7: A/B Testing & Analytics Archiving Tables

-- A/B Tests table: Split testing configuration
CREATE TABLE IF NOT EXISTS ab_tests (
  test_id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  user_id TEXT NOT NULL,
  test_name TEXT NOT NULL,
  variant_a_url TEXT NOT NULL,
  variant_b_url TEXT NOT NULL,
  status TEXT CHECK(status IN ('active', 'paused', 'completed')) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  winner TEXT CHECK(winner IN ('a', 'b', 'none')) DEFAULT 'none',
  FOREIGN KEY (slug) REFERENCES links(slug) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- A/B Test Events table: Track variant interactions
CREATE TABLE IF NOT EXISTS ab_test_events (
  event_id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  variant TEXT CHECK(variant IN ('a', 'b')) NOT NULL,
  visitor_hash TEXT NOT NULL,
  event_type TEXT CHECK(event_type IN ('click', 'conversion')) DEFAULT 'click',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_id) REFERENCES ab_tests(test_id) ON DELETE CASCADE
);

-- Analytics Archive table: Long-term analytics storage
CREATE TABLE IF NOT EXISTS analytics_archive (
  archive_id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD format
  total_clicks INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  top_country TEXT,
  top_device TEXT,
  top_browser TEXT,
  top_referrer TEXT,
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(slug, date),
  FOREIGN KEY (slug) REFERENCES links(slug) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Indexes for Week 7 tables
CREATE INDEX IF NOT EXISTS idx_ab_tests_slug ON ab_tests(slug);
CREATE INDEX IF NOT EXISTS idx_ab_tests_user ON ab_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_test ON ab_test_events(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_visitor ON ab_test_events(visitor_hash);
CREATE INDEX IF NOT EXISTS idx_analytics_archive_slug ON analytics_archive(slug);
CREATE INDEX IF NOT EXISTS idx_analytics_archive_user ON analytics_archive(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_archive_date ON analytics_archive(date);

-- Triggers for Week 7 tables
CREATE TRIGGER IF NOT EXISTS update_ab_tests_timestamp
AFTER UPDATE ON ab_tests
BEGIN
  UPDATE ab_tests SET updated_at = CURRENT_TIMESTAMP WHERE test_id = NEW.test_id;
END;
