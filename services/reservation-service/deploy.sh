#!/bin/bash

# Deploy Reservation Service to Minikube
# This script builds the Docker image and deploys to Minikube

set -e

echo "🚀 Starting deployment of Reservation Service to Minikube..."

# Check if minikube is running
if ! minikube status &> /dev/null; then
    echo "❌ Minikube is not running. Please start minikube first with: minikube start"
    exit 1
fi

# Set Docker environment to use Minikube's Docker daemon
echo "📦 Setting Docker environment to Minikube..."
eval $(minikube docker-env)

# Build Docker image
echo "🔨 Building Docker image..."
docker build -t reservation-service:latest .

# Apply Kubernetes manifests
echo "☸️  Applying Kubernetes manifests..."
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# Wait for deployment to be ready
echo "⏳ Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=120s deployment/reservation-service

# Seed data
echo "🌱 Seeding database with initial data..."
if [ -f "data/etsr_seats.csv" ]; then
    DATABASE_URL="postgres://postgres:postgres@localhost:5432/reservationdb" npm run seed data/etsr_seats.csv
    echo "✅ Database seeded successfully!"
else
    echo "⚠️  Warning: data/etsr_seats.csv not found. Skipping seed data."
fi

# Get the service URL
echo "✅ Deployment completed successfully!"
echo ""
echo "📍 Service Information:"
kubectl get service reservation-service
echo ""
echo "🌐 Service URL:"
echo "   $(minikube service reservation-service --url)"
echo ""
echo "📊 To view logs, run:"
echo "   kubectl logs -f deployment/reservation-service"
echo ""
echo "🔌 Starting port forwarding on localhost:3002..."
echo "   Access the service at: http://localhost:3002"
echo "   Press Ctrl+C to stop"
echo ""
echo "🏥 Health check: curl http://localhost:3002/health"
echo ""

kubectl port-forward service/reservation-service 3002:3002
