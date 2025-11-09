#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}User Service - Minikube Cleanup${NC}"
echo -e "${YELLOW}========================================${NC}"

# Delete User Service
echo -e "\n${YELLOW}Deleting User Service...${NC}"
kubectl delete -f k8s/user-service-deployment.yaml --ignore-not-found=true

# Delete ConfigMap
echo -e "\n${YELLOW}Deleting User Service ConfigMap...${NC}"
kubectl delete -f k8s/user-service-configmap.yaml --ignore-not-found=true

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Cleanup completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
