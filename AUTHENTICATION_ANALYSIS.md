# EdgeLink Authentication System Analysis

## Executive Summary

EdgeLink uses a **custom JWT-based authentication system** with **NO Passport.js integration**. The system supports both **JWT tokens** for user sessions and **API keys** for programmatic access. A migration to Clerk (a third-party auth service) was previously planned but the system currently uses custom implementation.

---

## 1. Is Passport.js Currently Being Used?

**Answer: NO**

- No Passport.js or any Passport strategy packages are installed
- Backend package.json only contains: `@cloudflare/workers-types` and `resend`
- Frontend package.json contains standard React/Next.js packages with no auth libraries

---

## 2. Authentication Strategy Implemented

**Primary Strategy: JWT-based Authentication with API Keys**

### Two Authentication Methods:

#### Method 1: JWT Token (User Sessions)
- **Format**: Standard JWT (3 parts separated by dots)
- **Lifespan**: 24 hours
- **Generation**: Signed with HS256 using Web Crypto API
- **Use Case**: Web applications, mobile apps, interactive sessions
- **Storage**: Database table `refresh_tokens` (30-day expiration)
- **Features**:
  - Device fingerprinting for anti-theft protection
  - Refresh token mechanism for token renewal
  - Email verification tokens (48-hour expiration)
  - Password reset tokens (15-minute expiration)

#### Method 2: API Key (Long-lived)
- **Format**: `elk_` + 32 alphanumeric characters (35 chars total)
- **Lifespan**: Up to 1 year (customizable)
- **Storage**: Database table `api_keys` (hashed with PBKDF2)
- **Use Case**: Scripts, automation, CI/CD pipelines, services
- **Features**:
  - Prefix-based lookup (`elk_xxxxxxx`)
  - Hash verification (constant-time comparison)
  - Usage tracking (last_used_at)
  - Per-user limit (max 5 API keys)
  - Plan-based feature access control

---

## 3. Authentication Logic Location

### Backend Implementation

**Core Authentication Files:**
1. **`/edgelink/backend/src/auth/jwt.ts`** (264 lines)
   - JWT generation and verification
   - HS256 signing using Web Crypto API
   - Device fingerprinting generation
   - Refresh token generation
   - Base64URL encoding/decoding

2. **`/edgelink/backend/src/middleware/auth.ts`** (160 lines)
   - Authentication middleware
   - Supports JWT tokens and API keys
   - Priority: API Key → JWT Token → Anonymous
   - Fingerprint validation for anti-theft
   - `authenticate()` function - returns user or null
   - `requireAuth()` function - enforces authentication

3. **`/edgelink/backend/src/handlers/auth.ts`** (437 lines)
   - Signup handler
   - Login handler
   - Token refresh handler
   - Logout handler
   - Password validation and hashing (PBKDF2)

4. **`/edgelink/backend/src/handlers/apikeys.ts`** (386 lines)
   - API key generation
   - API key verification
   - API key listing
   - API key revocation

5. **`/edgelink/backend/src/services/auth/tokenService.ts`** (135 lines)
   - Email verification token management
   - Password reset token management
   - Token hashing (SHA-256)
   - Expiration validation

6. **Auth Sub-handlers** (in `/edgelink/backend/src/handlers/auth/`):
   - `verify-email.ts` - Email verification endpoint
   - `resend-verification.ts` - Resend verification email
   - `request-reset.ts` - Request password reset
   - `reset-password.ts` - Reset password with token

### Frontend Implementation

**`/edgelink/frontend/src/lib/auth.ts`** (87 lines)
- `useAuth()` hook for authentication state
- Token storage in localStorage
- User state management
- Cross-tab authentication sync via storage events
- Custom `authChange` event for same-tab updates

---

## 4. Supported Auth Providers

**Currently Supported:**
- Email/Password (custom implementation)
- API Keys (custom)

**NOT Currently Supported:**
- OAuth 2.0 (Google, GitHub, Facebook, etc.)
- Social Login
- Third-party providers

**Note**: There's a migration guide for **Clerk** integration (a third-party auth platform that supports email/password + OAuth), but it hasn't been implemented yet. The guide indicates intent to support:
- Email/Password via Clerk
- Google OAuth
- GitHub OAuth
- Other social providers (via Clerk)

---

## 5. Package.json Authentication Dependencies

### Backend package.json
```json
{
  "dependencies": {
    "@cloudflare/workers-types": "^4.20241127.0",
    "resend": "^3.0.0"  // Email service, not auth
  }
}
```

**Authentication-related packages: NONE**
- No passport
- No passport-jwt
- No passport-google-oauth20
- No passport-github
- No jwt library (using Web Crypto API instead)

### Frontend package.json
```json
{
  "dependencies": {
    "@headlessui/react": "^2.2.0",
    "@heroicons/react": "^2.2.0",
    "clsx": "^2.1.1",
    "next": "^15.1.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^2.10.3"
  }
}
```

**Authentication-related packages: NONE**
- No clerk (planned but not installed)
- No next-auth
- No auth library

---

## 6. Auth Middleware and Token Handling

### Middleware Architecture

**Authentication Middleware** (`/edgelink/backend/src/middleware/auth.ts`):
```
Request → Extract Authorization Header
         ↓
         Is it an API Key (elk_prefix)?
         ├→ YES: Verify API Key Hash → Return API Key User
         └→ NO: Try JWT Verification
                 ├→ Valid JWT: Validate Fingerprint → Return JWT User
                 └→ Invalid: Return Anonymous User
         ↓
         Attach user to request
```

**Middleware Functions:**
- `authenticate()` - Optional auth (allows anonymous)
- `requireAuth()` - Mandatory auth (401 if not authenticated)

### Token Storage

**Access Token Storage**:
- Frontend: `localStorage.accessToken`
- Backend: Memory (stateless)

**Refresh Token Storage**:
- Backend: Database table `refresh_tokens`
- Format: 64-character random hex string
- Expiration: 30 days from issuance

**Token Validation Flow**:
1. Extract token from `Authorization: Bearer <token>` header
2. Check if it starts with `elk_` (API key) or is JWT
3. Verify signature (HS256) or API key hash (PBKDF2)
4. Check expiration timestamp
5. Validate device fingerprint (for JWT only)

### Rate Limiting

**Auth-specific Rate Limits** (in middleware):
- Signup: Limited per email
- Login: Limited per email
- Password Reset: Limited per email
- Email Verification: Limited per email

---

## 7. OAuth/Social Login Implementations

### Current Status: NOT IMPLEMENTED

**What Exists**: Documentation and migration guide for Clerk integration

**Planned Providers** (from CLERK_MIGRATION_GUIDE.md):
- Google OAuth
- GitHub OAuth
- Other providers via Clerk platform

**Current Blocker**: Clerk account setup not completed

---

## 8. Database Schema for Authentication

### Users Table
```sql
user_id              TEXT PRIMARY KEY    -- usr_xxxxxxx format
email                TEXT UNIQUE         -- Email address
password_hash        TEXT                -- PBKDF2 hashed password
name                 TEXT                -- User's name
plan                 TEXT (free|pro)     -- Subscription tier
email_verified       BOOLEAN             -- Email verification status
last_login_at        INTEGER             -- Last login timestamp
created_at           DATETIME            -- Account creation time
updated_at           DATETIME            -- Last update time
```

### Refresh Tokens Table
```sql
token                TEXT PRIMARY KEY    -- 64-char random hex
user_id              TEXT                -- FK to users
expires_at           DATETIME            -- 30-day expiration
```

### Email Verification Tokens Table
```sql
user_id              TEXT                -- FK to users
token_hash           TEXT                -- SHA-256 hashed token
expires_at           INTEGER             -- 48-hour expiration
```

### Password Reset Tokens Table
```sql
user_id              TEXT                -- FK to users
token_hash           TEXT                -- SHA-256 hashed token
expires_at           INTEGER             -- 15-minute expiration
used_at              INTEGER             -- Timestamp when used
```

### API Keys Table
```sql
key_id               TEXT PRIMARY KEY    -- key_xxxxxxx format
user_id              TEXT                -- FK to users
key_prefix           TEXT                -- elk_xxxxxxx (11 chars)
key_hash             TEXT                -- PBKDF2 hashed full key
name                 TEXT                -- User-friendly name
last_used_at         DATETIME            -- Usage tracking
created_at           DATETIME            -- Creation time
expires_at           DATETIME            -- Expiration time
```

---

## 9. Authentication Routes

### Public Auth Endpoints (No authentication required)
```
POST /auth/signup              - Register new user
POST /auth/login               - Login with email/password
POST /auth/refresh             - Refresh access token
POST /auth/logout              - Logout and invalidate refresh token
POST /auth/verify-email        - Verify email with token
POST /auth/resend-verification - Resend verification email
POST /auth/request-reset       - Request password reset link
POST /auth/reset-password      - Reset password with token
```

### Protected Endpoints (Authentication required)
- All `/api/*` endpoints require JWT or API Key
- User profile endpoints
- Link management endpoints
- Analytics endpoints
- Domain management endpoints
- API key management endpoints
- Webhook endpoints

---

## 10. Security Features

### JWT Security
- **Algorithm**: HS256 (HMAC-SHA256)
- **Device Fingerprinting**: User-Agent + IP address hashing
- **Anti-theft Protection**: Token binds to device fingerprint
- **Expiration**: 24-hour token lifespan
- **Refresh Mechanism**: 30-day refresh tokens in database

### API Key Security
- **Format**: `elk_` + 32 random characters
- **Storage**: PBKDF2 hashing with 100,000 iterations
- **Verification**: Constant-time comparison
- **Tracking**: `last_used_at` for monitoring
- **Limits**: Max 5 keys per user
- **Expiration**: Customizable (default 1 year)

### Password Security
- **Algorithm**: PBKDF2-SHA256
- **Iterations**: 100,000
- **Validation**: Minimum 8 characters, uppercase, lowercase, number
- **Comparison**: Constant-time to prevent timing attacks

### Additional Security
- **Email Verification**: Required for new accounts (90 days to verify)
- **Password Reset**: 15-minute token expiration
- **Rate Limiting**: Per-email limits on auth actions
- **Webhook Verification**: Signed webhooks for integrations

---

## 11. Current State & Recommendations

### Current Implementation Status
✅ **JWT-based authentication** - Fully implemented
✅ **API Key authentication** - Fully implemented
✅ **Email/Password auth** - Fully implemented
✅ **Token refresh mechanism** - Fully implemented
✅ **Password reset flow** - Fully implemented
✅ **Email verification** - Fully implemented
✅ **Rate limiting** - Implemented
❌ **OAuth/Social Login** - Not implemented (Clerk guide exists but not configured)
❌ **Passport.js** - Not used and not integrated

### Regarding Passport.js Integration

**Can Passport.js be integrated?**
- **Technically**: Yes, but not necessary for current implementation
- **Recommended**: NO - current custom JWT is more suitable because:
  1. **Cloudflare Workers limitation**: Passport.js is designed for Node.js/Express
  2. **Custom JWT is simpler**: Already handles all requirements
  3. **No need for middleware chain**: Custom auth fits Cloudflare Workers better
  4. **Performance**: Direct cryptographic operations faster than Passport overhead

### Recommended Path for OAuth Support

1. **Option A: Implement with Clerk** (Recommended)
   - Complete Clerk migration setup (see CLERK_MIGRATION_GUIDE.md)
   - Gains OAuth + professional auth UI
   - Reduces maintenance burden
   
2. **Option B: Custom OAuth Implementation** (Not recommended)
   - Would need to implement OAuth 2.0 flow manually
   - Requires integration with Google/GitHub APIs
   - More complex security considerations
   
3. **Option C: Use JWT + ignore OAuth** (Current state)
   - Continue with email/password only
   - API keys for programmatic access

---

## 12. Frontend Auth Implementation

### React Hook: `useAuth()`
```typescript
{
  isLoaded: boolean;           // Auth state loaded
  isSignedIn: boolean;         // User is authenticated
  getToken: () => Promise<string | null>;  // Get access token
  user: User | null;           // Current user data
}
```

### Authentication Flow (Frontend)
1. User signs up/logs in
2. Backend returns `access_token` and `refresh_token`
3. Frontend stores both in localStorage
4. Frontend listens for storage changes
5. On token expiration, uses refresh_token to get new access_token
6. All API requests include `Authorization: Bearer <token>`

---

## Summary Table

| Aspect | Status | Details |
|--------|--------|---------|
| **Passport.js** | ❌ Not Used | Custom JWT implementation instead |
| **OAuth** | ❌ Not Implemented | Clerk migration guide exists but not configured |
| **JWT** | ✅ Fully Implemented | HS256, device fingerprinting, 24-hour expiration |
| **API Keys** | ✅ Fully Implemented | `elk_` prefix, PBKDF2 hashing, up to 1 year |
| **Email/Password** | ✅ Fully Implemented | PBKDF2 hashing, verification required |
| **Session Management** | ✅ Implemented | Refresh token mechanism, 30-day duration |
| **Middleware** | ✅ Implemented | Custom `authenticate()` and `requireAuth()` |
| **Rate Limiting** | ✅ Implemented | Per-email limits on auth actions |
| **Token Refresh** | ✅ Implemented | Automatic via refresh_token endpoint |
| **Password Reset** | ✅ Implemented | Email-based reset with 15-min tokens |
| **Email Verification** | ✅ Implemented | Required, 90-day deadline |
| **Social Login** | ❌ Not Implemented | Requires Clerk configuration |

---

## File Structure Summary

```
Backend Authentication:
├── /src/auth/
│   └── jwt.ts (264 lines) - JWT generation/verification
├── /src/middleware/
│   └── auth.ts (160 lines) - Auth middleware
├── /src/handlers/
│   ├── auth.ts (437 lines) - Auth endpoints
│   ├── apikeys.ts (386 lines) - API key management
│   └── auth/
│       ├── verify-email.ts
│       ├── resend-verification.ts
│       ├── request-reset.ts
│       └── reset-password.ts
└── /src/services/auth/
    └── tokenService.ts (135 lines) - Token management

Frontend Authentication:
└── /src/lib/
    └── auth.ts (87 lines) - useAuth() hook
```

