/**
 * JWT Authentication System
 * Based on PRD Section 6: JWT-Based Authentication
 *
 * Features:
 * - HS256 signing using Web Crypto API
 * - 24-hour token expiration
 * - Device fingerprinting for anti-theft
 * - <5ms validation performance target
 */

import type { JWTPayload } from '../types';

/**
 * Generate device fingerprint from request
 * Used for JWT anti-theft protection (FR-AUTH-2)
 */
export function generateFingerprint(request: Request): string {
  const userAgent = request.headers.get('user-agent') || '';
  const ip = request.headers.get('cf-connecting-ip') || '';

  // Create a simple hash of user agent + IP
  const data = `${userAgent}${ip}`;
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);

  // Convert to hex string and take first 20 chars
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 20);
}

/**
 * Generate JWT token (FR-AUTH-1)
 *
 * @param userId - Unique user identifier
 * @param email - User email address
 * @param plan - Subscription tier (free or pro)
 * @param secret - JWT secret key
 * @param fingerprint - Device fingerprint
 * @returns JWT token string
 */
export async function generateJWT(
  userId: string,
  email: string,
  plan: 'free' | 'pro',
  secret: string,
  fingerprint: string
): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    sub: userId,
    email: email,
    plan: plan,
    iat: now,
    exp: now + 86400, // 24 hours = 86400 seconds
    fingerprint: fingerprint
  };

  // Base64URL encode header and payload
  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));

  // Sign using HMAC-SHA256
  const signature = await signHS256(
    `${headerEncoded}.${payloadEncoded}`,
    secret
  );

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

/**
 * Verify and decode JWT token (FR-AUTH-2)
 *
 * @param token - JWT token to verify
 * @param secret - JWT secret key
 * @returns Decoded JWT payload
 * @throws Error if token is invalid or expired
 */
export async function verifyJWT(
  token: string,
  secret: string
): Promise<JWTPayload> {
  const parts = token.split('.');

  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Verify signature
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const messageBuffer = encoder.encode(`${headerB64}.${payloadB64}`);
  const signatureBuffer = base64UrlDecode(signatureB64);

  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    signatureBuffer,
    messageBuffer
  );

  if (!isValid) {
    throw new Error('Invalid signature');
  }

  // Decode and validate payload
  const payload = JSON.parse(base64UrlDecodeString(payloadB64)) as JWTPayload;

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error('Token expired');
  }

  return payload;
}

/**
 * Sign message using HMAC-SHA256
 */
async function signHS256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const messageBuffer = encoder.encode(message);
  const signature = await crypto.subtle.sign('HMAC', key, messageBuffer);

  return base64UrlEncode(signature);
}

/**
 * Base64URL encode (RFC 4648)
 */
function base64UrlEncode(data: string | ArrayBuffer): string {
  let base64: string;

  if (typeof data === 'string') {
    base64 = btoa(data);
  } else {
    const bytes = new Uint8Array(data);
    base64 = btoa(String.fromCharCode(...bytes));
  }

  // Convert to base64url format
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Base64URL decode to ArrayBuffer
 */
function base64UrlDecode(data: string): ArrayBuffer {
  // Convert from base64url to base64
  let base64 = data
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // Add padding
  while (base64.length % 4) {
    base64 += '=';
  }

  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

/**
 * Base64URL decode to string
 */
function base64UrlDecodeString(data: string): string {
  // Convert from base64url to base64
  let base64 = data
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // Add padding
  while (base64.length % 4) {
    base64 += '=';
  }

  return atob(base64);
}

/**
 * JWT Middleware - Extract and verify JWT from Authorization header
 *
 * @param request - Incoming request
 * @param secret - JWT secret key
 * @returns JWT payload or null if no token
 * @throws Error if token is invalid
 */
export async function extractJWT(
  request: Request,
  secret: string
): Promise<JWTPayload | null> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return null; // No token, anonymous request
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid Authorization header format');
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix
  return await verifyJWT(token, secret);
}

/**
 * Validate JWT fingerprint matches current request
 * Prevents token theft (FR-AUTH-2)
 */
export function validateFingerprint(
  payload: JWTPayload,
  request: Request
): boolean {
  const currentFingerprint = generateFingerprint(request);
  return currentFingerprint === payload.fingerprint;
}

/**
 * Generate random refresh token
 */
export function generateRefreshToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
