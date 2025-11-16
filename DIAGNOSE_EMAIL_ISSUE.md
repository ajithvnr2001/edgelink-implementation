# Diagnose Email Issue - Backend Says "Sent" But Not Received

You said emails worked before but now they don't. The logs show:
```
[Signup] Verification email sent to lavender1810@2200freefonts.com
```

This means the backend code completed successfully, but you're not receiving emails. Let's diagnose why.

## Step 1: Check Email Logs in Database

This will show if Resend actually accepted the email:

```bash
cd edgelink/backend

npx wrangler d1 execute edgelink-production --command "
SELECT
  email_type,
  recipient_email,
  status,
  error_message,
  provider_message_id,
  retry_count,
  sent_at
FROM email_logs
WHERE recipient_email IN ('lavender1810@2200freefonts.com', 'orange216@2200freefonts.com')
ORDER BY sent_at DESC
LIMIT 10
" --remote
```

**What to look for:**

| provider_message_id | status | Meaning |
|---------------------|--------|---------|
| `re_xxxxxxxxx` | `sent` | ✅ Resend accepted - check Resend logs |
| `NULL` | `sent` | ❌ Resend rejected silently - API key issue |
| `NULL` | `failed` | ❌ Failed - check error_message |
| No rows | N/A | ❌ Email logging failed - check code |

## Step 2: Check Resend Dashboard

1. Go to https://resend.com/emails
2. Search for `lavender1810@2200freefonts.com`
3. Check email status:
   - **Delivered** ✅ → Check spam folder
   - **Bounced** ❌ → Invalid email address
   - **Not found** ❌ → Email never reached Resend (API key issue)

## Step 3: Verify RESEND_API_KEY is Set

```bash
cd edgelink/backend

# List all secrets
npx wrangler secret list

# Should show RESEND_API_KEY
```

**If RESEND_API_KEY is missing:**
```bash
npx wrangler secret put RESEND_API_KEY
# Paste your API key from https://resend.com/api-keys

npx wrangler deploy
```

## Step 4: Check Resend Domain Status

1. Go to https://resend.com/domains
2. Check `go.shortedbro.xyz` status
3. Must show: **Verified** ✅

**If not verified:**
- Click the domain
- Add/update DNS records in Cloudflare
- Wait 1-2 minutes and click "Verify"

## Step 5: Test Resend API Directly

Get your API key from https://resend.com/api-keys and test:

```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer re_YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "EdgeLink <noreply@go.shortedbro.xyz>",
    "to": "lavender1810@2200freefonts.com",
    "subject": "Direct API Test",
    "html": "<p>This is a direct test from Resend API</p>"
  }'
```

**Expected success:**
```json
{
  "id": "re_xxxxxx"
}
```

**Common errors:**
```json
{"statusCode":401,"message":"Missing API key"}
// Fix: Set RESEND_API_KEY

{"statusCode":403,"message":"Domain not verified"}
// Fix: Verify go.shortedbro.xyz in Resend dashboard

{"statusCode":422,"message":"Invalid 'to' address"}
// Fix: Use valid email address
```

## Step 6: Check Worker Logs in Real-Time

Run this in one terminal:
```bash
cd edgelink/backend
npx wrangler tail --format pretty
```

Then in another terminal, trigger signup:
```bash
curl -X POST https://go.shortedbro.xyz/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test123@gmail.com","password":"Test1234!"}'
```

**Look for in logs:**
- `[Signup] Verification email sent` ✅ Email service succeeded
- `[Signup] Failed to send verification email:` ❌ Shows error details
- `[EmailService] Rate limited (429)` ❌ Too many emails
- `[EmailService] Client error (401)` ❌ Invalid API key
- `[EmailService] Client error (403)` ❌ Domain not verified

## Step 7: Check Resend Account Status

1. Go to https://resend.com/settings
2. Check account status
3. Verify:
   - Account is active (not suspended)
   - Sending quota not exceeded
   - No billing issues

## Most Likely Causes (In Order)

### 1. RESEND_API_KEY Not Set ⭐ MOST LIKELY
**Symptoms:**
- Logs show "email sent"
- email_logs has `provider_message_id = NULL`
- No emails in Resend dashboard

**Fix:**
```bash
cd edgelink/backend
npx wrangler secret put RESEND_API_KEY
# Paste: re_xxxxxxxxxxxxxxxxx
npx wrangler deploy
```

### 2. Domain Not Verified in Resend
**Symptoms:**
- Resend returns 403 error
- email_logs shows status='failed' with "Domain not verified"

**Fix:**
1. Go to https://resend.com/domains
2. Verify `go.shortedbro.xyz`
3. Add DNS records shown in Cloudflare

### 3. Invalid API Key
**Symptoms:**
- 401 Unauthorized errors
- email_logs shows "Missing API key" or "Invalid API key"

**Fix:**
1. Generate new API key at https://resend.com/api-keys
2. Set it: `npx wrangler secret put RESEND_API_KEY`

### 4. Rate Limit Exceeded
**Symptoms:**
- 429 errors in logs
- email_logs shows status='rate_limited'

**Fix:**
- Wait a few minutes
- Check Resend dashboard for sending limits

### 5. Email Address Invalid
**Symptoms:**
- Emails bounce in Resend dashboard
- email_logs shows status='bounced' (from webhook)

**Fix:**
- Use real email address for testing
- Check for typos

## Quick Diagnostic Script

Run all checks at once:

```bash
cd edgelink/backend

echo "=== 1. Checking Secrets ==="
npx wrangler secret list

echo ""
echo "=== 2. Checking Email Logs ==="
npx wrangler d1 execute edgelink-production --command "
  SELECT email_type, recipient_email, status, error_message, provider_message_id
  FROM email_logs
  ORDER BY sent_at DESC
  LIMIT 5
" --remote

echo ""
echo "=== 3. Testing Signup ==="
curl -X POST https://go.shortedbro.xyz/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"diagnostictest@gmail.com","password":"Test1234!"}'

echo ""
echo "=== 4. Checking Recent Email Logs ==="
sleep 2
npx wrangler d1 execute edgelink-production --command "
  SELECT * FROM email_logs WHERE recipient_email = 'diagnostictest@gmail.com'
" --remote
```

## After You Find The Issue

Once you identify the problem from the diagnostics above, **reply with**:

1. Output of `npx wrangler secret list`
2. Output of the email_logs query (Step 1)
3. Status from Resend dashboard (Step 2)
4. Any errors from worker logs (Step 6)

Then I can give you the exact fix!

---

## Emergency Fix (Reset Everything)

If all else fails, reset the entire email system:

```bash
cd edgelink/backend

# 1. Delete old API key secret
npx wrangler secret delete RESEND_API_KEY

# 2. Generate NEW API key at https://resend.com/api-keys

# 3. Set new key
npx wrangler secret put RESEND_API_KEY
# Paste new key

# 4. Re-verify domain
# Go to https://resend.com/domains
# Remove and re-add go.shortedbro.xyz

# 5. Redeploy
npx wrangler deploy

# 6. Test
curl -X POST https://go.shortedbro.xyz/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"fresh-test@gmail.com","password":"Test1234!"}'
```

This will completely reset your email configuration and should fix most issues.
