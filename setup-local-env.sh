#!/bin/bash

# Setup Local Development Environment for EdgeLink
# This script creates the .env.local file needed for local development

echo "🔧 Setting up EdgeLink local development environment..."
echo ""

# Create .env.local for frontend
ENV_FILE="edgelink/frontend/.env.local"

if [ -f "$ENV_FILE" ]; then
    echo "⚠️  .env.local already exists."
    read -p "Do you want to overwrite it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping .env.local creation."
        exit 0
    fi
fi

echo "📝 Creating .env.local..."

cat > "$ENV_FILE" << 'EOF'
# EdgeLink Frontend - Local Development Environment Variables
# This file is for local development only

# Backend API URL - Local development
NEXT_PUBLIC_API_URL=http://localhost:8787

# Frontend URL - Local development
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000

# Environment
NEXT_PUBLIC_ENVIRONMENT=development

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_AB_TESTING=true
NEXT_PUBLIC_ENABLE_WEBHOOKS=true
NEXT_PUBLIC_ENABLE_TEAMS=true
NEXT_PUBLIC_ENABLE_ACCOUNT_DELETION=true

# Debug mode
NEXT_PUBLIC_DEBUG=true

# Short URL domain (local development)
NEXT_PUBLIC_SHORT_URL_DOMAIN=localhost:8787

# Rate limiting display
NEXT_PUBLIC_RATE_LIMIT=100
NEXT_PUBLIC_RATE_LIMIT_WINDOW=60
EOF

echo "✅ Created $ENV_FILE"
echo ""
echo "Next steps:"
echo "1. Make sure wrangler is installed: npm install -g wrangler"
echo "2. Login to wrangler: wrangler login"
echo "3. Set JWT secrets:"
echo "   cd edgelink/backend"
echo "   wrangler secret put JWT_SECRET"
echo "   wrangler secret put REFRESH_TOKEN_SECRET"
echo "4. Initialize database:"
echo "   wrangler d1 execute edgelink-production --file=./schema.sql --local"
echo "5. Start development:"
echo "   ./start-dev.sh"
echo ""
echo "📖 For more details, see LOCAL_DEVELOPMENT_GUIDE.md"
