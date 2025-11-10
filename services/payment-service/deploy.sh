#!/bin/bash

# Payment Service Deployment Script for Minikube
# This script deploys the payment service to Minikube

set -e

echo "=================================================="
echo "Payment Service Minikube Deployment"
echo "=================================================="

# Step 1: Check if Minikube is running
echo ""
echo "Step 1: Checking Minikube status..."
if ! minikube status > /dev/null 2>&1; then
    echo "❌ Minikube is not running. Please start Minikube first:"
    echo "   minikube start"
    exit 1
fi
echo "✅ Minikube is running"

# Step 2: Set Docker environment to use Minikube's Docker daemon
echo ""
echo "Step 2: Setting Docker environment to Minikube..."
eval $(minikube docker-env)
echo "✅ Docker environment set to Minikube"

# Step 3: Build Docker image
echo ""
echo "Step 3: Building Docker image..."
docker build -t payment-service:latest .
echo "✅ Docker image built successfully"

# Step 4: Verify image exists in Minikube
echo ""
echo "Step 4: Verifying Docker image..."
if docker images | grep -q "payment-service"; then
    echo "✅ Docker image verified in Minikube"
else
    echo "❌ Docker image not found"
    exit 1
fi

# Step 5: Setup PostgreSQL database
echo ""
echo "Step 5: Setting up PostgreSQL database..."
echo "Checking if payments_db exists..."
if PGPASSWORD=postgres psql -U postgres -h localhost -lqt | cut -d \| -f 1 | grep -qw payments_db; then
    echo "✅ Database payments_db already exists"
else
    echo "Creating database payments_db..."
    PGPASSWORD=postgres psql -U postgres -h localhost -c "CREATE DATABASE payments_db;"
    echo "✅ Database created"
fi

echo "Initializing database schema..."
PGPASSWORD=postgres psql -U postgres -h localhost -d payments_db -f db/init.sql
echo "✅ Database schema initialized"

# Step 5b: Load seed data
echo ""
echo "Step 5b: Loading seed data..."
read -p "Do you want to load seed data from CSV? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "./load-seed-data.sh" ]; then
        bash ./load-seed-data.sh
        echo "✅ Seed data loaded"
    else
        echo "⚠️  Warning: load-seed-data.sh not found, skipping seed data"
    fi
else
    echo "ℹ️  Skipping seed data load"
fi

# Step 6: Apply Kubernetes manifests
echo ""
echo "Step 6: Applying Kubernetes manifests..."

echo "   - Applying ConfigMap..."
kubectl apply -f k8s/configmap.yaml

echo "   - Applying Secret..."
kubectl apply -f k8s/secret.yaml

echo "   - Applying Deployment..."
kubectl apply -f k8s/deployment.yaml

echo "   - Applying Service..."
kubectl apply -f k8s/service.yaml

echo "✅ All Kubernetes resources applied"

# Step 7: Wait for deployment to be ready
echo ""
echo "Step 7: Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=120s deployment/payment-service
echo "✅ Deployment is ready"

# Step 8: Display deployment status
echo ""
echo "Step 8: Deployment Status"
echo "========================="
kubectl get deployment payment-service
echo ""
kubectl get pods -l app=payment-service
echo ""
kubectl get service payment-service

# Step 9: Port forwarding
echo ""
echo "Step 9: Setting up port forwarding..."
echo ""
echo "To access the service on port 3003, run:"
echo "   kubectl port-forward service/payment-service 3003:3003"
echo ""
echo "Or run in background:"
echo "   kubectl port-forward service/payment-service 3003:3003 &"
echo ""
echo "Alternatively, access via NodePort:"
MINIKUBE_IP=$(minikube ip)
echo "   http://${MINIKUBE_IP}:30004"
echo ""
echo "=================================================="
echo "✅ Deployment completed successfully!"
echo "=================================================="
echo ""
echo "Quick test commands:"
echo "   curl http://localhost:3003/health"
echo "   (after running port-forward)"
