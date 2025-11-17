# DodoPayments Credentials Checklist ✅

Use this checklist to collect all required credentials from DodoPayments.

---

## Required Credentials

### 1. API Key (Secret Key)
```
Where to find: Settings → API Keys → Live Secret Key
Format: dodo_sk_live_abc123xyz456...
```
**Your API Key:**
```
DODO_API_KEY=_______________________________________
```

---

### 2. Webhook Secret (Signing Secret)
```
Where to find: Settings → Webhooks → Your Webhook → Signing Secret
Format: whsec_abc123xyz456...
```
**Your Webhook Secret:**
```
DODO_WEBHOOK_SECRET=_______________________________________
```

---

### 3. Product ID
```
Where to find: Products → EdgeLink Pro → Product ID
Format: prod_abc123xyz456
```
**Your Product ID:**
```
DODO_PRODUCT_ID=_______________________________________
```

---

## Verification Checklist

Before proceeding, verify:

- [ ] Created DodoPayments account
- [ ] Email verified
- [ ] Created product "EdgeLink Pro" at $9/month
- [ ] Copied Product ID
- [ ] Found and copied API Key (Secret Key)
- [ ] Created webhook at `https://go.shortedbro.xyz/webhooks/dodopayments`
- [ ] Selected all payment, subscription, and refund events
- [ ] Copied Webhook Secret (Signing Secret)
- [ ] All 3 credentials saved securely

---

## What to Do Next

Once you have all 3 credentials:

1. **Run the setup script:**
   ```bash
   cd edgelink/backend
   ./add-payment-secrets.sh
   ```

2. **Or add manually:**
   ```bash
   npx wrangler secret put DODO_API_KEY --env production
   npx wrangler secret put DODO_WEBHOOK_SECRET --env production
   npx wrangler secret put DODO_PRODUCT_ID --env production
   ```

3. **Verify secrets were added:**
   ```bash
   npx wrangler secret list --env production
   ```

4. **Let me know!** Then I'll create the frontend payment pages.

---

## Optional: Test Mode Setup

For testing before going live, also collect test credentials:

```
DODO_API_KEY (test): dodo_sk_test_...
DODO_WEBHOOK_SECRET (test): whsec_test_...
DODO_PRODUCT_ID (test): prod_test_...
```

You can add these later to test the integration safely.
