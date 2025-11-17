# DodoPayments Setup Guide for EdgeLink

This guide will walk you through setting up DodoPayments for EdgeLink's Pro subscription ($9/month).

---

## Step 1: Create DodoPayments Account

1. **Sign Up**
   - Go to: https://dodopayments.com
   - Click "Sign Up" or "Get Started"
   - Create your account with your email

2. **Complete Account Setup**
   - Verify your email
   - Complete business information
   - Connect your bank account (for payouts)

---

## Step 2: Create Product

1. **Navigate to Products**
   - In DodoPayments dashboard, go to **Products** section
   - Click **"Create Product"** or **"New Product"**

2. **Configure Product Details**
   ```
   Product Name: EdgeLink Pro
   Description: EdgeLink Pro Plan - Advanced URL shortening with analytics
   Type: Recurring/Subscription
   Billing Period: Monthly
   Price: $9.00 USD
   Currency: USD
   ```

3. **Save and Copy Product ID**
   - After saving, you'll see a product ID like: `prod_abc123xyz456`
   - **COPY THIS** - you'll need it later
   - Save it somewhere safe (e.g., notepad)

---

## Step 3: Get API Credentials

1. **Navigate to API Settings**
   - Go to **Settings** → **API Keys** or **Developers** section
   - You should see your API keys

2. **Get API Key**
   - Look for **"Live API Key"** or **"Secret Key"**
   - Format: `dodo_sk_live_abc123xyz456...`
   - **COPY THIS** - keep it secret!
   - ⚠️ **NEVER share this publicly or commit to git**

3. **Note the API Base URL**
   - Usually: `https://api.dodopayments.com/v1`
   - Or check their documentation for the correct URL

---

## Step 4: Configure Webhook

1. **Navigate to Webhooks**
   - Go to **Settings** → **Webhooks** or **Developers** → **Webhooks**
   - Click **"Add Webhook"** or **"Create Webhook Endpoint"**

2. **Configure Webhook URL**
   ```
   Webhook URL: https://go.shortedbro.xyz/webhooks/dodopayments
   Description: EdgeLink Production Webhook
   ```

3. **Select Events to Listen**
   Select ALL of these events (check all boxes):

   **Payment Events:**
   - ✅ `payment.succeeded`
   - ✅ `payment.failed`
   - ✅ `payment.processing`
   - ✅ `payment.cancelled`

   **Subscription Events:**
   - ✅ `subscription.active`
   - ✅ `subscription.renewed`
   - ✅ `subscription.cancelled`
   - ✅ `subscription.expired`
   - ✅ `subscription.failed`
   - ✅ `subscription.on_hold`
   - ✅ `subscription.plan_changed`

   **Refund Events:**
   - ✅ `refund.succeeded`
   - ✅ `refund.failed`

4. **Save and Get Webhook Secret**
   - After saving, you'll see a **Webhook Signing Secret**
   - Format: `whsec_abc123xyz456...`
   - **COPY THIS** - you'll need it to verify webhooks

---

## Step 5: Test Mode (Optional but Recommended)

1. **Enable Test Mode**
   - Most payment providers have a "Test Mode" toggle
   - Switch to test mode first to test the integration

2. **Get Test Credentials**
   - Test API Key: `dodo_sk_test_...`
   - Test Product ID: Create a test product
   - Test Webhook Secret: Configure test webhook

3. **Test Cards**
   - DodoPayments usually provides test card numbers
   - Example: `4242 4242 4242 4242` (Visa success)
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)

---

## Step 6: Collect Your Credentials

By now, you should have these 3 values:

```bash
# Production credentials:
DODO_API_KEY=dodo_sk_live_abc123xyz456...
DODO_WEBHOOK_SECRET=whsec_abc123xyz456...
DODO_PRODUCT_ID=prod_abc123xyz456

# Optional: Test credentials (for testing before going live)
DODO_API_KEY=dodo_sk_test_abc123xyz456...
DODO_WEBHOOK_SECRET=whsec_test_abc123xyz456...
DODO_PRODUCT_ID=prod_test_abc123xyz456
```

---

## Step 7: Add Secrets to Cloudflare Workers

Once you have the credentials, I'll help you add them to Cloudflare Workers using these commands:

```bash
# Navigate to backend directory
cd edgelink/backend

# Add each secret (you'll be prompted to paste the value)
npx wrangler secret put DODO_API_KEY --env production
npx wrangler secret put DODO_WEBHOOK_SECRET --env production
npx wrangler secret put DODO_PRODUCT_ID --env production
```

---

## Troubleshooting

### Can't find Product ID?
- Go to Products → Click on your product → Look for "Product ID" or "ID" field
- Sometimes it's in the URL: `/products/prod_abc123...`

### Can't find API Key?
- Settings → API Keys → Look for "Secret Key" or "Live API Key"
- You may need to click "Reveal" to see the full key

### Can't find Webhook Secret?
- Settings → Webhooks → Click on your webhook
- Look for "Signing Secret" or "Webhook Secret"
- You may need to click "Reveal" or "Show Secret"

### Webhook not receiving events?
- Check webhook URL is exactly: `https://go.shortedbro.xyz/webhooks/dodopayments`
- Check all events are selected
- Check webhook is enabled/active
- Test with a test payment

---

## Next Steps

After completing this setup:

1. ✅ **Provide me with the 3 credentials** (via private message, NOT in chat!)
2. ✅ I'll add them to Cloudflare Workers secrets
3. ✅ I'll create the frontend pages (pricing, billing, checkout)
4. ✅ We'll test the complete payment flow
5. ✅ Launch! 🚀

---

## Security Notes

⚠️ **IMPORTANT:**
- **NEVER** commit API keys or secrets to git
- **NEVER** share them publicly
- Store them securely (password manager recommended)
- Rotate them if accidentally exposed
- Use test mode keys for development/testing

---

## Support

If you get stuck:
- Check DodoPayments documentation
- Contact DodoPayments support
- Let me know which step is confusing and I'll help!
