#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3004"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}User Service API Test${NC}"
echo -e "${BLUE}========================================${NC}"

# Test 1: Health Check
echo -e "\n${YELLOW}1. Testing Health Endpoint...${NC}"
echo -e "${GREEN}GET ${BASE_URL}/actuator/health${NC}"
curl -s ${BASE_URL}/actuator/health | jq '.' || curl -s ${BASE_URL}/actuator/health
echo -e "\n"

# Test 2: Register a new user
echo -e "\n${YELLOW}2. Testing User Registration...${NC}"
echo -e "${GREEN}POST ${BASE_URL}/api/users/register${NC}"
REGISTER_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test@123456"
  }')
echo "$REGISTER_RESPONSE" | jq '.' || echo "$REGISTER_RESPONSE"
echo -e "\n"

# Test 3: Login
echo -e "\n${YELLOW}3. Testing User Login...${NC}"
echo -e "${GREEN}POST ${BASE_URL}/api/users/login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "Test@123456"
  }')
echo "$LOGIN_RESPONSE" | jq '.' || echo "$LOGIN_RESPONSE"

# Extract token if jq is available
if command -v jq &> /dev/null; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // .jwt // .access_token // empty')
    if [ ! -z "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        echo -e "\n${GREEN}Token extracted: ${TOKEN:0:50}...${NC}"
        
        # Test 4: Get user profile (if endpoint exists)
        echo -e "\n${YELLOW}4. Testing Get User Profile (with token)...${NC}"
        echo -e "${GREEN}GET ${BASE_URL}/api/users/profile${NC}"
        curl -s -X GET ${BASE_URL}/api/users/profile \
          -H "Authorization: Bearer $TOKEN" | jq '.' || \
        curl -s -X GET ${BASE_URL}/api/users/profile \
          -H "Authorization: Bearer $TOKEN"
        echo -e "\n"
    fi
fi

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Test Complete${NC}"
echo -e "${BLUE}========================================${NC}"
