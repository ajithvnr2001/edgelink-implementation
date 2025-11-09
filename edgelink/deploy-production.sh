#!/bin/bash

###############################################################################
# EdgeLink Production Deployment Script
# This script guides you through deploying EdgeLink to Cloudflare production
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# Check if running from project root
if [ ! -f "PROD_DEPLOYMENT.md" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_header "EdgeLink Production Deployment"

# Step 1: Check prerequisites
print_header "Step 1: Checking Prerequisites"

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js v18 or higher."
    exit 1
fi
NODE_VERSION=$(node --version)
print_success "Node.js installed: $NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed."
    exit 1
fi
NPM_VERSION=$(npm --version)
print_success "npm installed: $NPM_VERSION"

# Check Wrangler
if ! command -v wrangler &> /dev/null; then
    print_error "Wrangler is not installed. Installing..."
    npm install -g wrangler
fi
WRANGLER_VERSION=$(wrangler --version | head -n1)
print_success "Wrangler installed: $WRANGLER_VERSION"

# Check Git
if ! command -v git &> /dev/null; then
    print_error "Git is not installed."
    exit 1
fi
print_success "Git installed"

# Step 2: Authentication
print_header "Step 2: Cloudflare Authentication"

print_info "Checking Cloudflare authentication status..."
if wrangler whoami &> /dev/null; then
    print_success "Already authenticated with Cloudflare"
    wrangler whoami
else
    print_warning "Not authenticated with Cloudflare"
    print_info "Please authenticate with Cloudflare..."
    print_info "This will open a browser window for you to log in."
    read -p "Press Enter to continue..."

    wrangler login

    if wrangler whoami &> /dev/null; then
        print_success "Successfully authenticated with Cloudflare"
    else
        print_error "Authentication failed. Please try again."
        exit 1
    fi
fi

# Step 3: Install dependencies
print_header "Step 3: Installing Dependencies"

print_info "Installing backend dependencies..."
cd backend
npm ci --production
print_success "Backend dependencies installed"

cd ../frontend
print_info "Installing frontend dependencies..."
npm ci --production
print_success "Frontend dependencies installed"

cd ..

# Step 4: Create production D1 database
print_header "Step 4: Creating Production Database"

print_warning "About to create production D1 database..."
print_info "Database name: edgelink-production"
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Skipping database creation. You can create it manually later."
else
    cd backend
    print_info "Creating D1 database..."

    DB_OUTPUT=$(wrangler d1 create edgelink-production 2>&1)
    echo "$DB_OUTPUT"

    # Extract database ID from output
    DB_ID=$(echo "$DB_OUTPUT" | grep "database_id" | awk '{print $3}' | tr -d '"')

    if [ -n "$DB_ID" ]; then
        print_success "Database created with ID: $DB_ID"

        # Update wrangler.prod.toml with database ID
        print_info "Updating wrangler.prod.toml with database ID..."
        sed -i "s/YOUR_PRODUCTION_DB_ID/$DB_ID/g" wrangler.prod.toml
        print_success "Configuration updated"

        # Initialize database schema
        print_info "Initializing database schema..."
        wrangler d1 execute edgelink-production --file=./schema.sql
        print_success "Database schema initialized"

        # Verify tables
        print_info "Verifying database tables..."
        wrangler d1 execute edgelink-production --command="SELECT name FROM sqlite_master WHERE type='table';"
        print_success "Database setup complete"
    else
        print_warning "Could not extract database ID. Please update wrangler.prod.toml manually."
    fi

    cd ..
fi

# Step 5: Create KV namespace
print_header "Step 5: Creating KV Namespace"

print_info "Creating production KV namespace for link storage..."
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Skipping KV namespace creation."
else
    cd backend
    KV_OUTPUT=$(wrangler kv:namespace create "LINKS_KV" --env production 2>&1)
    echo "$KV_OUTPUT"

    KV_ID=$(echo "$KV_OUTPUT" | grep "id" | awk '{print $3}' | tr -d '"' | head -n1)

    if [ -n "$KV_ID" ]; then
        print_success "KV namespace created with ID: $KV_ID"
        print_info "Updating wrangler.prod.toml..."
        sed -i "s/YOUR_PRODUCTION_KV_ID/$KV_ID/g" wrangler.prod.toml
        print_success "Configuration updated"
    fi

    cd ..
fi

# Step 6: Create R2 bucket
print_header "Step 6: Creating R2 Bucket"

print_info "Creating production R2 bucket for file storage..."
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Skipping R2 bucket creation."
else
    cd backend
    wrangler r2 bucket create edgelink-production-storage || print_warning "Bucket may already exist or requires manual creation"
    print_success "R2 bucket setup complete"
    cd ..
fi

# Step 7: Generate and set secrets
print_header "Step 7: Setting Production Secrets"

print_warning "You need to set production secrets for JWT authentication."
print_info "We'll generate strong random secrets for you."
echo ""

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
print_info "Generated JWT_SECRET (64 characters)"

# Generate refresh token secret
REFRESH_TOKEN_SECRET=$(openssl rand -base64 48 | tr -d '\n')
print_info "Generated REFRESH_TOKEN_SECRET (64 characters)"

echo ""
print_warning "IMPORTANT: Save these secrets securely!"
print_info "You'll need to set them using Wrangler."
echo ""
echo "JWT_SECRET: $JWT_SECRET"
echo "REFRESH_TOKEN_SECRET: $REFRESH_TOKEN_SECRET"
echo ""

read -p "Set these secrets now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd backend

    print_info "Setting JWT_SECRET..."
    echo "$JWT_SECRET" | wrangler secret put JWT_SECRET --env production

    print_info "Setting REFRESH_TOKEN_SECRET..."
    echo "$REFRESH_TOKEN_SECRET" | wrangler secret put REFRESH_TOKEN_SECRET --env production

    print_success "Secrets set successfully"
    cd ..
else
    print_warning "Skipped setting secrets. Set them manually with:"
    echo "  cd backend"
    echo "  wrangler secret put JWT_SECRET --env production"
    echo "  wrangler secret put REFRESH_TOKEN_SECRET --env production"
fi

# Step 8: Deploy backend
print_header "Step 8: Deploying Backend to Production"

print_warning "About to deploy backend to Cloudflare Workers..."
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Skipping backend deployment."
else
    cd backend

    print_info "Building backend..."
    npm run build || print_warning "Build script not found, using TypeScript directly"

    print_info "Deploying to Cloudflare Workers (production)..."
    wrangler deploy --env production

    DEPLOY_STATUS=$?
    if [ $DEPLOY_STATUS -eq 0 ]; then
        print_success "Backend deployed successfully!"
        print_info "Your backend is now running at: https://edgelink-production.YOUR_SUBDOMAIN.workers.dev"
    else
        print_error "Backend deployment failed"
        exit 1
    fi

    cd ..
fi

# Step 9: Configure frontend
print_header "Step 9: Configuring Frontend for Production"

print_info "You need to configure your frontend environment variables."
print_info "Please edit frontend/.env.production and set:"
echo "  NEXT_PUBLIC_API_URL=https://your-backend-url.workers.dev"
echo "  NEXT_PUBLIC_FRONTEND_URL=https://your-domain.com"
echo ""

read -p "Have you configured frontend/.env.production? (y/n) " -n 1 -r
echo

# Step 10: Deploy frontend
print_header "Step 10: Deploying Frontend to Cloudflare Pages"

print_warning "About to deploy frontend to Cloudflare Pages..."
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Skipping frontend deployment."
else
    cd frontend

    print_info "Building frontend..."
    NODE_ENV=production npm run build

    print_info "Creating Pages project (if not exists)..."
    wrangler pages project create edgelink-production || print_info "Project may already exist"

    print_info "Deploying to Cloudflare Pages..."
    wrangler pages deploy .next --project-name=edgelink-production --branch=main

    DEPLOY_STATUS=$?
    if [ $DEPLOY_STATUS -eq 0 ]; then
        print_success "Frontend deployed successfully!"
    else
        print_error "Frontend deployment failed"
        exit 1
    fi

    cd ..
fi

# Final steps
print_header "Deployment Complete!"

print_success "EdgeLink has been deployed to production!"
echo ""
print_info "Next steps:"
echo "  1. Configure custom domain in Cloudflare Dashboard"
echo "  2. Set up SSL/TLS certificates"
echo "  3. Configure DNS records"
echo "  4. Update CORS settings in backend if needed"
echo "  5. Test all functionality"
echo "  6. Set up monitoring and alerts"
echo ""
print_info "For detailed instructions, see: PROD_DEPLOYMENT.md"
echo ""

print_warning "IMPORTANT: Save your secrets in a secure location!"
echo "  JWT_SECRET: $JWT_SECRET"
echo "  REFRESH_TOKEN_SECRET: $REFRESH_TOKEN_SECRET"
echo ""

print_success "Happy shortening! 🚀"
