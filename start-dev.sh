#!/bin/bash

# EdgeLink Development Startup Script
# This script starts both backend and frontend in development mode

echo "🚀 Starting EdgeLink Development Environment..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler is not installed${NC}"
    echo "Install it with: npm install -g wrangler"
    exit 1
fi

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Install Node.js from: https://nodejs.org/"
    exit 1
fi

# Check if .env.local exists
if [ ! -f "edgelink/frontend/.env.local" ]; then
    echo -e "${YELLOW}⚠️  .env.local not found. Creating it...${NC}"
    cp edgelink/frontend/.env.example edgelink/frontend/.env.local
    echo -e "${GREEN}✅ Created .env.local${NC}"
fi

# Check if JWT secrets are set
echo "Checking JWT secrets..."
cd edgelink/backend

# Note: This is a basic check, actual secret verification would require wrangler API
echo -e "${YELLOW}⚠️  Make sure you've set JWT secrets:${NC}"
echo "   wrangler secret put JWT_SECRET"
echo "   wrangler secret put REFRESH_TOKEN_SECRET"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

cd ../frontend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

cd ../..

echo ""
echo -e "${GREEN}✅ Starting services...${NC}"
echo ""
echo "Backend will run on: http://localhost:8787"
echo "Frontend will run on: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
cd edgelink/backend
npm run dev &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait a bit for backend to start
sleep 3

# Start frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for both processes
wait
