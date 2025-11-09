/**
 * EdgeLink Backend Types
 * Based on PRD v4.1 requirements
 */

export interface Env {
  // KV Namespace for fast link redirects
  LINKS_KV: KVNamespace;

  // D1 Database for user data and metadata
  DB: D1Database;

  // Analytics Engine for click tracking
  ANALYTICS_ENGINE: AnalyticsEngineDataset;

  // R2 Bucket for file storage
  R2_BUCKET: R2Bucket;

  // Rate Limiter binding
  RATE_LIMITER: any;

  // Environment variables
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

export interface JWTPayload {
  sub: string;        // User ID
  email: string;      // User email
  plan: 'free' | 'pro';
  iat: number;        // Issued at (timestamp)
  exp: number;        // Expiration (timestamp)
  fingerprint: string; // Device fingerprint for theft detection
}

export interface User {
  user_id: string;
  email: string;
  password_hash: string;
  plan: 'free' | 'pro';
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface Link {
  slug: string;
  user_id: string;
  destination: string;
  custom_domain?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  max_clicks?: number;
  click_count: number;
}

export interface LinkKVValue {
  destination: string;
  created_at: number;
  user_id: string;
  custom_domain?: string;
  device_routing?: {
    mobile?: string;
    desktop?: string;
    tablet?: string;
  };
  geo_routing?: Record<string, string>;
  referrer_routing?: Record<string, string>;
  expires_at?: number;
  max_clicks?: number;
  click_count?: number;
  password_hash?: string;
  utm_template?: string;
  utm_params?: string;
  metadata?: Record<string, any>;
  ab_testing?: {
    variant_a: string;
    variant_b: string;
  };
}

export interface ShortenRequest {
  url: string;
  custom_slug?: string;
  custom_domain?: string;
  expires_at?: string;
  max_clicks?: number;
  password?: string;
  utm_template?: string;
  device_routing?: LinkKVValue['device_routing'];
  geo_routing?: LinkKVValue['geo_routing'];
}

export interface ShortenResponse {
  slug: string;
  short_url: string;
  expires_in?: number;
  qr_code_url?: string;
}

export interface AuthRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
  user: {
    user_id: string;
    email: string;
    plan: 'free' | 'pro';
  };
}

export interface AnalyticsEvent {
  timestamp: number;
  slug: string;
  country: string;
  city?: string;
  device: string;
  browser: string;
  os: string;
  referrer: string;
  user_id?: string;
  plan?: string;
}

export interface RateLimitInfo {
  success: boolean;
  limit: number;
  remaining: number;
  resetAfter: number;
}

export interface APIError {
  error: string;
  code?: string;
  details?: any;
}
