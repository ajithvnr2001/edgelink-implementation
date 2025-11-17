#!/bin/bash
# Script to add DodoPayments secrets to Cloudflare Workers
# Run this after getting credentials from DodoPayments

echo "🔐 Adding DodoPayments Secrets to Cloudflare Workers"
echo "=================================================="
echo ""
echo "You'll be prompted to enter each secret value."
echo "Paste the value and press Enter."
echo ""

# Add DODO_API_KEY
echo "1️⃣  Adding DODO_API_KEY..."
echo "   Format: dodo_sk_live_abc123xyz456..."
npx wrangler secret put DODO_API_KEY --env production
echo ""

# Add DODO_WEBHOOK_SECRET
echo "2️⃣  Adding DODO_WEBHOOK_SECRET..."
echo "   Format: whsec_abc123xyz456..."
npx wrangler secret put DODO_WEBHOOK_SECRET --env production
echo ""

# Add DODO_PRODUCT_ID
echo "3️⃣  Adding DODO_PRODUCT_ID..."
echo "   Format: prod_abc123xyz456"
npx wrangler secret put DODO_PRODUCT_ID --env production
echo ""

echo "✅ All secrets added successfully!"
echo ""
echo "Next steps:"
echo "1. Deploy backend: npm run deploy (or git push to trigger GitHub Actions)"
echo "2. Test webhook: Make a test payment in DodoPayments"
echo "3. Check webhook logs: npx wrangler tail --env production"
