#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Building Docker image in Minikube context...${NC}"

# Set docker environment to use minikube's docker daemon
eval $(minikube docker-env)

# Build the Docker image
docker build -t catalog-service:latest .

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Docker build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker image built successfully${NC}"

echo -e "${YELLOW}Deploying to Kubernetes...${NC}"

# Apply Kubernetes manifests
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

echo -e "${GREEN}✓ Deployment complete${NC}"

echo -e "${YELLOW}Waiting for pod to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=catalog-service --timeout=180s

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Pod failed to become ready. Check logs with: kubectl logs -l app=catalog-service${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Pod is ready${NC}"

# Get the service URL
MINIKUBE_IP=$(minikube ip)
echo -e "${GREEN}Service is accessible at: http://${MINIKUBE_IP}:30050${NC}"

echo -e "\n${YELLOW}Pod status:${NC}"
kubectl get pods -l app=catalog-service

echo -e "\n${YELLOW}Service status:${NC}"
kubectl get svc catalog-service

echo -e "\n${YELLOW}View logs:${NC}"
echo -e "${GREEN}kubectl logs -l app=catalog-service -f${NC}"

echo -e "\n${YELLOW}Starting port-forward to localhost:3005...${NC}"
echo -e "${GREEN}Service will be accessible at: http://localhost:3005${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop port-forwarding${NC}\n"

kubectl port-forward service/catalog-service 3005:3005
