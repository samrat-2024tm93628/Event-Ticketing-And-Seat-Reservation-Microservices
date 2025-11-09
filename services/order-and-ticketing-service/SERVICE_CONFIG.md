# Service Configuration Summary

## Environment Configuration Files

### 1. `.env` (Kubernetes/Production)
Used for deployment in Kubernetes/Minikube with internal service DNS names.

**Service URLs:**
- Reservation Service: `http://reservation-service:3002/v1/seats`
- Payment Service: `http://payment-service:3003`
- User Service: `http://user-service:3004/v1/users`
- Catalog Service: `http://catalog-service:3005/v1/events`

### 2. `.env.local` (Local Development)
Used for local development with localhost URLs.

**Service URLs:**
- Reservation Service: `http://localhost:3002/v1/seats`
- Payment Service: `http://localhost:3003`
- User Service: `http://localhost:3004/v1/users`
- Catalog Service: `http://localhost:3005/v1/events`

## ConfigMap Configuration

The `k8s/configmap.yaml` has been updated with all dependent service URLs:

```yaml
data:
  RESERVATION_SERVICE_URL: "http://reservation-service:3002/v1/seats"
  PAYMENT_SERVICE_URL: "http://payment-service:3003"
  USER_SERVICE_URL: "http://user-service:3004/v1/users"
  CATALOG_SERVICE_URL: "http://catalog-service:3005/v1/events"
```

## How It Works

### In Kubernetes (Minikube)
1. Services communicate using internal Kubernetes DNS names
2. Format: `http://<service-name>:<port>`
3. No external access needed for inter-service communication
4. Fast and secure within the cluster

### For External Access (Testing)
Use port-forwarding to access services from localhost:

```bash
# Forward all services
kubectl port-forward svc/order-service 3001:3001 &
kubectl port-forward svc/reservation-service 3002:3002 &
kubectl port-forward svc/payment-service 3003:3003 &
kubectl port-forward svc/user-service 3004:3004 &
kubectl port-forward svc/catalog-service 3005:3005 &
```

## Deployment Changes Applied

✅ Created `.env` file with Kubernetes service names
✅ Created `.env.local` file for local development
✅ Updated `k8s/configmap.yaml` with all service URLs
✅ Updated `Dockerfile` to copy .env file
✅ Updated `README-minikube.md` with service dependencies
✅ Applied changes to running cluster
✅ Restarted deployment to pick up new configuration
✅ Verified environment variables are set correctly

## Current Status

All environment variables are now properly configured:
- ✅ RESERVATION_SERVICE_URL
- ✅ PAYMENT_SERVICE_URL
- ✅ USER_SERVICE_URL
- ✅ CATALOG_SERVICE_URL

The service is ready to communicate with dependent microservices running in Minikube!
