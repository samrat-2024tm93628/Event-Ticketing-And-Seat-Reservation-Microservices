#!/bin/bash

# Payment Service Undeployment Script for Minikube
# This script removes the payment service from Minikube

set -e

echo "=================================================="
echo "Payment Service Minikube Undeployment"
echo "=================================================="

# Step 1: Stop port forwarding if running
echo ""
echo "Step 1: Stopping port forwarding processes..."
PORT_FORWARD_PIDS=$(ps aux | grep "kubectl port-forward.*payment-service" | grep -v grep | awk '{print $2}')
if [ -n "$PORT_FORWARD_PIDS" ]; then
    echo "$PORT_FORWARD_PIDS" | xargs kill
    echo "✅ Port forwarding processes stopped"
else
    echo "ℹ️  No active port forwarding processes found"
fi

# Step 2: Delete Kubernetes resources
echo ""
echo "Step 2: Deleting Kubernetes resources..."

echo "   - Deleting Service..."
kubectl delete -f k8s/service.yaml --ignore-not-found=true

echo "   - Deleting Deployment..."
kubectl delete -f k8s/deployment.yaml --ignore-not-found=true

echo "   - Deleting Secret..."
kubectl delete -f k8s/secret.yaml --ignore-not-found=true

echo "   - Deleting ConfigMap..."
kubectl delete -f k8s/configmap.yaml --ignore-not-found=true

echo "✅ All Kubernetes resources deleted"

# Step 3: Wait for pods to terminate
echo ""
echo "Step 3: Waiting for pods to terminate..."
kubectl wait --for=delete pod -l app=payment-service --timeout=60s 2>/dev/null || echo "ℹ️  Pods already terminated"
echo "✅ All pods terminated"

# Step 4: Clean up Docker image (optional)
echo ""
echo "Step 4: Cleaning up Docker image..."
read -p "Do you want to remove the Docker image? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    eval $(minikube docker-env)
    docker rmi payment-service:latest 2>/dev/null || echo "ℹ️  Image already removed"
    echo "✅ Docker image removed"
else
    echo "ℹ️  Docker image kept"
fi

# Step 5: Display cleanup status
echo ""
echo "Step 5: Cleanup Status"
echo "======================"
echo "Remaining payment-service resources:"
kubectl get all -l app=payment-service

echo ""
echo "=================================================="
echo "✅ Undeployment completed successfully!"
echo "=================================================="
echo ""
echo "Note: Database 'payments_db' and data are preserved."
echo "To drop the database manually, run:"
echo "   PGPASSWORD=postgres psql -U postgres -h localhost -c 'DROP DATABASE payments_db;'"
