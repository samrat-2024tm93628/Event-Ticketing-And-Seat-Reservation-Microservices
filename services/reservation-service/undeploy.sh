#!/bin/bash

# Undeploy Reservation Service from Minikube
# This script removes all Kubernetes resources

set -e

echo "🗑️  Starting undeployment of Reservation Service from Minikube..."

# Kill any port-forward processes for this service
echo "🔌 Stopping any active port-forwarding..."
pkill -f "kubectl port-forward service/reservation-service" 2>/dev/null || true

# Delete Kubernetes resources
echo "☸️  Deleting Kubernetes resources..."
kubectl delete -f k8s/service.yaml --ignore-not-found=true
kubectl delete -f k8s/deployment.yaml --ignore-not-found=true

# Wait for pods to be terminated
echo "⏳ Waiting for pods to be terminated..."
kubectl wait --for=delete pod -l app=reservation-service --timeout=60s 2>/dev/null || true

echo "✅ Undeployment completed successfully!"
echo ""
echo "📝 Cleanup options:"
echo ""
echo "   To remove the Docker image from Minikube:"
echo "   eval \$(minikube docker-env) && docker rmi reservation-service:latest"
echo ""
echo "   To clean up the database (if needed):"
echo "   psql -U postgres -d reservationdb -c 'TRUNCATE seat_availability, seat_holds, seat_allocations, idempotency_keys CASCADE;'"
