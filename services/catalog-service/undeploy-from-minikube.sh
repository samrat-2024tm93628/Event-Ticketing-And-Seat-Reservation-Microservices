#!/bin/bash

# Colors for output
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${RED}Deleting Kubernetes resources...${NC}"

kubectl delete -f k8s/service.yaml
kubectl delete -f k8s/deployment.yaml
kubectl delete -f k8s/configmap.yaml

echo -e "${RED}✓ All resources deleted${NC}"
