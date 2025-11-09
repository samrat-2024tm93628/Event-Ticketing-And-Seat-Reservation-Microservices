#!/bin/bash

# Payment Service - Quick Reference Commands
# This file contains common commands for managing the payment service

# ============================================
# DEPLOYMENT COMMANDS
# ============================================

# Start Minikube
minikube start

# Deploy the service
./deploy.sh

# Set up port forwarding (foreground)
kubectl port-forward service/payment-service 3003:3003

# Set up port forwarding (background)
kubectl port-forward service/payment-service 3003:3003 &

# Undeploy the service
./undeploy.sh

# ============================================
# MONITORING COMMANDS
# ============================================

# Check deployment status
kubectl get deployment payment-service

# Check pods
kubectl get pods -l app=payment-service

# Check service
kubectl get service payment-service

# View logs (follow)
kubectl logs -l app=payment-service -f

# View logs (last 100 lines)
kubectl logs -l app=payment-service --tail=100

# Describe pod (for debugging)
kubectl describe pod -l app=payment-service

# Check resource usage
kubectl top pod -l app=payment-service

# ============================================
# TESTING COMMANDS
# ============================================

# Health check
curl http://localhost:3003/health

# Decode JWT token (dev only)
curl -X GET http://localhost:3003/v1/debug/decode-token \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"

# Test protected endpoint
curl -X GET http://localhost:3003/v1/payments/test-protected \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"

# Process payment
curl -X POST http://localhost:3003/v1/payments/charge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -d '{
    "order_id": 1,
    "amount": 99.99,
    "method": "credit_card",
    "idempotency_key": "unique-key-123"
  }'

# Get payment by ID
curl -X GET http://localhost:3003/v1/payments/1 \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"

# Get payments by order ID
curl -X GET http://localhost:3003/v1/payments/order/1 \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"

# ============================================
# CONFIGURATION COMMANDS
# ============================================

# Update ConfigMap
kubectl apply -f k8s/configmap.yaml

# Update Secret
kubectl apply -f k8s/secret.yaml

# Restart deployment (after config change)
kubectl rollout restart deployment/payment-service

# Watch rollout status
kubectl rollout status deployment/payment-service

# ============================================
# DATA MANAGEMENT COMMANDS
# ============================================

# Load seed data from CSV (400+ records)
./load-seed-data.sh

# Delete and reload all data
./reload-data.sh

# Backup data
PGPASSWORD=postgres pg_dump -U postgres -h localhost -d payments_db -t payments -t idempotency_keys --data-only > backup_$(date +%Y%m%d_%H%M%S).sql

# ============================================
# DATABASE COMMANDS
# ============================================

# Connect to PostgreSQL
PGPASSWORD=postgres psql -U postgres -h localhost -d payments_db

# Create database
PGPASSWORD=postgres psql -U postgres -h localhost -c 'CREATE DATABASE payments_db;'

# Initialize schema
PGPASSWORD=postgres psql -U postgres -h localhost -d payments_db -f db/init.sql

# Drop database
PGPASSWORD=postgres psql -U postgres -h localhost -c 'DROP DATABASE payments_db;'

# Query payments (from command line)
PGPASSWORD=postgres psql -U postgres -h localhost -d payments_db -c 'SELECT * FROM payments;'

# Query payment statistics
PGPASSWORD=postgres psql -U postgres -h localhost -d payments_db -c "SELECT status, COUNT(*) as count, SUM(amount) as total FROM payments GROUP BY status;"

# ============================================
# DOCKER COMMANDS
# ============================================

# Set Docker to use Minikube
eval $(minikube docker-env)

# Build Docker image
docker build -t payment-service:latest .

# List Docker images
docker images | grep payment-service

# Remove Docker image
docker rmi payment-service:latest

# ============================================
# JWT TOKEN COMMANDS
# ============================================

# Generate JWT token
node generateToken.cjs

# Verify JWT token
node verifyToken.cjs <YOUR_JWT_TOKEN>

# ============================================
# TROUBLESHOOTING COMMANDS
# ============================================

# Stop port forwarding
pkill -f "kubectl port-forward.*payment-service"

# Delete and recreate resources
kubectl delete -f k8s/
kubectl apply -f k8s/

# Get Minikube IP (for NodePort access)
minikube ip

# Access via NodePort (without port-forward)
# http://<MINIKUBE_IP>:30004

# SSH into Minikube
minikube ssh

# Execute command in pod
kubectl exec -it deployment/payment-service -- sh

# Test connectivity from pod to local PostgreSQL
kubectl exec -it deployment/payment-service -- ping host.minikube.internal

# View all resources
kubectl get all -l app=payment-service

# ============================================
# CLEANUP COMMANDS
# ============================================

# Stop port forwarding
pkill -f "kubectl port-forward.*payment-service"

# Delete all resources
kubectl delete -f k8s/

# Stop Minikube
minikube stop

# Delete Minikube cluster
minikube delete
