/**
 * EdgeLink - API Key Management Handler
 * Week 3 Implementation - API Key Generation and Authentication
 * Based on PRD v4.1 Section 7.1: FR-7 API Access
 */

import type { Env } from '../types';
import { hashPassword } from '../utils/password';

export interface APIKey {
  key_id: string;
  user_id: string;
  key_prefix: string;
  key_hash: string;
  name: string;
  last_used_at?: string;
  created_at: string;
  expires_at?: string;
}

/**
 * POST /api/keys - Generate a new API key
 *
 * API keys use Bearer authentication like JWT but are long-lived
 */
export async function handleGenerateAPIKey(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  try {
    const body = await request.json() as { name?: string; expires_in_days?: number };

    const keyName = body.name || 'API Key';
    const expiresInDays = body.expires_in_days || 365; // Default 1 year

    // Check existing API key count (max 5 per user)
    const existingKeys = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM api_keys WHERE user_id = ?
    `).bind(userId).first() as { count: number };

    if (existingKeys.count >= 5) {
      return new Response(
        JSON.stringify({
          error: 'Maximum 5 API keys allowed per user',
          code: 'KEY_LIMIT_REACHED'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate API key (format: elk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx)
    const apiKey = generateAPIKey();
    const keyPrefix = apiKey.substring(0, 11); // elk_xxxxxxx
    const keyHash = await hashPassword(apiKey);

    const keyId = generateKeyId();
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

    // Store API key in database
    await env.DB.prepare(`
      INSERT INTO api_keys (key_id, user_id, key_prefix, key_hash, name, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
    `).bind(
      keyId,
      userId,
      keyPrefix,
      keyHash,
      keyName,
      expiresAt
    ).run();

    return new Response(
      JSON.stringify({
        key_id: keyId,
        api_key: apiKey,
        key_prefix: keyPrefix,
        name: keyName,
        created_at: new Date().toISOString(),
        expires_at: expiresAt,
        warning: 'Save this API key now. You will not be able to see it again!',
        usage: {
          header: 'Authorization: Bearer ' + apiKey,
          example: `curl -H "Authorization: Bearer ${apiKey}" https://api.edgelink.io/api/shorten`
        }
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Generate API key error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate API key',
        code: 'KEY_GENERATION_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * GET /api/keys - Get user's API keys
 *
 * Returns list of keys with prefix only (not full key)
 */
export async function handleGetAPIKeys(
  env: Env,
  userId: string
): Promise<Response> {
  try {
    const result = await env.DB.prepare(`
      SELECT key_id, key_prefix, name, last_used_at, created_at, expires_at
      FROM api_keys
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all();

    return new Response(
      JSON.stringify({
        keys: result.results,
        total: result.results.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Get API keys error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch API keys',
        code: 'FETCH_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * DELETE /api/keys/:keyId - Revoke an API key
 */
export async function handleRevokeAPIKey(
  env: Env,
  userId: string,
  keyId: string
): Promise<Response> {
  try {
    // Verify ownership
    const key = await env.DB.prepare(`
      SELECT user_id FROM api_keys WHERE key_id = ?
    `).bind(keyId).first();

    if (!key) {
      return new Response(
        JSON.stringify({
          error: 'API key not found',
          code: 'NOT_FOUND'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (key.user_id !== userId) {
      return new Response(
        JSON.stringify({
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Delete API key
    await env.DB.prepare(`
      DELETE FROM api_keys WHERE key_id = ?
    `).bind(keyId).run();

    return new Response(
      JSON.stringify({
        message: 'API key revoked successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Revoke API key error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to revoke API key',
        code: 'REVOKE_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Verify API key from Authorization header
 *
 * Used in middleware to authenticate API requests
 */
export async function verifyAPIKey(
  apiKey: string,
  env: Env
): Promise<{ valid: boolean; user_id?: string; plan?: 'free' | 'pro'; key_id?: string }> {
  try {
    // API keys start with 'elk_'
    if (!apiKey.startsWith('elk_')) {
      return { valid: false };
    }

    // Get key prefix
    const keyPrefix = apiKey.substring(0, 11);

    // Find key in database by prefix
    const keys = await env.DB.prepare(`
      SELECT key_id, user_id, key_hash, expires_at FROM api_keys WHERE key_prefix = ?
    `).bind(keyPrefix).all();

    if (!keys.results || keys.results.length === 0) {
      return { valid: false };
    }

    // Verify hash for each matching prefix
    for (const key of keys.results as any[]) {
      // Check expiration
      if (key.expires_at && new Date(key.expires_at) < new Date()) {
        continue;
      }

      // Verify hash (using password hash function for consistency)
      const hashValid = await verifyAPIKeyHash(apiKey, key.key_hash);

      if (hashValid) {
        // Update last_used_at
        await env.DB.prepare(`
          UPDATE api_keys SET last_used_at = datetime('now') WHERE key_id = ?
        `).bind(key.key_id).run();

        // Get user plan
        const user = await env.DB.prepare(`
          SELECT plan FROM users WHERE user_id = ?
        `).bind(key.user_id).first() as { plan: 'free' | 'pro' } | null;

        return {
          valid: true,
          user_id: key.user_id,
          plan: user?.plan || 'free',
          key_id: key.key_id
        };
      }
    }

    return { valid: false };
  } catch (error) {
    console.error('API key verification error:', error);
    return { valid: false };
  }
}

/**
 * Generate a secure API key
 *
 * Format: elk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx (35 chars total)
 */
function generateAPIKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = 'elk_';

  for (let i = 0; i < 32; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }

  return key;
}

/**
 * Generate unique key ID
 */
function generateKeyId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'key_';

  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }

  return id;
}

/**
 * Verify API key hash
 */
async function verifyAPIKeyHash(apiKey: string, hash: string): Promise<boolean> {
  try {
    // For now, use a simple comparison since we're hashing with PBKDF2
    // In production, you'd use the same verification as password hashing
    const encoder = new TextEncoder();
    const keyData = encoder.encode(apiKey);
    const hashParts = hash.split(':');

    if (hashParts.length !== 2) {
      return false;
    }

    const [iterations, storedHash] = hashParts;
    const salt = storedHash.slice(0, 32); // First 32 chars are salt

    // Hash the provided key with same salt
    const hashBuffer = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: parseInt(iterations),
        hash: 'SHA-256'
      },
      hashBuffer,
      256
    );

    const derivedHash = Array.from(new Uint8Array(derivedBits))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return salt + derivedHash === storedHash;
  } catch (error) {
    console.error('API key hash verification error:', error);
    return false;
  }
}
