/**
 * Authentication Handlers
 * Based on PRD Section 6.5: Authentication Endpoints
 */

import type { Env, AuthRequest, AuthResponse, User } from '../types';
import { generateJWT, generateFingerprint, generateRefreshToken } from '../auth/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { isValidEmail, isValidPassword } from '../utils/validation';

/**
 * Handle POST /auth/signup
 * Create new user account (FR-AUTH-3)
 */
export async function handleSignup(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = await request.json() as AuthRequest;

    // Validate input
    if (!body.email || !isValidEmail(body.email)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid email address',
          code: 'INVALID_EMAIL'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!body.password || !isValidPassword(body.password)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid password. Must be at least 8 characters with uppercase, lowercase, and number.',
          code: 'INVALID_PASSWORD'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user already exists
    const existingUser = await env.DB.prepare(`
      SELECT user_id FROM users WHERE email = ?
    `).bind(body.email).first();

    if (existingUser) {
      return new Response(
        JSON.stringify({
          error: 'Email already registered',
          code: 'EMAIL_EXISTS'
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate user ID
    const userId = `usr_${crypto.randomUUID()}`;

    // Hash password
    const passwordHash = await hashPassword(body.password);

    // Generate verification token
    const verificationToken = generateRefreshToken();

    // Create user
    await env.DB.prepare(`
      INSERT INTO users (
        user_id, email, password_hash, name, plan,
        email_verified, verification_token,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, 'free', FALSE, ?, datetime('now'), datetime('now'))
    `).bind(
      userId,
      body.email,
      passwordHash,
      body.name || null,
      verificationToken
    ).run();

    // Generate JWT tokens
    const fingerprint = generateFingerprint(request);
    const accessToken = await generateJWT(
      userId,
      body.email,
      'free',
      env.JWT_SECRET,
      fingerprint
    );
    const refreshToken = generateRefreshToken();

    // Store refresh token
    const refreshExpiry = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days
    await env.DB.prepare(`
      INSERT INTO refresh_tokens (token, user_id, expires_at)
      VALUES (?, ?, ?)
    `).bind(
      refreshToken,
      userId,
      new Date(refreshExpiry).toISOString()
    ).run();

    // TODO: Send verification email (implement in future)
    // await sendVerificationEmail(env, body.email, verificationToken);

    const response: AuthResponse = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 86400, // 24 hours
      token_type: 'Bearer',
      user: {
        user_id: userId,
        email: body.email,
        plan: 'free'
      }
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return new Response(
      JSON.stringify({
        error: 'Signup failed',
        code: 'SIGNUP_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle POST /auth/login
 * User login (FR-AUTH-4)
 */
export async function handleLogin(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = await request.json() as AuthRequest;

    // Validate input
    if (!body.email || !body.password) {
      return new Response(
        JSON.stringify({
          error: 'Email and password required',
          code: 'INVALID_INPUT'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user from database
    const user = await env.DB.prepare(`
      SELECT user_id, email, password_hash, plan
      FROM users
      WHERE email = ?
    `).bind(body.email).first() as User | null;

    if (!user) {
      return new Response(
        JSON.stringify({
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify password
    const passwordValid = await verifyPassword(body.password, user.password_hash);
    if (!passwordValid) {
      return new Response(
        JSON.stringify({
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate JWT tokens
    const fingerprint = generateFingerprint(request);
    const accessToken = await generateJWT(
      user.user_id,
      user.email,
      user.plan,
      env.JWT_SECRET,
      fingerprint
    );
    const refreshToken = generateRefreshToken();

    // Store refresh token
    const refreshExpiry = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days
    await env.DB.prepare(`
      INSERT INTO refresh_tokens (token, user_id, expires_at)
      VALUES (?, ?, ?)
    `).bind(
      refreshToken,
      user.user_id,
      new Date(refreshExpiry).toISOString()
    ).run();

    // Update last login
    await env.DB.prepare(`
      UPDATE users SET last_login = datetime('now') WHERE user_id = ?
    `).bind(user.user_id).run();

    const response: AuthResponse = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 86400, // 24 hours
      token_type: 'Bearer',
      user: {
        user_id: user.user_id,
        email: user.email,
        plan: user.plan
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({
        error: 'Login failed',
        code: 'LOGIN_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle POST /auth/refresh
 * Refresh access token using refresh token (FR-AUTH-4)
 */
export async function handleRefresh(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = await request.json() as { refresh_token: string };

    if (!body.refresh_token) {
      return new Response(
        JSON.stringify({
          error: 'Refresh token required',
          code: 'INVALID_INPUT'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get refresh token from database
    const tokenData = await env.DB.prepare(`
      SELECT rt.user_id, rt.expires_at, u.email, u.plan
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.user_id
      WHERE rt.token = ?
    `).bind(body.refresh_token).first();

    if (!tokenData) {
      return new Response(
        JSON.stringify({
          error: 'Invalid refresh token',
          code: 'INVALID_TOKEN'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check expiration
    const expiresAt = new Date(tokenData.expires_at as string).getTime();
    if (Date.now() > expiresAt) {
      // Delete expired token
      await env.DB.prepare(`
        DELETE FROM refresh_tokens WHERE token = ?
      `).bind(body.refresh_token).run();

      return new Response(
        JSON.stringify({
          error: 'Refresh token expired',
          code: 'TOKEN_EXPIRED'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate new access token
    const fingerprint = generateFingerprint(request);
    const accessToken = await generateJWT(
      tokenData.user_id as string,
      tokenData.email as string,
      tokenData.plan as 'free' | 'pro',
      env.JWT_SECRET,
      fingerprint
    );

    return new Response(
      JSON.stringify({
        access_token: accessToken,
        expires_in: 86400,
        token_type: 'Bearer'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Refresh error:', error);
    return new Response(
      JSON.stringify({
        error: 'Token refresh failed',
        code: 'REFRESH_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle POST /auth/logout
 * Logout user and invalidate refresh token
 */
export async function handleLogout(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = await request.json() as { refresh_token: string };

    if (!body.refresh_token) {
      return new Response(
        JSON.stringify({
          error: 'Refresh token required',
          code: 'INVALID_INPUT'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Delete refresh token
    await env.DB.prepare(`
      DELETE FROM refresh_tokens WHERE token = ?
    `).bind(body.refresh_token).run();

    return new Response(
      JSON.stringify({
        message: 'Logged out successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(
      JSON.stringify({
        error: 'Logout failed',
        code: 'LOGOUT_FAILED'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
