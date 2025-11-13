# Backend Secrets Setup Guide

This guide explains how to set up all required secrets for the EdgeLink backend (Cloudflare Workers).

## 🔑 Required Secrets

### 1. Clerk Authentication Secrets (REQUIRED)

#### CLERK_SECRET_KEY
- **Description:** Clerk secret key for verifying session tokens
- **Get it from:** https://dashboard.clerk.com → API Keys
- **Format:** `sk_test_...` (development) or `sk_live_...` (production)
- **Command:**
  ```bash
  wrangler secret put CLERK_SECRET_KEY
  ```

#### CLERK_WEBHOOK_SECRET
- **Description:** Clerk webhook signing secret for verifying webhook requests
- **Get it from:** https://dashboard.clerk.com → Webhooks → Your Endpoint → Signing Secret
- **Format:** `whsec_...`
- **Command:**
  ```bash
  wrangler secret put CLERK_WEBHOOK_SECRET
  ```

### 2. JWT Secret (Legacy - for API Keys)

#### JWT_SECRET
- **Description:** Secret key for signing/verifying JWT tokens (maintained for API key authentication)
- **Generate:** Any strong random string (64+ characters)
- **Command:**
  ```bash
  wrangler secret put JWT_SECRET
  ```

### 3. Cloudflare API Credentials (Optional - for Custom Domains)

#### CF_ZONE_ID
- **Description:** Cloudflare Zone ID for shortedbro.xyz
- **Get it from:** Cloudflare Dashboard → shortedbro.xyz → Overview (right sidebar)
- **Command:**
  ```bash
  wrangler secret put CF_ZONE_ID
  ```

#### CF_API_TOKEN
- **Description:** Cloudflare API token with permissions for custom hostnames
- **Permissions needed:**
  - Zone.SSL and Certificates:Edit
  - Zone.Custom Hostnames:Edit
- **Get it from:** Cloudflare Dashboard → My Profile → API Tokens → Create Token
- **Command:**
  ```bash
  wrangler secret put CF_API_TOKEN
  ```

---

## 📝 Setup Steps

### For Development

```bash
cd edgelink/backend

# Required for Clerk
wrangler secret put CLERK_SECRET_KEY
# Paste: sk_test_your_test_key_here

wrangler secret put CLERK_WEBHOOK_SECRET
# Paste: whsec_your_webhook_secret_here

# Required for API keys (legacy auth)
wrangler secret put JWT_SECRET
# Paste: any strong random string (64+ chars)

# Optional for custom domains
wrangler secret put CF_ZONE_ID
wrangler secret put CF_API_TOKEN
```

### For Production

```bash
cd edgelink/backend

# Required for Clerk (use LIVE keys)
wrangler secret put CLERK_SECRET_KEY --env production
# Paste: sk_live_your_production_key_here

wrangler secret put CLERK_WEBHOOK_SECRET --env production
# Paste: whsec_your_production_webhook_secret_here

# Required for API keys
wrangler secret put JWT_SECRET --env production

# Optional for custom domains
wrangler secret put CF_ZONE_ID --env production
wrangler secret put CF_API_TOKEN --env production
```

---

## 🔍 Verifying Secrets

To check which secrets are set:

```bash
# Development
wrangler secret list

# Production
wrangler secret list --env production
```

---

## 🔄 Updating Secrets

To update an existing secret, use the same command:

```bash
wrangler secret put CLERK_SECRET_KEY
```

---

## ⚠️ Important Notes

1. **Never commit secrets to git** - Secrets are stored in Cloudflare's infrastructure
2. **Use different keys for dev/prod** - Test keys for development, live keys for production
3. **Webhook secret changes** - If you regenerate webhook secret in Clerk, update it here
4. **Rotate regularly** - Best practice to rotate secrets periodically

---

## 🎯 Quick Reference

| Secret | Required | Where to Get |
|--------|----------|-------------|
| `CLERK_SECRET_KEY` | ✅ Yes | Clerk Dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | ✅ Yes | Clerk Dashboard → Webhooks → Signing Secret |
| `JWT_SECRET` | ✅ Yes | Generate random string |
| `CF_ZONE_ID` | ⚠️ Optional | Cloudflare Dashboard → Zone Overview |
| `CF_API_TOKEN` | ⚠️ Optional | Cloudflare Dashboard → API Tokens |

---

## 📚 More Information

- [Clerk Documentation](https://clerk.com/docs)
- [Wrangler Secrets Documentation](https://developers.cloudflare.com/workers/wrangler/commands/#secret)
- [Cloudflare API Tokens](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
