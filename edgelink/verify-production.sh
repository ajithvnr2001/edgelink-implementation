#!/bin/bash

###############################################################################
# Verify EdgeLink Production Deployment
# This script tests all production endpoints and services
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0

# Get production URLs
echo -e "${BLUE}Enter your production URLs:${NC}"
read -p "Backend URL (e.g., https://edgelink-production.workers.dev): " BACKEND_URL
read -p "Frontend URL (e.g., https://edgelink.pages.dev): " FRONTEND_URL

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Production Verification Tests${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_code=$3
    local description=$4

    echo -n "Testing $name... "

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10 2>/dev/null || echo "000")

    if [ "$response" -eq "$expected_code" ]; then
        echo -e "${GREEN}✓${NC} (HTTP $response) $description"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC} (HTTP $response, expected $expected_code) $description"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Function to test JSON response
test_json_endpoint() {
    local name=$1
    local url=$2
    local expected_key=$3

    echo -n "Testing $name... "

    response=$(curl -s "$url" --max-time 10 2>/dev/null || echo "{}")

    if echo "$response" | grep -q "\"$expected_key\""; then
        echo -e "${GREEN}✓${NC} JSON valid"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC} Invalid JSON or missing key: $expected_key"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo -e "${YELLOW}Backend Tests:${NC}"
echo "----------------------------------------"

# Test backend health
test_endpoint "Health Check" "$BACKEND_URL/api/health" 200 "Backend is healthy"

# Test health JSON response
test_json_endpoint "Health JSON" "$BACKEND_URL/api/health" "status"

# Test stats endpoint
test_endpoint "Stats Endpoint" "$BACKEND_URL/api/stats" 200 "Stats accessible"

# Test CORS preflight
echo -n "Testing CORS... "
cors_response=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$BACKEND_URL/api/health" \
    -H "Origin: $FRONTEND_URL" \
    -H "Access-Control-Request-Method: GET" \
    --max-time 10 2>/dev/null || echo "000")

if [ "$cors_response" -eq 204 ] || [ "$cors_response" -eq 200 ]; then
    echo -e "${GREEN}✓${NC} (HTTP $cors_response) CORS configured"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} (HTTP $cors_response) CORS not configured"
    FAILED=$((FAILED + 1))
fi

# Test authentication endpoints
test_endpoint "Login Endpoint" "$BACKEND_URL/api/auth/login" 400 "Requires body"
test_endpoint "Signup Endpoint" "$BACKEND_URL/api/auth/signup" 400 "Requires body"

echo ""
echo -e "${YELLOW}Frontend Tests:${NC}"
echo "----------------------------------------"

# Test frontend
test_endpoint "Frontend Homepage" "$FRONTEND_URL" 200 "Homepage loads"

# Test if HTML is returned
echo -n "Testing HTML Response... "
html_response=$(curl -s "$FRONTEND_URL" --max-time 10 2>/dev/null || echo "")

if echo "$html_response" | grep -q "<html\|<!DOCTYPE"; then
    echo -e "${GREEN}✓${NC} Valid HTML"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} Not valid HTML"
    FAILED=$((FAILED + 1))
fi

echo ""
echo -e "${YELLOW}Security Tests:${NC}"
echo "----------------------------------------"

# Test HTTPS
echo -n "Testing HTTPS Enforcement... "
if [[ "$BACKEND_URL" == https://* ]]; then
    echo -e "${GREEN}✓${NC} Backend uses HTTPS"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} Backend not using HTTPS"
    FAILED=$((FAILED + 1))
fi

if [[ "$FRONTEND_URL" == https://* ]]; then
    echo -e "  ${GREEN}✓${NC} Frontend uses HTTPS"
    PASSED=$((PASSED + 1))
else
    echo -e "  ${RED}✗${NC} Frontend not using HTTPS"
    FAILED=$((FAILED + 1))
fi

# Test security headers
echo -n "Testing Security Headers... "
headers=$(curl -sI "$BACKEND_URL/api/health" 2>/dev/null || echo "")

header_count=0
if echo "$headers" | grep -qi "x-frame-options"; then
    header_count=$((header_count + 1))
fi
if echo "$headers" | grep -qi "x-content-type-options"; then
    header_count=$((header_count + 1))
fi

if [ $header_count -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Security headers present ($header_count/2)"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠${NC} No security headers found"
    FAILED=$((FAILED + 1))
fi

echo ""
echo -e "${YELLOW}Database Tests:${NC}"
echo "----------------------------------------"

# Test database via backend
test_endpoint "Database Connection" "$BACKEND_URL/api/stats" 200 "Database accessible"

echo ""
echo -e "${YELLOW}Performance Tests:${NC}"
echo "----------------------------------------"

# Test response time
echo -n "Testing Backend Response Time... "
start_time=$(date +%s%3N)
curl -s "$BACKEND_URL/api/health" -o /dev/null 2>/dev/null || true
end_time=$(date +%s%3N)
response_time=$((end_time - start_time))

if [ $response_time -lt 1000 ]; then
    echo -e "${GREEN}✓${NC} ${response_time}ms (< 1000ms)"
    PASSED=$((PASSED + 1))
elif [ $response_time -lt 2000 ]; then
    echo -e "${YELLOW}⚠${NC} ${response_time}ms (< 2000ms, acceptable)"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} ${response_time}ms (> 2000ms, too slow)"
    FAILED=$((FAILED + 1))
fi

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Your production deployment is healthy.${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "  1. Create your first user account"
    echo "  2. Test URL shortening functionality"
    echo "  3. Set up monitoring and alerts"
    echo "  4. Configure custom domain (if not done)"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the errors above.${NC}"
    echo ""
    echo -e "${YELLOW}Common issues:${NC}"
    echo "  - CORS errors: Check backend CORS configuration"
    echo "  - 404 errors: Verify deployment was successful"
    echo "  - Database errors: Check D1 database is initialized"
    echo "  - Slow response: Check Cloudflare region and caching"
    echo ""
    exit 1
fi
