# 🔔 Complete Webhook Setup Guide for EdgeLink

This guide covers setting up webhooks for **DodoPayments** (payment processing) and **Resend** (email delivery) to enable real-time event tracking in your EdgeLink application.

---

## Table of Contents
- [Prerequisites](#prerequisites)
- [DodoPayments Webhook Setup](#dodopayments-webhook-setup)
- [Resend Webhook Setup](#resend-webhook-setup)
- [Testing Webhooks](#testing-webhooks)
- [Monitoring & Debugging](#monitoring--debugging)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

✅ Backend deployed to Cloudflare Workers:
```bash
cd edgelink/backend
wrangler deploy
```

✅ Required secrets configured:
```bash
# Authentication
wrangler secret put JWT_SECRET

# Email (Resend)
wrangler secret put RESEND_API_KEY

# Payments (DodoPayments)
wrangler secret put DODO_API_KEY
wrangler secret put DODO_WEBHOOK_SECRET
wrangler secret put DODO_PRODUCT_ID
```

---

## DodoPayments Webhook Setup

### 📍 Webhook URL
```
https://shortedbro.xyz/webhooks/dodopayments
```

### 🎯 Supported Events

Your implementation handles **13 events** across 3 categories:

#### **Payment Events** (4 events)
| Event | Description | Action Taken |
|-------|-------------|--------------|
| `payment.succeeded` | Payment completed successfully | Record payment in database |
| `payment.failed` | Payment failed | Record failure + log for notification |
| `payment.processing` | Payment is being processed | Log status (not recorded) |
| `payment.cancelled` | Payment was cancelled | Record cancelled payment |

#### **Subscription Events** (7 events)
| Event | Description | Action Taken |
|-------|-------------|--------------|
| `subscription.active` | Subscription activated | Update user to Pro plan |
| `subscription.renewed` | Monthly renewal succeeded | Extend period + record payment |
| `subscription.cancelled` | User cancelled | Mark cancel_at_period_end=true |
| `subscription.expired` | Subscription ended | Downgrade to free plan |
| `subscription.failed` | Renewal payment failed | Mark as failed (grace period) |
| `subscription.on_hold` | Subscription paused | Mark as on_hold |
| `subscription.plan_changed` | Plan details changed | Update subscription details |

#### **Refund Events** (2 events)
| Event | Description | Action Taken |
|-------|-------------|--------------|
| `refund.succeeded` | Refund processed | Record refund (negative amount) |
| `refund.failed` | Refund failed | Log for manual review |

### 📝 Setup Steps

#### Step 1: Access DodoPayments Dashboard
1. Go to [DodoPayments Dashboard](https://dodopayments.com)
2. Log in to your account
3. Navigate to **Settings** → **Webhooks** (or **Developers** section)

#### Step 2: Create Webhook Endpoint
1. Click **Add Endpoint** or **Create Webhook**
2. Enter webhook URL: `https://shortedbro.xyz/webhooks/dodopayments`
3. Select **all events** (or select individually):

**Payment Events:**
- ☑ payment.succeeded
- ☑ payment.failed
- ☑ payment.processing
- ☑ payment.cancelled

**Subscription Events:**
- ☑ subscription.active
- ☑ subscription.renewed
- ☑ subscription.cancelled
- ☑ subscription.expired
- ☑ subscription.failed
- ☑ subscription.on_hold
- ☑ subscription.plan_changed

**Refund Events:**
- ☑ refund.succeeded
- ☑ refund.failed

4. Click **Save** or **Create**

#### Step 3: Copy Webhook Secret
1. After creating, DodoPayments shows a **Webhook Signing Secret**
2. Copy the secret (starts with `whsec_` or similar)

#### Step 4: Set Secret in Cloudflare
```bash
cd edgelink/backend
wrangler secret put DODO_WEBHOOK_SECRET
# Paste the webhook signing secret when prompted
```

#### Step 5: Verify Setup
```bash
# Watch real-time logs
wrangler tail --format pretty

# Create a test subscription and verify webhook is received
```

---

## Resend Webhook Setup

### 📍 Webhook URL
```
https://shortedbro.xyz/webhooks/resend
```

### 🎯 Supported Events

Your implementation handles **9 email events**:

| Event | Description | Database Status | Priority |
|-------|-------------|-----------------|----------|
| `email.sent` | Email sent to mail server | `sent` | Normal |
| `email.delivered` | Email successfully delivered | `delivered` | ✅ Success |
| `email.delivery_delayed` | Delivery delayed | `delayed` | ⚠️ Warning |
| `email.failed` | Email failed to send | `failed` | 🚨 Critical |
| `email.bounced` | Email bounced (hard/soft) | `bounced` | ⚠️ Warning |
| `email.complained` | Marked as spam | `complained` | 🚨 Critical |
| `email.scheduled` | Email scheduled for later | `scheduled` | Normal |
| `email.opened` | Recipient opened email | (not tracked) | Info |
| `email.clicked` | Recipient clicked link | (not tracked) | Info |

### 📝 Setup Steps

#### Step 1: Access Resend Dashboard
1. Go to [Resend Dashboard](https://resend.com)
2. Log in to your account
3. Navigate to **Webhooks** section

#### Step 2: Create Webhook Endpoint
1. Click **Add Webhook** or **Create Endpoint**
2. Enter webhook URL: `https://shortedbro.xyz/webhooks/resend`
3. Select events to track:

**Critical Events** (Recommended):
- ☑ email.sent
- ☑ email.delivered
- ☑ email.failed
- ☑ email.bounced
- ☑ email.complained

**Optional Events**:
- ☑ email.delivery_delayed
- ☑ email.scheduled
- ☑ email.opened (engagement tracking)
- ☑ email.clicked (engagement tracking)

4. Click **Save** or **Create**

#### Step 3: Test Webhook
```bash
# Watch real-time logs
wrangler tail --format pretty

# Sign up with a new account to trigger verification email
# Watch webhook events arrive
```

---

## Testing Webhooks

### Test DodoPayments Webhook

#### Option 1: Test Mode Payment
1. Use DodoPayments test mode
2. Create a checkout session from your app
3. Complete payment with test card
4. Watch webhook events:
   ```bash
   wrangler tail --format pretty
   ```

#### Option 2: Simulate Webhook
```bash
# Use DodoPayments dashboard to send test webhooks
# Look for "Send Test Event" button in webhook settings
```

#### Verify in Database
```bash
# Check webhook events received
wrangler d1 execute edgelink-production --command \
  "SELECT event_type, processed, created_at
   FROM webhook_events
   ORDER BY created_at DESC
   LIMIT 10"

# Check payments recorded
wrangler d1 execute edgelink-production --command \
  "SELECT user_id, amount, currency, status, plan
   FROM payments
   ORDER BY created_at DESC
   LIMIT 10"

# Check user subscription status
wrangler d1 execute edgelink-production --command \
  "SELECT email, subscription_plan, subscription_status, subscription_current_period_end
   FROM users
   WHERE subscription_plan = 'pro'"
```

### Test Resend Webhook

#### Send Test Email
1. Sign up with a new account in your app
2. Check verification email sent
3. Watch logs:
   ```bash
   wrangler tail --format pretty
   ```

#### Verify Email Status
```bash
# Check email logs
wrangler d1 execute edgelink-production --command \
  "SELECT email_type, recipient_email, status, provider_message_id, sent_at
   FROM email_logs
   ORDER BY sent_at DESC
   LIMIT 10"

# Check failed/bounced emails
wrangler d1 execute edgelink-production --command \
  "SELECT email_type, recipient_email, status, error_message
   FROM email_logs
   WHERE status IN ('failed', 'bounced', 'complained')"
```

---

## Monitoring & Debugging

### Real-time Monitoring
```bash
# Watch all webhook events live
wrangler tail --format pretty

# Filter only webhook logs
wrangler tail --format pretty | grep "Webhook"
```

### View Webhook Logs
```bash
# All webhook events
wrangler d1 execute edgelink-production --command \
  "SELECT event_id, event_type, customer_id, subscription_id, processed, created_at
   FROM webhook_events
   ORDER BY created_at DESC
   LIMIT 20"

# Unprocessed webhooks (errors)
wrangler d1 execute edgelink-production --command \
  "SELECT event_id, event_type, payload
   FROM webhook_events
   WHERE processed = 0"
```

### Email Delivery Insights
```bash
# Email status breakdown
wrangler d1 execute edgelink-production --command \
  "SELECT status, COUNT(*) as count
   FROM email_logs
   GROUP BY status
   ORDER BY count DESC"

# Recent failures
wrangler d1 execute edgelink-production --command \
  "SELECT recipient_email, email_type, error_message, sent_at
   FROM email_logs
   WHERE status = 'failed'
   ORDER BY sent_at DESC
   LIMIT 10"
```

### Payment Analytics
```bash
# Total revenue
wrangler d1 execute edgelink-production --command \
  "SELECT
     currency,
     SUM(amount) as total_amount,
     COUNT(*) as payment_count
   FROM payments
   WHERE status = 'succeeded'
   GROUP BY currency"

# Failed payments (needs attention)
wrangler d1 execute edgelink-production --command \
  "SELECT user_id, amount, currency, created_at
   FROM payments
   WHERE status = 'failed'
   ORDER BY created_at DESC"
```

---

## Troubleshooting

### DodoPayments Issues

#### ❌ Webhook Not Receiving Events
**Check:**
1. Webhook URL is correct: `https://shortedbro.xyz/webhooks/dodopayments`
2. Backend is deployed: `wrangler deploy`
3. Webhook is active in DodoPayments dashboard
4. Firewall not blocking requests

**Debug:**
```bash
# Check if route is working
curl -X POST https://shortedbro.xyz/webhooks/dodopayments \
  -H "Content-Type: application/json" \
  -d '{"type":"test","data":{}}'

# Should return: {"received":true} or "Invalid signature"
```

#### ❌ "Invalid Signature" Errors
**Cause:** Webhook secret mismatch

**Fix:**
```bash
# Re-copy secret from DodoPayments dashboard
# Set it again
wrangler secret put DODO_WEBHOOK_SECRET
```

#### ❌ Events Not Processing
**Check database:**
```bash
# Find unprocessed events
wrangler d1 execute edgelink-production --command \
  "SELECT event_type, payload
   FROM webhook_events
   WHERE processed = 0"
```

**Check logs:**
```bash
wrangler tail --format pretty | grep "DodoWebhook"
```

### Resend Issues

#### ❌ Email Status Not Updating
**Possible causes:**
1. Webhook not configured in Resend
2. Message ID mismatch
3. Database not accessible

**Debug:**
```bash
# Check if email has provider_message_id
wrangler d1 execute edgelink-production --command \
  "SELECT email_type, recipient_email, provider_message_id, status
   FROM email_logs
   WHERE provider_message_id IS NULL"
```

#### ❌ High Bounce Rate
**Action:**
1. Review bounced emails:
   ```bash
   wrangler d1 execute edgelink-production --command \
     "SELECT recipient_email, error_message
      FROM email_logs
      WHERE status = 'bounced'"
   ```
2. Check if emails are hard bounces (invalid addresses)
3. Implement email validation before sending

#### ❌ Spam Complaints
**Immediate action:**
```bash
# Find complained emails
wrangler d1 execute edgelink-production --command \
  "SELECT recipient_email, email_type, sent_at
   FROM email_logs
   WHERE status = 'complained'"
```

**Long-term fix:**
- Implement unsubscribe functionality
- Add email preferences
- Review email content

---

## Event Lifecycle Examples

### DodoPayments: Successful Subscription Flow
```
1. User clicks "Upgrade to Pro"
   ↓
2. POST /api/payments/create-checkout
   ↓
3. DodoPayments checkout page
   ↓
4. User completes payment
   ↓
5. payment.processing webhook → Log status
   ↓
6. payment.succeeded webhook → Record payment
   ↓
7. subscription.active webhook → User upgraded to Pro
   ↓
8. User redirected to /billing/success
   ↓
9. Monthly: subscription.renewed → Extend subscription
```

### DodoPayments: Failed Payment Flow
```
1. Monthly renewal attempt
   ↓
2. payment.failed webhook → Record failure
   ↓
3. subscription.failed webhook → Mark as failed (grace period)
   ↓
4. User still has access until period end
   ↓
5. Period ends → subscription.expired → Downgrade to free
```

### Resend: Email Delivery Flow
```
1. User signs up
   ↓
2. EmailService.sendVerificationEmail()
   ↓
3. Email logged with status='pending'
   ↓
4. Resend returns message_id
   ↓
5. email.sent webhook → Status='sent'
   ↓
6. email.delivered webhook → Status='delivered' ✅

OR

6. email.bounced webhook → Status='bounced' ⚠️
7. Log bounce reason, consider blocking email
```

---

## Security Notes

### DodoPayments
✅ **Signature Verification Enabled**
- Uses HMAC-SHA256
- Verifies webhook authenticity
- Located at: `src/handlers/payments/webhook.ts:22`
- Prevents webhook spoofing attacks

### Resend
⚠️ **Signature Verification Optional**
- Currently logs warnings if missing
- Resend uses Svix webhooks (headers: `svix-signature`, `svix-timestamp`, `svix-id`)
- Recommended: Implement strict verification for production
- For now: Processes all events for easier testing

---

## Quick Reference

### Webhook URLs
| Service | URL | Authentication |
|---------|-----|----------------|
| DodoPayments | `https://shortedbro.xyz/webhooks/dodopayments` | HMAC-SHA256 signature |
| Resend | `https://shortedbro.xyz/webhooks/resend` | Svix signature (optional) |

### Required Secrets
```bash
wrangler secret put JWT_SECRET          # Auth
wrangler secret put RESEND_API_KEY       # Email service
wrangler secret put DODO_API_KEY         # Payment API
wrangler secret put DODO_WEBHOOK_SECRET  # Webhook verification
wrangler secret put DODO_PRODUCT_ID      # Pro plan product ID
```

### Monitoring Commands
```bash
# Real-time logs
wrangler tail --format pretty

# Webhook events
wrangler d1 execute edgelink-production --command \
  "SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 10"

# Email logs
wrangler d1 execute edgelink-production --command \
  "SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 10"

# Payments
wrangler d1 execute edgelink-production --command \
  "SELECT * FROM payments ORDER BY created_at DESC LIMIT 10"
```

---

## Support

### Documentation
- **DodoPayments Docs:** https://dodopayments.com/docs/webhooks
- **Resend Docs:** https://resend.com/docs/dashboard/webhooks/introduction
- **Cloudflare Workers:** https://developers.cloudflare.com/workers/

### Need Help?
1. Check logs: `wrangler tail --format pretty`
2. Review database: Check `webhook_events` table
3. Test locally: Use webhook testing tools (webhook.site, ngrok)
4. Contact support:
   - DodoPayments: support@dodopayments.com
   - Resend: support@resend.com

---

## ✅ Checklist

### DodoPayments Setup
- [ ] Backend deployed
- [ ] Webhook created in DodoPayments dashboard
- [ ] URL set to `https://shortedbro.xyz/webhooks/dodopayments`
- [ ] All 13 events selected
- [ ] Webhook secret copied
- [ ] Secret set: `wrangler secret put DODO_WEBHOOK_SECRET`
- [ ] Test payment completed
- [ ] Webhook events visible in logs

### Resend Setup
- [ ] Backend deployed
- [ ] Webhook created in Resend dashboard
- [ ] URL set to `https://shortedbro.xyz/webhooks/resend`
- [ ] Email events selected
- [ ] Test email sent
- [ ] Delivery status updated in database
- [ ] Webhook events visible in logs

---

**🎉 Your EdgeLink webhooks are now fully configured for real-time payment and email tracking!**
