# Quick Start Guide

## 1. Deploy to Minikube

```bash
./deploy-minikube.sh
```

This will automatically:
- Build Docker image
- Deploy to default namespace
- Set up port forwarding on localhost:3004
- Display service information

## 2. Test the Service

### Quick Health Check
```bash
curl http://localhost:3004/actuator/health
```

### Run All Tests
```bash
./test-api.sh
```

## 3. Manual API Tests

Based on the controller (`/v1/users`), here are the available endpoints:

### Register a User
```bash
curl -X POST http://localhost:3004/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "password": "SecurePass123!"
  }'
```

### Login
```bash
curl -X POST http://localhost:3004/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

Save the JWT token from the response:
```bash
TOKEN="<your-jwt-token-here>"
```

### Get All Users
```bash
curl -X GET http://localhost:3004/v1/users \
  -H "Authorization: Bearer $TOKEN"
```

### Get User by ID
```bash
curl -X GET http://localhost:3004/v1/users/1 \
  -H "Authorization: Bearer $TOKEN"
```

## 4. Kubernetes Commands

### View Pods
```bash
kubectl get pods
```

### View Services
```bash
kubectl get svc
```

### View Logs
```bash
kubectl logs -f deployment/user-service
```

### Access via NodePort (alternative)
```bash
curl http://$(minikube ip):30040/actuator/health
```

## 5. Stop Port Forwarding

```bash
# Find the PID (displayed when deploy script completes)
kill <PID>

# Or kill all port-forwards
pkill -f "kubectl port-forward"
```

## 6. Cleanup

```bash
./undeploy-minikube.sh
```

## Troubleshooting

### Port forwarding not working?
```bash
# Manually set up port forwarding
kubectl port-forward service/user-service 3004:3004
```

### Check MySQL connectivity from pod
```bash
kubectl exec -it deployment/user-service -- sh
# Inside pod:
nc -zv host.minikube.internal 3306
```

### View pod details
```bash
kubectl describe pod <pod-name>
```
