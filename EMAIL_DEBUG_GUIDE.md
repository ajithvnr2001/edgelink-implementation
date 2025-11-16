# Email Debugging Guide

Your signup works but verification emails aren't being received. Follow these steps to diagnose the issue.

## Step 1: Check if RESEND_API_KEY is configured

```bash
cd edgelink/backend
npx wrangler secret list
```

**Expected output:** Should show `RESEND_API_KEY` in the list

**If missing:** Set it now:
```bash
npx wrangler secret put RESEND_API_KEY
# Paste your Resend API key when prompted (starts with re_)
```

Get your API key from: https://resend.com/api-keys

---

## Step 2: Check email_logs table

```bash
cd edgelink/backend
npx wrangler d1 execute edgelink-production --command "SELECT email_type, recipient_email, status, error_message, provider_message_id, sent_at FROM email_logs WHERE recipient_email = 'emailfortv9@gmail.com' ORDER BY sent_at DESC" --remote
```

**Possible outcomes:**

### A) No rows returned
- **Cause:** Email service completely failed before logging
- **Fix:** RESEND_API_KEY is likely missing or invalid

### B) Rows with status='failed'
- **Cause:** Resend API rejected the email
- Check `error_message` column for details
- Common issues:
  - Invalid API key
  - Email domain not verified in Resend
  - Rate limit exceeded

### C) Rows with status='sent' or 'delivered'
- **Cause:** Email was sent successfully
- **Fix:** Check spam folder or email provider is blocking

---

## Step 3: Check worker logs in real-time

```bash
cd edgelink/backend
npx wrangler tail --format pretty
```

Then in another terminal, trigger a new signup:
```bash
curl -X POST https://go.shortedbro.xyz/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'
```

**Look for:**
- `[Signup] Verification email sent to ...` (success)
- `[Signup] Failed to send verification email:` (error with details)
- `[EmailService]` logs showing what went wrong

---

## Step 4: Verify Resend domain configuration

1. Go to https://resend.com/domains
2. Check if `shortedbro.xyz` is added and verified
3. Verify DNS records are correct:
   - SPF record
   - DKIM records
   - Return-Path record (optional)

**If domain not verified:**
- Emails won't send from `noreply@shortedbro.xyz`
- Add and verify the domain in Resend dashboard

---

## Step 5: Test Resend API directly

```bash
# Replace YOUR_API_KEY with your actual Resend API key
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "EdgeLink <noreply@shortedbro.xyz>",
    "to": "emailfortv9@gmail.com",
    "subject": "Test Email",
    "html": "<p>This is a test email</p>"
  }'
```

**Expected response:**
```json
{"id":"<some-message-id>"}
```

**If error:**
- Check the error message
- Common errors:
  - `401 Unauthorized` → Invalid API key
  - `403 Forbidden` → Domain not verified
  - `422 Unprocessable Entity` → Invalid email format

---

## Step 6: Common Fixes

### Fix 1: Set RESEND_API_KEY
```bash
cd edgelink/backend
npx wrangler secret put RESEND_API_KEY
# Paste: re_xxxxxxxxxxxxxxxx
```

### Fix 2: Verify domain in Resend
1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter: `shortedbro.xyz`
4. Add the DNS records shown to your Cloudflare DNS

### Fix 3: Redeploy backend
```bash
cd edgelink/backend
npx wrangler deploy
```

---

## Expected Working Flow

When everything works correctly:

1. User signs up → User created in database
2. Verification token generated → Stored in `verification_tokens` table
3. Email sent via Resend → Logged in `email_logs` with status='sent'
4. Resend webhook updates status → Changes to 'delivered'
5. User receives email → Clicks verification link
6. Email verified → `email_verified` set to TRUE

---

## Quick Checklist

- [ ] RESEND_API_KEY secret is set
- [ ] Domain `shortedbro.xyz` is verified in Resend
- [ ] DNS records for email (SPF, DKIM) are configured
- [ ] Resend API test (curl) works successfully
- [ ] Worker logs show `[Signup] Verification email sent`
- [ ] email_logs table shows status='sent' or 'delivered'
- [ ] Backend redeployed after setting secrets

---

## Still Not Working?

Run all checks and provide me with:

1. Output of: `npx wrangler secret list`
2. Output of: Email logs query (Step 2)
3. Output of: Worker logs during signup (Step 3)
4. Screenshot of Resend domain verification status

This will help me identify the exact issue.
