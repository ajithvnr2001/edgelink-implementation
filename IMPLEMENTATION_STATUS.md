# EdgeLink Email & DodoPayments Integration - Implementation Status

## Current Commit
`dadb205` - Core services implementation complete

---

## ✅ COMPLETED (Commit: dadb205)

### Database Migrations
- [x] `migrations/002_email_and_payments.sql` - Complete schema updates for email verification, password reset, payments, and subscriptions

### Email Services (Resend Integration)
- [x] `services/email/emailService.ts` - Core email service with exponential backoff retry logic
- [x] `services/email/rateLimiter.ts` - KV-based rate limiting (5 verifications/hour, 3 resets/hour)
- [x] `services/email/templates/verification.ts` - Email verification template
- [x] `services/email/templates/passwordReset.ts` - Password reset template
- [x] `services/email/templates/passwordChanged.ts` - Password change confirmation template
- [x] `services/email/templates/unverifiedWarning.ts` - 80-day warning template
- [x] `services/email/templates/accountDeleted.ts` - Account deletion confirmation template

### Authentication Services
- [x] `services/auth/tokenService.ts` - Secure token generation and validation for email verification and password reset

### Payment Services (DodoPayments Integration)
- [x] `services/payments/dodoPaymentsService.ts` - Complete DodoPayments API wrapper
- [x] `services/payments/subscriptionService.ts` - Subscription status management
- [x] `services/payments/planLimits.ts` - Feature access control by plan

### Cleanup Services
- [x] `services/cleanup/deletionService.ts` - Account deletion with cascade

---

## 🚧 REMAINING WORK

### 1. Authentication Handlers (HIGH PRIORITY)

#### Modify Existing Handlers
**File:** `handlers/auth.ts`

**Changes needed in `handleSignup`:**
```typescript
// Line 74: Generate verification token
const tokenService = new TokenService(env);
const { token } = await tokenService.generateVerificationToken(userId);

// Line 114: Send verification email
const emailService = new EmailService(env);
const rateLimiter = new EmailRateLimiter(env.LINKS_KV);

const allowed = await rateLimiter.checkRateLimit(body.email, 'verification');
if (allowed) {
  try {
    await emailService.sendVerificationEmail(body.email, token);
  } catch (error) {
    console.error('Failed to send verification email:', error);
  }
}

// Update response message
// Add: "Please check your email to verify your account within 90 days."
```

**Changes needed in `handleLogin`:**
```typescript
// Line 232: Update last_login_at
await env.DB.prepare(`
  UPDATE users SET last_login_at = ? WHERE user_id = ?
`).bind(Math.floor(Date.now() / 1000), user.user_id).run();

// Line 240: Include email_verified in response
user: {
  user_id: user.user_id,
  email: user.email,
  plan: user.plan,
  email_verified: user.email_verified
}
```

#### Create New Handlers
Create directory: `handlers/auth/`

1. **`handlers/auth/verify-email.ts`** - Handle email verification
2. **`handlers/auth/resend-verification.ts`** - Resend verification email
3. **`handlers/auth/request-reset.ts`** - Request password reset
4. **`handlers/auth/reset-password.ts`** - Complete password reset

### 2. Payment Handlers (HIGH PRIORITY)

Create directory: `handlers/payments/`

1. **`handlers/payments/create-checkout.ts`** - Create DodoPayments checkout session
2. **`handlers/payments/webhook.ts`** - Handle DodoPayments webhooks
3. **`handlers/payments/subscription-status.ts`** - Get user subscription info
4. **`handlers/payments/customer-portal.ts`** - Generate customer portal link

### 3. Cron Job (HIGH PRIORITY)

**File:** `cron/dailyCleanup.ts`

Tasks:
1. Send warnings to 80-day unverified accounts
2. Delete 90-day unverified accounts
3. Clean up expired tokens (7+ days old)

### 4. Configuration Updates (HIGH PRIORITY)

**File:** `wrangler.toml`

Add variables:
```toml
[vars]
FRONTEND_URL = "https://shortedbro.xyz"
EMAIL_FROM_ADDRESS = "EdgeLink <noreply@shortedbro.xyz>"

# Secrets to set via: wrangler secret put <NAME>
# RESEND_API_KEY
# DODO_API_KEY
# DODO_WEBHOOK_SECRET
# DODO_PRICE_PRO_MONTHLY
# DODO_PRICE_PRO_ANNUAL
# DODO_PRICE_LIFETIME

# Update cron trigger
[triggers]
crons = ["0 2 * * *"]  # Daily at 2 AM UTC (changed from midnight)
```

### 5. Main Router Updates (HIGH PRIORITY)

**File:** `src/index.ts`

Add routes:
- `POST /auth/verify-email` - Email verification
- `POST /auth/resend-verification` - Resend verification
- `POST /auth/request-reset` - Request password reset
- `POST /auth/reset-password` - Reset password
- `POST /api/payments/create-checkout` - Create checkout session
- `POST /webhooks/dodopayments` - DodoPayments webhook
- `GET /api/payments/subscription-status` - Get subscription
- `POST /api/payments/customer-portal` - Customer portal

Update scheduled handler:
```typescript
async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  await dailyCleanup(env);
}
```

### 6. Type Definitions (MEDIUM PRIORITY)

**File:** `types/index.ts`

Add to `Env` interface:
```typescript
RESEND_API_KEY: string;
DODO_API_KEY: string;
DODO_WEBHOOK_SECRET: string;
EMAIL_FROM_ADDRESS?: string;
FRONTEND_URL?: string;
DODO_PRICE_PRO_MONTHLY?: string;
DODO_PRICE_PRO_ANNUAL?: string;
DODO_PRICE_LIFETIME?: string;
```

### 7. Frontend Implementation (LOWER PRIORITY)

Can be done after backend is complete and tested.

#### Email Verification Pages
- `frontend/src/app/verify-email/page.tsx`
- `frontend/src/app/forgot-password/page.tsx`
- `frontend/src/app/reset-password/page.tsx`
- `frontend/src/lib/api/emailApi.ts`

#### Payment/Billing Pages
- `frontend/src/app/pricing/page.tsx`
- `frontend/src/app/billing/page.tsx`
- `frontend/src/app/billing/success/page.tsx`
- `frontend/src/lib/api/billing.ts`

---

## 📋 IMPLEMENTATION STEPS

### Step 1: Create Auth Handlers (30 min)
1. Create `handlers/auth/` directory
2. Implement 4 new auth handlers
3. Modify existing `handlers/auth.ts`

### Step 2: Create Payment Handlers (30 min)
1. Create `handlers/payments/` directory
2. Implement 4 payment handlers

### Step 3: Create Cron Job (15 min)
1. Create `cron/dailyCleanup.ts`

### Step 4: Wire Everything Together (20 min)
1. Update `types/index.ts`
2. Update `wrangler.toml`
3. Update `src/index.ts` with all routes
4. Update imports

### Step 5: Test Backend (30 min)
1. Run migrations: `wrangler d1 execute edgelink-production --file=migrations/002_email_and_payments.sql`
2. Set secrets: `wrangler secret put RESEND_API_KEY` etc.
3. Deploy: `wrangler deploy`
4. Test each endpoint

### Step 6: Frontend (Optional, can be later)
1. Create email verification pages
2. Create pricing/billing pages

---

## 🎯 NEXT IMMEDIATE ACTIONS

1. **Create auth handlers** - This unlocks email verification
2. **Create payment handlers** - This unlocks subscriptions
3. **Update index.ts** - This wires everything together
4. **Test with Postman/curl** - Verify backend works

Once backend is working, frontend can be built iteratively.

---

## 📦 Dependencies to Install

Add to `package.json`:
```json
{
  "dependencies": {
    "resend": "^3.0.0"
  }
}
```

Run: `npm install resend`

---

## 🔐 Secrets to Configure

Before deployment:
```bash
cd edgelink/backend
wrangler secret put RESEND_API_KEY
wrangler secret put DODO_API_KEY
wrangler secret put DODO_WEBHOOK_SECRET
wrangler secret put DODO_PRICE_PRO_MONTHLY
wrangler secret put DODO_PRICE_PRO_ANNUAL
wrangler secret put DODO_PRICE_LIFETIME
```

---

## 📝 Notes

- All services follow PRD specifications
- Retry logic handles Resend rate limits (2 req/sec)
- Email rate limiting prevents abuse
- Unverified accounts deleted after 90 days
- Verified accounts never auto-deleted
- DodoPayments handles all payment emails automatically
- Subscription status checked in real-time via webhooks

---

**Total estimated time to complete remaining work:** ~2 hours
**Most critical:** Auth handlers + Payment handlers + Route wiring
