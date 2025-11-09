# Minikube Deployment Guide - Order Service

Quick reference guide for deploying the Order Service to Minikube.

---

## 📋 Prerequisites

Ensure you have the following installed:

- **Docker** - Container runtime
- **Minikube** (v1.20+) - Local Kubernetes cluster
- **kubectl** (v1.20+) - Kubernetes CLI

---

## 🚀 Quick Start

### 1. Deploy Everything

```bash
./deploy-minikube.sh
```

This will:
- ✅ Check prerequisites
- ✅ Start Minikube cluster (4 CPUs, 4096MB RAM)
- ✅ Build Docker image
- ✅ Load image into Minikube
- ✅ Deploy MongoDB and Order Service
- ✅ Wait for pods to be ready
- ✅ Test service health
- ✅ Prompt to load seed data (optional)

### 2. Access the Service

```bash
# Port forward to access the service
kubectl port-forward svc/order-service 3001:3001
```

Then access at: `http://localhost:3001`

### 3. Test Health Endpoint

```bash
curl http://localhost:3001/health
# Expected: {"status":"ok"}
```

---

## 📜 Deployment Scripts

### `deploy-minikube.sh`

Main deployment script with various options:

```bash
# Standard deployment
./deploy-minikube.sh

# Clean and redeploy
./deploy-minikube.sh --clean

# Auto-load seed data without prompting
./deploy-minikube.sh --auto-seed

# Skip Docker build (use existing image)
./deploy-minikube.sh --skip-build

# Skip seed data loading
./deploy-minikube.sh --skip-seed

# Show help
./deploy-minikube.sh --help
```

**Environment Variables:**
```bash
# Customize Minikube resources
MINIKUBE_CPUS=6 MINIKUBE_MEMORY=8192 ./deploy-minikube.sh
```

### `cleanup-minikube.sh`

Cleanup script to remove resources:

```bash
# Remove Kubernetes resources only
./cleanup-minikube.sh

# Remove resources and stop Minikube
./cleanup-minikube.sh --stop

# Remove resources and delete Minikube cluster
./cleanup-minikube.sh --delete

# Full cleanup (includes Docker images)
./cleanup-minikube.sh --full

# Show help
./cleanup-minikube.sh --help
```

---

## 🗄️ Seed Data

The service includes sample data that can be loaded:

- **400 Orders** from `data/etsr_orders.csv`
- **995 Tickets** from `data/etsr_tickets.csv`

### Load Seed Data Manually

```bash
# Get pod name
POD=$(kubectl get pods -l app=order-service -o jsonpath='{.items[0].metadata.name}')

# Load orders
kubectl exec $POD -- node scripts/load-seed.js --file data/etsr_orders.csv --type orders

# Load tickets
kubectl exec $POD -- node scripts/load-seed.js --file data/etsr_tickets.csv --type tickets
```

### Verify Seed Data

**Option 1: Using kubectl exec (Recommended)**
```bash
kubectl exec deployment/order-service -- node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI).then(() => 
  Promise.all([
    mongoose.connection.db.collection('orders').countDocuments(),
    mongoose.connection.db.collection('tickets').countDocuments()
  ])
).then(([orders, tickets]) => {
  console.log('Orders:', orders);
  console.log('Tickets:', tickets);
  process.exit(0);
});"
```

**Option 2: Using mongosh**
```bash
# Port forward to MongoDB
kubectl port-forward svc/mongo 27017:27017

# In another terminal, connect with mongosh
mongosh mongodb://localhost:27017/order-service

# Check counts
db.orders.countDocuments()
db.tickets.countDocuments()
```

---

## 📊 Useful Commands

### View Resources

```bash
# View all pods
kubectl get pods

# View deployments
kubectl get deployments

# View services
kubectl get services

# View persistent volumes
kubectl get pvc
```

### View Logs

```bash
# Order Service logs
kubectl logs -f deployment/order-service

# MongoDB logs
kubectl logs -f deployment/mongo

# Tail last 50 lines
kubectl logs deployment/order-service --tail=50
```

### Describe Resources

```bash
# Describe Order Service pod
kubectl describe pod -l app=order-service

# Describe MongoDB deployment
kubectl describe deployment mongo
```

### Access Containers

```bash
# Execute commands in Order Service pod
kubectl exec -it deployment/order-service -- sh

# Access MongoDB shell directly
kubectl exec -it deployment/mongo -- mongosh mongodb://localhost:27017/order-service
```

### MongoDB CLI Access

**Method 1: Direct access (Recommended)**
```bash
# Login to MongoDB CLI inside the pod
kubectl exec -it deployment/mongo -- mongosh mongodb://localhost:27017/order-service

# Once inside, you can run queries:
# show dbs
# show collections
# db.orders.find().limit(5)
# db.tickets.countDocuments()
# db.orders.findOne()
```

**Method 2: Port forward and connect locally**
```bash
# Forward MongoDB port
kubectl port-forward svc/mongo 27017:27017

# In another terminal, connect with mongosh
mongosh mongodb://localhost:27017/order-service

# Run queries:
# db.orders.find().pretty()
# db.tickets.find({ orderId: "ORDER_ID" })
```

**Method 3: Quick query without interactive shell**
```bash
# Execute single query
kubectl exec deployment/mongo -- mongosh mongodb://localhost:27017/order-service --eval "db.orders.countDocuments()"

# Execute multiple commands
kubectl exec deployment/mongo -- mongosh mongodb://localhost:27017/order-service --eval "
  print('Orders count:', db.orders.countDocuments());
  print('Tickets count:', db.tickets.countDocuments());
  print('Sample order:');
  printjson(db.orders.findOne());
"
```

**Common MongoDB Queries:**
```javascript
// Count documents
db.orders.countDocuments()
db.tickets.countDocuments()

// Find orders by status
db.orders.find({ status: "CONFIRMED" }).limit(10)

// Find order by orderId
db.orders.findOne({ orderId: "ORD-123" })

// Find tickets for an order
db.tickets.find({ orderId: "ORD-123" })

// Get recent orders
db.orders.find().sort({ createdAt: -1 }).limit(5)

// Aggregate - orders by status
db.orders.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])
```

### Port Forwarding

```bash
# Forward Order Service
kubectl port-forward svc/order-service 3001:3001

# Forward MongoDB
kubectl port-forward svc/mongo 27017:27017

# Forward in background
kubectl port-forward svc/order-service 3001:3001 &
```

### Access Dependent Services (for testing)

If dependent services are running in Minikube:

```bash
# Reservation Service
kubectl port-forward svc/reservation-service 3002:3002

# Payment Service
kubectl port-forward svc/payment-service 3003:3003

# User Service
kubectl port-forward svc/user-service 3004:3004

# Catalog Service
kubectl port-forward svc/catalog-service 3005:3005
```

Forward all services at once:
```bash
kubectl port-forward svc/order-service 3001:3001 &
kubectl port-forward svc/reservation-service 3002:3002 &
kubectl port-forward svc/payment-service 3003:3003 &
kubectl port-forward svc/user-service 3004:3004 &
kubectl port-forward svc/catalog-service 3005:3005 &
```

---

## 🔧 Configuration

### Environment Files

- **`.env`** - Kubernetes/Production configuration with internal service names
- **`.env.local`** - Local development configuration with localhost URLs

### Service Dependencies

The Order Service communicates with these microservices:

| Service | Kubernetes URL | Localhost URL | Purpose |
|---------|----------------|---------------|---------|
| **Reservation Service** | `http://reservation-service:3002/v1/seats` | `http://localhost:3002/v1/seats` | Seat reservation management |
| **Payment Service** | `http://payment-service:3003` | `http://localhost:3003` | Payment processing |
| **User Service** | `http://user-service:3004/v1/users` | `http://localhost:3004/v1/users` | User information |
| **Catalog Service** | `http://catalog-service:3005/v1/events` | `http://localhost:3005/v1/events` | Event catalog |

**Note:** In Kubernetes, services use internal DNS names. For local testing, use port-forwarding.

### Kubernetes Manifests

All manifests are in the `k8s/` directory:

| File | Description |
|------|-------------|
| `pvc.yaml` | Persistent volume for MongoDB data |
| `configmap.yaml` | Environment variables (service URLs, ports, dependent services) |
| `secret.yaml` | Sensitive data (MongoDB URI) |
| `mongo-deployment.yaml` | MongoDB deployment with health checks |
| `mongo-service.yaml` | MongoDB ClusterIP service |
| `order-deployment.yaml` | Order Service deployment |
| `order-service.yaml` | Order Service ClusterIP service |

### Resource Limits

Order Service deployment:
- **Requests**: 256Mi memory, 100m CPU
- **Limits**: 512Mi memory, 500m CPU

### Health Checks

- **Liveness Probe**: HTTP GET `/health` every 10s
- **Readiness Probe**: HTTP GET `/health` every 5s

---

## 🧪 Testing the API

### Create an Order

```bash
curl -X POST http://localhost:3001/v1/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-order-$(date +%s)" \
  -d '{
    "userId": "user-123",
    "eventId": "event-456",
    "seats": ["A1", "A2"],
    "paymentMethod": "credit_card"
  }'
```

### Get an Order

```bash
curl http://localhost:3001/v1/orders/ORDER_ID
```

### Cancel an Order

```bash
curl -X POST http://localhost:3001/v1/orders/ORDER_ID/cancel
```

---

## 🐛 Troubleshooting

### Pod Not Starting

```bash
# Check pod status
kubectl get pods

# Describe pod for events
kubectl describe pod -l app=order-service

# Check logs
kubectl logs -l app=order-service
```

### Image Not Found

```bash
# Verify image in Minikube
minikube image ls | grep order-service

# Rebuild and reload
docker build -t order-service:latest .
minikube image load order-service:latest

# Restart deployment
kubectl rollout restart deployment/order-service
```

### MongoDB Connection Issues

```bash
# Check MongoDB pod
kubectl get pods -l app=mongo

# View MongoDB logs
kubectl logs -l app=mongo

# Test connectivity from Order Service
kubectl exec deployment/order-service -- nc -zv mongo 27017
```

### Service Not Accessible

```bash
# Check service endpoints
kubectl get endpoints order-service

# Verify service exists
kubectl get svc order-service

# Check if pods are ready
kubectl get pods -l app=order-service
```

### Minikube Issues

```bash
# Check Minikube status
minikube status

# Restart Minikube
minikube stop
minikube start

# Delete and recreate (warning: loses all data)
minikube delete
minikube start --cpus=4 --memory=4096
```

---

## 🔄 Update and Redeploy

### After Code Changes

```bash
# Rebuild image and redeploy
docker build -t order-service:latest .
minikube image load order-service:latest
kubectl rollout restart deployment/order-service

# Watch rollout status
kubectl rollout status deployment/order-service
```

### Quick Redeploy

```bash
# Clean and redeploy with auto-seed
./deploy-minikube.sh --clean --auto-seed
```

---

## 📈 Scaling

### Scale Order Service

```bash
# Scale to 3 replicas
kubectl scale deployment/order-service --replicas=3

# Verify scaling
kubectl get pods -l app=order-service

# Auto-scale based on CPU
kubectl autoscale deployment/order-service --min=2 --max=5 --cpu-percent=80
```

---

## 🧹 Cleanup Options

### Remove Resources Only

```bash
./cleanup-minikube.sh
# Removes K8s resources, keeps Minikube running
```

### Stop Minikube

```bash
./cleanup-minikube.sh --stop
# Removes resources and stops Minikube cluster
```

### Delete Cluster

```bash
./cleanup-minikube.sh --delete
# Removes resources and deletes Minikube cluster
```

### Full Cleanup

```bash
./cleanup-minikube.sh --full
# Removes everything including Docker images
```

---

## 📚 Additional Resources

- [Minikube Documentation](https://minikube.sigs.k8s.io/docs/)
- [Kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [MongoDB on Kubernetes](https://kubernetes.io/blog/2017/01/running-mongodb-on-kubernetes-with-statefulsets/)

---

## 🆘 Quick Reference

```bash
# Deploy
./deploy-minikube.sh --auto-seed

# Access service
kubectl port-forward svc/order-service 3001:3001

# View logs
kubectl logs -f deployment/order-service

# Check pods
kubectl get pods

# Cleanup
./cleanup-minikube.sh

# Full cleanup
./cleanup-minikube.sh --full
```

---

**Note**: For production deployments, refer to `README-k8s.md` for production considerations including image registries, secrets management, ingress controllers, and monitoring.
