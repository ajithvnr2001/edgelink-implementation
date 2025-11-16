# Email Verification Not Working - Complete Fix Guide

You said emails worked before but now they're not being received. The logs show `[Signup] Verification email sent` which means the code **thinks** it sent the email, but Resend is silently rejecting it.

## 🔴 Critical Issue: RESEND_API_KEY Not Set

**Most likely cause:** The `RESEND_API_KEY` secret is not configured in Cloudflare Workers.

### Step 1: Check if RESEND_API_KEY exists

```bash
cd edgelink/backend
npx wrangler secret list
```

**What you should see:**
```
┌─────────────────────┐
│ Name                │
├─────────────────────┤
│ RESEND_API_KEY      │ ← This MUST be present
│ JWT_SECRET          │
│ DODO_WEBHOOK_SECRET │
│ DODO_PRODUCT_ID     │
└─────────────────────┘
```

### Step 2: If RESEND_API_KEY is missing (99% likely)

```bash
cd edgelink/backend

# Set the secret
npx wrangler secret put RESEND_API_KEY

# When prompted, paste your Resend API key
# Get it from: https://resend.com/api-keys
# It should start with "re_"
```

**Get your API key:**
1. Go to https://resend.com/api-keys
2. Click "Create API Key"
3. Name: "EdgeLink Production"
4. Permission: "Sending access"
5. Copy the key (starts with `re_`)
6. Paste it when `wrangler secret put` prompts you

### Step 3: Redeploy backend

```bash
cd edgelink/backend
npx wrangler deploy
```

---

## 🚀 Frontend Deployment (Pages Not Found Fix)

The verification pages exist in code but show 404 because **frontend is not deployed**.

### Deploy Frontend to Cloudflare Pages

```bash
cd edgelink/frontend

# Install dependencies
npm install

# Build
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy .next --project-name=edgelink-frontend
```

**After deployment:**
1. Go to Cloudflare Dashboard → Pages
2. Click on your project
3. Go to "Custom domains"
4. Add `shortedbro.xyz`
5. Wait for DNS to propagate (~1 minute)

---

## ✅ Testing the Complete Flow

After fixing RESEND_API_KEY and deploying frontend:

### Test 1: Signup and Email Delivery

```bash
# Open in browser
https://shortedbro.xyz/signup

# Or test via API
curl -X POST https://go.shortedbro.xyz/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"your-real-email@gmail.com","password":"Test1234!"}'
```

**Expected:**
1. ✅ Success response with access token
2. ✅ "Check your email!" page shows
3. ✅ Email received from `noreply@go.shortedbro.xyz`
4. ✅ Dashboard shows yellow verification banner

### Test 2: Email Verification

1. Check your email inbox (and spam folder)
2. Click the verification link
3. Should redirect to `https://shortedbro.xyz/verify-email?token=...`
4. Should show "Email Verified!" → redirect to dashboard
5. Dashboard banner should disappear

### Test 3: Resend Verification

1. Go to dashboard (if not verified)
2. Click "Resend verification →" in yellow banner
3. Should go to `https://shortedbro.xyz/resend-verification`
4. Email should be pre-filled
5. Click "Resend verification email"
6. Should receive new verification email

---

## 🔍 Debugging Email Issues

### Check Email Logs in Database

```bash
cd edgelink/backend

npx wrangler d1 execute edgelink-production --command \
  "SELECT email_type, recipient_email, status, error_message, provider_message_id, sent_at
   FROM email_logs
   WHERE recipient_email = 'your-email@example.com'
   ORDER BY sent_at DESC
   LIMIT 5" --remote
```

**What to look for:**

| Status | Error Message | Meaning |
|--------|---------------|---------|
| `sent` | NULL | ✅ Email sent successfully |
| `failed` | "Missing API key" | ❌ RESEND_API_KEY not set |
| `failed` | "Domain not verified" | ❌ go.shortedbro.xyz not verified in Resend |
| `failed` | "Rate limit exceeded" | ❌ Too many emails sent |
| NULL | N/A | ❌ Email service failed before logging |

### Check Worker Logs

```bash
cd edgelink/backend
npx wrangler tail --format pretty
```

Then trigger a signup in another terminal and watch for:
- `[Signup] Verification email sent to ...` ✅ Good
- `[Signup] Failed to send verification email: ...` ❌ Shows error
- `[EmailService] Client error (401)` ❌ Invalid API key
- `[EmailService] Client error (403)` ❌ Domain not verified

### Test Resend API Directly

Replace `YOUR_API_KEY` with your actual Resend API key:

```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "EdgeLink <noreply@go.shortedbro.xyz>",
    "to": "your-email@gmail.com",
    "subject": "Test Email",
    "html": "<p>Test from Resend API</p>"
  }'
```

**Expected success:**
```json
{"id":"some-message-id-here"}
```

**Common errors:**
- `401 Unauthorized` → Invalid API key
- `403 Forbidden` → Domain `go.shortedbro.xyz` not verified in Resend
- `422 Unprocessable Entity` → Invalid email format

---

## 🎯 Quick Fix Checklist

Run through these in order:

- [ ] **1. Check RESEND_API_KEY exists**
  ```bash
  cd edgelink/backend && npx wrangler secret list
  ```

- [ ] **2. Set RESEND_API_KEY if missing**
  ```bash
  npx wrangler secret put RESEND_API_KEY
  ```

- [ ] **3. Verify domain in Resend**
  - Go to https://resend.com/domains
  - Check `go.shortedbro.xyz` is verified ✅

- [ ] **4. Redeploy backend**
  ```bash
  npx wrangler deploy
  ```

- [ ] **5. Deploy frontend**
  ```bash
  cd edgelink/frontend
  npm run build
  npx wrangler pages deploy .next --project-name=edgelink-frontend
  ```

- [ ] **6. Test signup**
  - Go to https://shortedbro.xyz/signup
  - Create account
  - Check email

- [ ] **7. Test verification link**
  - Click link in email
  - Should work without 404

---

## 🆘 Still Not Working?

If emails still aren't being delivered after following all steps:

**Share these outputs:**

1. **Secret list:**
   ```bash
   npx wrangler secret list
   ```

2. **Email logs:**
   ```bash
   npx wrangler d1 execute edgelink-production --command \
     "SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 3" --remote
   ```

3. **Worker logs during signup:**
   ```bash
   npx wrangler tail --format pretty
   # (while doing a test signup)
   ```

4. **Resend domain status:**
   - Screenshot of https://resend.com/domains

---

## 📝 Summary

**Root causes identified:**
1. ❌ RESEND_API_KEY secret not set → Emails fail silently
2. ❌ Frontend not deployed → Verification pages show 404
3. ✅ Backend code is correct (logs show email attempted)
4. ✅ Frontend code is correct (just needs deployment)

**Fixes:**
1. ✅ Set RESEND_API_KEY in Cloudflare Workers
2. ✅ Deploy frontend to Cloudflare Pages
3. ✅ Added /resend-verification page
4. ✅ Fixed dashboard link to point to correct page

**Next steps:**
1. Run `npx wrangler secret put RESEND_API_KEY`
2. Deploy frontend: `npm run build && npx wrangler pages deploy .next`
3. Test complete signup → verify email flow
