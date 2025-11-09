# User Service API Test Commands

## Base URLs
- **Port Forward**: `http://localhost:3004`
- **NodePort**: `http://$(minikube ip):30040`

## 1. Health Check

```bash
# Via port-forward
curl http://localhost:3004/actuator/health

# Via NodePort
curl http://$(minikube ip):30040/actuator/health
```

Expected Response:
```json
{
  "status": "UP"
}
```

## 2. User Registration

```bash
curl -X POST http://localhost:3004/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1-555-0100",
    "password": "SecurePass123!"
  }'
```

Expected Response:
```json
{
  "id": 1,
  "username": "johndoe",
  "email": "john.doe@example.com",
  "message": "User registered successfully"
}
```

## 3. User Login

```bash
curl -X POST http://localhost:3004/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123!"
  }'
```

Expected Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "johndoe",
  "email": "john.doe@example.com"
}
```

## 4. Get All Users

```bash
curl -X GET http://localhost:3004/v1/users \
  -H "Authorization: Bearer $TOKEN"
```

## 5. Get User by ID

```bash
curl -X GET http://localhost:3004/v1/users/1 \
  -H "Authorization: Bearer $TOKEN"
```



## Complete Test Flow

```bash
# 1. Register a new user
curl -X POST http://localhost:3004/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+1-555-9999",
    "password": "Test@123456"
  }'

# 2. Login with the user
RESPONSE=$(curl -s -X POST http://localhost:3004/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@123456"
  }')

# 3. Extract token (requires jq)
TOKEN=$(echo $RESPONSE | jq -r '.token')
echo "Token: $TOKEN"

# 4. Use token to access protected endpoints
curl -X GET http://localhost:3004/v1/users \
  -H "Authorization: Bearer $TOKEN"
```

## Automated Testing

Run the test script:
```bash
chmod +x test-api.sh
./test-api.sh
```

## Debugging

### Check if service is running
```bash
kubectl get pods
kubectl get svc
```

### View logs
```bash
kubectl logs -f deployment/user-service
```

### Test database connectivity
```bash
# Connect to the pod
kubectl exec -it deployment/user-service -- /bin/sh

# Inside the pod, test MySQL connection
nc -zv host.minikube.internal 3306
```

### Port forwarding manually
```bash
# If port forwarding is not active, run:
kubectl port-forward service/user-service 3004:3004

# In another terminal, test:
curl http://localhost:3004/actuator/health
```

## Common Issues

### Issue: Connection refused
**Solution**: Make sure port-forwarding is active or use NodePort URL

### Issue: 401 Unauthorized
**Solution**: Make sure to include valid JWT token in Authorization header

### Issue: Database connection error
**Solution**: Verify MySQL is running locally on port 3306 and credentials are correct

## Stop Port Forwarding

```bash
# Find the port-forward process
ps aux | grep "port-forward"

# Kill the process
kill <PID>

# Or stop all port-forward processes
pkill -f "kubectl port-forward"
```
