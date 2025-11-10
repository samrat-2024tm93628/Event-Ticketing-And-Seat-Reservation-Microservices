# User Service - API Testing Guide

This guide provides sample curl commands to test the User Service API endpoints.

## Base URL

- **Local (Port Forward)**: `http://localhost:3004`
- **Minikube (NodePort)**: `http://$(minikube ip):30040`

## Prerequisites

Make sure the service is running:
```bash
# Check service health
curl http://localhost:3004/actuator/health

# Expected response:
# {"status":"UP"}
```

---

## API Endpoints

### 1. Register a New User

Register a new user account.

**Endpoint**: `POST /v1/users/register`

```bash
curl -X POST http://localhost:3004/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1-555-0100",
    "password": "SecurePassword123!"
  }'
```

**Another example:**
```bash
curl -X POST http://localhost:3004/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "phone": "+1-555-0101",
    "password": "MySecurePass456"
  }'
```

**Expected Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-0100",
  "createdAt": "2025-11-09T10:30:00"
}
```

---

### 2. User Login

Login with email and password to get a JWT token.

**Endpoint**: `POST /v1/users/login`

```bash
curl -X POST http://localhost:3004/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePassword123!"
  }'
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  "type": "Bearer",
  "expiresIn": 86400
}
```

**Save the token for subsequent requests:**
```bash
# Extract and save token
TOKEN=$(curl -s -X POST http://localhost:3004/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePassword123!"
  }' | jq -r '.token')

echo "Token: $TOKEN"
```

---

### 3. Get All Users

Retrieve a list of all users (requires authentication).

**Endpoint**: `GET /v1/users`

```bash
curl -X GET http://localhost:3004/v1/users \
  -H "Authorization: Bearer $TOKEN"
```

**Or with explicit token:**
```bash
curl -X GET http://localhost:3004/v1/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Expected Response:**
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1-555-0100",
    "createdAt": "2025-11-09T10:30:00"
  },
  {
    "id": 2,
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "phone": "+1-555-0101",
    "createdAt": "2025-11-09T10:35:00"
  }
]
```

---

### 4. Get User by ID

Retrieve a specific user by their ID (requires authentication).

**Endpoint**: `GET /v1/users/{id}`

```bash
curl -X GET http://localhost:3004/v1/users/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Another example:**
```bash
curl -X GET http://localhost:3004/v1/users/2 \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-0100",
  "createdAt": "2025-11-09T10:30:00"
}
```

---

## Complete Testing Flow

Here's a complete flow to test all endpoints:

```bash
#!/bin/bash

BASE_URL="http://localhost:3004"

echo "=== Testing User Service API ==="

# 1. Health Check
echo -e "\n1. Health Check"
curl -s $BASE_URL/actuator/health | jq '.'

# 2. Register first user
echo -e "\n2. Register User 1"
curl -s -X POST $BASE_URL/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "phone": "+1-555-1001",
    "password": "AlicePass123!"
  }' | jq '.'

# 3. Register second user
echo -e "\n3. Register User 2"
curl -s -X POST $BASE_URL/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob Wilson",
    "email": "bob@example.com",
    "phone": "+1-555-1002",
    "password": "BobPass456!"
  }' | jq '.'

# 4. Login
echo -e "\n4. Login as Alice"
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "AlicePass123!"
  }')
echo $LOGIN_RESPONSE | jq '.'

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token // .jwt // .accessToken // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Failed to get token"
  exit 1
fi

echo "Token obtained: ${TOKEN:0:50}..."

# 5. Get all users
echo -e "\n5. Get All Users"
curl -s -X GET $BASE_URL/v1/users \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 6. Get user by ID
echo -e "\n6. Get User by ID (1)"
curl -s -X GET $BASE_URL/v1/users/1 \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n7. Get User by ID (2)"
curl -s -X GET $BASE_URL/v1/users/2 \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n=== Testing Complete ==="
```

---

## Error Scenarios

### Unauthorized Access (No Token)
```bash
curl -X GET http://localhost:3004/v1/users
```

**Expected Response:**
```json
{
  "status": 401,
  "error": "Unauthorized",
  "message": "Full authentication is required to access this resource"
}
```

### Invalid Credentials
```bash
curl -X POST http://localhost:3004/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "wrong@example.com",
    "password": "wrongpassword"
  }'
```

**Expected Response:**
```json
{
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid email or password"
}
```

### User Not Found
```bash
curl -X GET http://localhost:3004/v1/users/999 \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "status": 404,
  "error": "Not Found",
  "message": "User not found with id: 999"
}
```

### Duplicate Email Registration
```bash
# Try to register with an existing email
curl -X POST http://localhost:3004/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Another John",
    "email": "john.doe@example.com",
    "phone": "+1-555-9999",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "Email already exists"
}
```

---

## Testing with Different Tools

### Using HTTPie

```bash
# Register
http POST localhost:3004/v1/users/register \
  name="John Doe" \
  email="john@example.com" \
  phone="+1-555-0100" \
  password="SecurePass123!"

# Login
http POST localhost:3004/v1/users/login \
  email="john@example.com" \
  password="SecurePass123!"

# Get users (with token)
http GET localhost:3004/v1/users \
  Authorization:"Bearer YOUR_TOKEN_HERE"
```

### Using Postman

1. **Set Base URL**: Create an environment variable `base_url` = `http://localhost:3004`

2. **Register User**:
   - Method: POST
   - URL: `{{base_url}}/v1/users/register`
   - Body (JSON):
     ```json
     {
       "name": "John Doe",
       "email": "john@example.com",
       "phone": "+1-555-0100",
       "password": "SecurePass123!"
     }
     ```

3. **Login**:
   - Method: POST
   - URL: `{{base_url}}/v1/users/login`
   - Body (JSON):
     ```json
     {
       "email": "john@example.com",
       "password": "SecurePass123!"
     }
     ```
   - Save the token from response

4. **Get Users**:
   - Method: GET
   - URL: `{{base_url}}/v1/users`
   - Headers: `Authorization: Bearer {{token}}`

---

## Automated Testing Script

Run the provided test script:

```bash
./test-api.sh
```

This script automatically tests all endpoints and displays the results.

---

## Troubleshooting

### Connection Refused
```bash
# Check if service is running
kubectl get pods
kubectl get svc

# Check port forwarding
ps aux | grep "port-forward"

# Restart port forwarding
kubectl port-forward service/user-service 3004:3004
```

### Database Connection Issues
```bash
# Check database connectivity from pod
kubectl exec -it deployment/user-service -- sh
nc -zv host.minikube.internal 3306

# Check logs
kubectl logs -f deployment/user-service
```

### Token Expired
```bash
# Get a new token by logging in again
curl -X POST http://localhost:3004/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

---

## Additional Resources

- **QUICKSTART.md**: Quick reference guide
- **TEST_COMMANDS.md**: Detailed testing documentation
- **DEPLOYMENT.md**: Deployment guide
- **test-api.sh**: Automated testing script

---

## Support

For issues or questions:
1. Check the logs: `kubectl logs -f deployment/user-service`
2. Verify database connectivity
3. Ensure JWT secret is properly configured
4. Review Spring Boot Actuator endpoints for health status
