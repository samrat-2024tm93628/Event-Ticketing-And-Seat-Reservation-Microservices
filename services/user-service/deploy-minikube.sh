#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}User Service - Minikube Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if minikube is running
echo -e "\n${YELLOW}Checking Minikube status...${NC}"
if ! minikube status > /dev/null 2>&1; then
    echo -e "${RED}Minikube is not running. Starting Minikube...${NC}"
    minikube start --driver=docker --cpus=4 --memory=4096
else
    echo -e "${GREEN}Minikube is running${NC}"
fi

# Set Docker environment to use Minikube's Docker daemon
echo -e "\n${YELLOW}Setting Docker environment to Minikube...${NC}"
eval $(minikube docker-env)

# Build the Docker image
echo -e "\n${YELLOW}Building Docker image...${NC}"
docker build -t user-service:latest .

echo -e "${GREEN}Docker image built successfully${NC}"

# Deploy User Service ConfigMap
echo -e "\n${YELLOW}Deploying User Service ConfigMap...${NC}"
kubectl apply -f k8s/user-service-configmap.yaml

# Deploy User Service
echo -e "\n${YELLOW}Deploying User Service...${NC}"
kubectl apply -f k8s/user-service-deployment.yaml

# Wait for User Service to be ready
echo -e "\n${YELLOW}Waiting for User Service to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=user-service --timeout=300s

# Get the service URL
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}Service Information:${NC}"
echo -e "Namespace: default"
echo -e "Service URL (NodePort): http://$(minikube ip):30040"

# Set up port forwarding
echo -e "\n${YELLOW}Setting up port forwarding...${NC}"
echo -e "${YELLOW}Port forwarding: localhost:3004 -> user-service:3004${NC}"
kubectl port-forward service/user-service 3004:3004 > /dev/null 2>&1 &
PORT_FORWARD_PID=$!
sleep 2

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Port forwarding is active on localhost:3004${NC}"
echo -e "${GREEN}Port forward PID: ${PORT_FORWARD_PID}${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}Useful Commands:${NC}"
echo -e "View pods: ${GREEN}kubectl get pods${NC}"
echo -e "View services: ${GREEN}kubectl get svc${NC}"
echo -e "View logs: ${GREEN}kubectl logs -f deployment/user-service${NC}"
echo -e "Access via NodePort: ${GREEN}curl http://\$(minikube ip):30040/actuator/health${NC}"
echo -e "Access via port-forward: ${GREEN}curl http://localhost:3004/actuator/health${NC}"
echo -e "Stop port-forward: ${GREEN}kill ${PORT_FORWARD_PID}${NC}"
echo -e "Minikube dashboard: ${GREEN}minikube dashboard${NC}"

echo -e "\n${GREEN}User Service is now running!${NC}"
echo -e "\n${YELLOW}Note: Port forwarding is running in background (PID: ${PORT_FORWARD_PID})${NC}"
echo -e "${YELLOW}To stop it, run: kill ${PORT_FORWARD_PID}${NC}"
