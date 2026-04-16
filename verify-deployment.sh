#!/bin/bash
# ==================== POST-DEPLOYMENT HEALTH CHECK SCRIPT ====================
# This script verifies all production deployment components are working
# Usage: bash verify-deployment.sh <api-url>
# Example: bash verify-deployment.sh https://api.yourdomain.com

set -e

API_URL=${1:-http://localhost:3000}

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🔍 Deployment Verification Script                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🎯 Target: $API_URL"
echo ""

# Initialize counters
PASSED=0
FAILED=0

# ==================== HEALTH CHECK ====================
echo "1️⃣  API Health Check..."
if response=$(curl -s -w "\n%{http_code}" "$API_URL/health"); then
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ Health endpoint responsive (HTTP 200)${NC}"
        echo "   Response: $(echo $body | head -c 100)..."
        ((PASSED++))
    else
        echo -e "${RED}❌ Health check failed (HTTP $http_code)${NC}"
        ((FAILED++))
    fi
else
    echo -e "${RED}❌ Could not reach $API_URL${NC}"
    ((FAILED++))
fi
echo ""

# ==================== AUTHENTICATION ====================
echo "2️⃣  Authentication Check..."
auth_response=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@example.com","password":"AdminPass123!"}' \
    -w "\n%{http_code}")

http_code=$(echo "$auth_response" | tail -n1)
body=$(echo "$auth_response" | head -n-1)

if echo "$body" | grep -q "\"token\""; then
    echo -e "${GREEN}✅ Authentication working (JWT)${NC}"
    TOKEN=$(echo "$body" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "   Token: ${TOKEN:0:20}..."
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  Authentication check skipped (invalid credentials or endpoint)${NC}"
    ((FAILED++))
fi
echo ""

# ==================== DATA ENDPOINTS ====================
echo "3️⃣  Data Endpoints Check..."

# States endpoint
if curl -s "$API_URL/states" | grep -q "\"data\""; then
    echo -e "${GREEN}✅ /states endpoint working${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  /states endpoint issue${NC}"
    ((FAILED++))
fi

# Search endpoint
if curl -s "$API_URL/search?q=test" | grep -q "success"; then
    echo -e "${GREEN}✅ /search endpoint working${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  /search endpoint issue${NC}"
    ((FAILED++))
fi

echo ""

# ==================== CACHING ====================
echo "4️⃣  Caching Check..."

# First request (should be MISS)
response1=$(curl -s -i "$API_URL/states?limit=5" 2>/dev/null | grep -i "X-Cache-Status" | cut -d' ' -f2- | tr -d '\r')

# Second request (should be HIT)
sleep 1
response2=$(curl -s -i "$API_URL/states?limit=5" 2>/dev/null | grep -i "X-Cache-Status" | cut -d' ' -f2- | tr -d '\r')

if [[ $response1 == *"MISS"* ]] || [[ $response1 == *"HIT"* ]]; then
    echo -e "${GREEN}✅ Cache headers present${NC}"
    echo "   First request: $response1"
    echo "   Second request: $response2"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  Cache headers not detected${NC}"
    ((FAILED++))
fi
echo ""

# ==================== RATE LIMITING ====================
echo "5️⃣  Rate Limiting Check..."
rate_limit_header=$(curl -s -i "$API_URL/states" 2>/dev/null | grep -i "X-RateLimit-Limit" | cut -d' ' -f2-)

if [ ! -z "$rate_limit_header" ]; then
    echo -e "${GREEN}✅ Rate limit headers present${NC}"
    echo "   Limit: $rate_limit_header"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  Rate limit headers not detected${NC}"
    ((FAILED++))
fi
echo ""

# ==================== RESPONSE TIME ====================
echo "6️⃣  Response Time Check..."
start_time=$(date +%s%N)
curl -s "$API_URL/states" > /dev/null
end_time=$(date +%s%N)
response_time=$((($end_time - $start_time) / 1000000)) # Convert to ms

if [ $response_time -lt 1000 ]; then
    echo -e "${GREEN}✅ Response time excellent: ${response_time}ms${NC}"
    ((PASSED++))
elif [ $response_time -lt 2000 ]; then
    echo -e "${YELLOW}⚠️  Response time acceptable: ${response_time}ms${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ Response time slow: ${response_time}ms${NC}"
    ((FAILED++))
fi
echo ""

# ==================== DATABASE ====================
echo "7️⃣  Database Check..."
if curl -s "$API_URL/states" | grep -q "\"success\":true"; then
    echo -e "${GREEN}✅ Database queries working${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ Database queries failed${NC}"
    ((FAILED++))
fi
echo ""

# ==================== ERROR HANDLING ====================
echo "8️⃣  Error Handling Check..."
error_response=$(curl -s "$API_URL/nonexistent" -w "\n%{http_code}")
http_code=$(echo "$error_response" | tail -n1)

if [ "$http_code" = "404" ]; then
    echo -e "${GREEN}✅ 404 error handling working${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  Unexpected status code: $http_code${NC}"
    ((FAILED++))
fi
echo ""

# ==================== SUMMARY ====================
TOTAL=$((PASSED + FAILED))

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    📊 Summary                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "✅ Passed: ${GREEN}$PASSED/$TOTAL${NC}"
echo -e "❌ Failed: ${RED}$FAILED/$TOTAL${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! Deployment is healthy.${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some checks failed. Review items above.${NC}"
    exit 1
fi
