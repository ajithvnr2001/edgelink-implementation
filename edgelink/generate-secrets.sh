#!/bin/bash

###############################################################################
# Generate Production Secrets for EdgeLink
# This script generates cryptographically secure secrets for production use
###############################################################################

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}EdgeLink Production Secrets Generator${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} openssl not found. Using alternative method..."
    JWT_SECRET=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)
    REFRESH_TOKEN_SECRET=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 64 | head -n 1)
else
    # Generate 64-character base64 secrets
    JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
    REFRESH_TOKEN_SECRET=$(openssl rand -base64 48 | tr -d '\n')
fi

echo -e "${GREEN}✓${NC} Generated secure secrets"
echo ""
echo -e "${YELLOW}⚠ IMPORTANT: Save these secrets in a secure location!${NC}"
echo -e "${YELLOW}   Do NOT commit these to Git or share publicly.${NC}"
echo ""
echo "=================================================="
echo "JWT_SECRET:"
echo "$JWT_SECRET"
echo ""
echo "REFRESH_TOKEN_SECRET:"
echo "$REFRESH_TOKEN_SECRET"
echo "=================================================="
echo ""

# Create .secrets file (gitignored)
cat > .secrets << EOF
# EdgeLink Production Secrets
# Generated on: $(date)
# DO NOT COMMIT THIS FILE TO GIT!

JWT_SECRET=$JWT_SECRET
REFRESH_TOKEN_SECRET=$REFRESH_TOKEN_SECRET
EOF

echo -e "${GREEN}✓${NC} Secrets saved to .secrets file (gitignored)"
echo ""

# Offer to set secrets in Wrangler
echo -e "${BLUE}Would you like to set these secrets in Cloudflare now?${NC}"
read -p "Set secrets via Wrangler? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd backend || exit 1

    echo ""
    echo -e "${BLUE}Setting JWT_SECRET...${NC}"
    echo "$JWT_SECRET" | wrangler secret put JWT_SECRET --env production

    echo ""
    echo -e "${BLUE}Setting REFRESH_TOKEN_SECRET...${NC}"
    echo "$REFRESH_TOKEN_SECRET" | wrangler secret put REFRESH_TOKEN_SECRET --env production

    echo ""
    echo -e "${GREEN}✓${NC} Secrets set in Cloudflare!"

    # Verify
    echo ""
    echo -e "${BLUE}Verifying secrets...${NC}"
    wrangler secret list --env production

    cd ..
else
    echo ""
    echo -e "${YELLOW}Skipped setting secrets.${NC}"
    echo "To set them manually later, run:"
    echo "  cd backend"
    echo "  wrangler secret put JWT_SECRET --env production"
    echo "  wrangler secret put REFRESH_TOKEN_SECRET --env production"
fi

echo ""
echo -e "${GREEN}✓${NC} Done!"
echo ""
echo -e "${YELLOW}Remember to:${NC}"
echo "  1. Store secrets in your password manager"
echo "  2. Keep .secrets file secure (it's gitignored)"
echo "  3. Never share or commit these secrets"
echo ""
