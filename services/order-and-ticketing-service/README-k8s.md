# Kubernetes Deployment Guide

This guide covers deploying the Order Service to Kubernetes using Minikube for local development.

## Prerequisites

- Docker
- Minikube (v1.20+)
- kubectl (v1.20+)

## Quick Start

### 1. Start Minikube

```bash
minikube start --cpus=4 --memory=4096
```

Verify Minikube is running:
```bash
minikube status
```

### 2. Build Docker Image

Build the Order Service image and load it into Minikube:

```bash
# Build the image
docker build -t order-service:latest .

# Load image into Minikube
minikube image load order-service:latest
```

Verify the image is loaded:
```bash
minikube image ls | grep order-service
```

### 3. Create Kubernetes Resources

Apply all manifests in order:

```bash
# Create PVC for MongoDB
kubectl apply -f k8s/pvc.yaml

# Create ConfigMap and Secret
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# Deploy MongoDB
kubectl apply -f k8s/mongo-deployment.yaml
kubectl apply -f k8s/mongo-service.yaml

# Deploy Order Service
kubectl apply -f k8s/order-deployment.yaml
kubectl apply -f k8s/order-service.yaml
```

Or apply all at once:
```bash
kubectl apply -f k8s/
```

### 4. Verify Deployments

Check deployment status:
```bash
kubectl get deployments
kubectl get pods
kubectl get services
```

Wait for all pods to be in Running state:
```bash
kubectl wait --for=condition=ready pod -l app=mongo --timeout=300s
kubectl wait --for=condition=ready pod -l app=order-service --timeout=300s
```

### 5. Access the Service

#### Option A: Port Forward (Recommended for Testing)

```bash
kubectl port-forward svc/order-service 3001:3001
```

The service is now accessible at `http://localhost:3001`

#### Option B: NodePort Service

Edit `k8s/order-service.yaml` and change `type: ClusterIP` to `type: NodePort`:

```yaml
spec:
  type: NodePort
```

Apply the change:
```bash
kubectl apply -f k8s/order-service.yaml
```

Get the NodePort:
```bash
kubectl get svc order-service
```

Access via Minikube IP:
```bash
MINIKUBE_IP=$(minikube ip)
curl http://$MINIKUBE_IP:NODE_PORT/health
```

### 6. Test the Service

Health check:
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok"
}
```

Create an order:
```bash
curl -X POST http://localhost:3001/v1/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-order-1" \
  -d '{
    "userId": "user-1",
    "eventId": "event-1",
    "seats": ["A1"],
    "paymentMethod": "credit_card"
  }'
```

### 7. View Logs

View Order Service logs:
```bash
kubectl logs -f deployment/order-service
```

View MongoDB logs:
```bash
kubectl logs -f deployment/mongo
```

### 8. Access MongoDB

Port forward to MongoDB:
```bash
kubectl port-forward svc/mongo 27017:27017
```

Connect with mongosh:
```bash
mongosh mongodb://localhost:27017/order
```

### 9. Clean Up

Delete all resources:
```bash
kubectl delete -f k8s/
```

Stop Minikube:
```bash
minikube stop
```

Delete Minikube cluster:
```bash
minikube delete
```

## Manifest Overview

- **configmap.yaml** — Non-sensitive environment variables (service URLs, ports, log level)
- **secret.yaml** — Sensitive data (MongoDB URI) — **Update before deploying to production**
- **pvc.yaml** — Persistent volume for MongoDB data
- **mongo-deployment.yaml** — MongoDB deployment with health checks and resource limits
- **mongo-service.yaml** — MongoDB ClusterIP service for internal communication
- **order-deployment.yaml** — Order Service deployment with:
  - Liveness probe (HTTP GET /health every 10s)
  - Readiness probe (HTTP GET /health every 5s)
  - Resource requests: 256Mi memory, 100m CPU
  - Resource limits: 512Mi memory, 500m CPU
  - Environment variables from ConfigMap and Secret
- **order-service.yaml** — Order Service ClusterIP service

## Production Considerations

1. **Image Registry** — Push images to a registry (Docker Hub, ECR, GCR) and update `imagePullPolicy` and image references
2. **Secrets Management** — Use Kubernetes Secrets or external secret management (Vault, AWS Secrets Manager)
3. **Replicas** — Increase replicas for high availability
4. **Resource Limits** — Adjust based on actual workload testing
5. **Ingress** — Use Ingress controller for external access instead of port-forward
6. **Monitoring** — Add Prometheus metrics and logging (ELK, Loki)
7. **Network Policies** — Restrict traffic between pods
8. **RBAC** — Configure role-based access control

## Troubleshooting

### Pod not starting

```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

### MongoDB connection issues

Verify MongoDB is running:
```bash
kubectl get pods -l app=mongo
kubectl logs -l app=mongo
```

Test MongoDB connectivity from Order Service pod:
```bash
kubectl exec -it <order-service-pod> -- mongosh mongodb://mongo:27017/order
```

### Service not accessible

Verify service exists:
```bash
kubectl get svc order-service
```

Check endpoints:
```bash
kubectl get endpoints order-service
```

### Image not found

Ensure image is loaded in Minikube:
```bash
minikube image ls | grep order-service
```

Rebuild and reload if necessary:
```bash
docker build -t order-service:latest .
minikube image load order-service:latest
```

