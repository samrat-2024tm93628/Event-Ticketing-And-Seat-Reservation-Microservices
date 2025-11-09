#!/bin/bash

# =============================================================================
# Minikube Deployment Script for Order Service
# =============================================================================
# This script automates the complete deployment of the Order Service to Minikube
# including MongoDB, service deployment, and optional seed data loading.
#
# Usage:
#   ./deploy-minikube.sh                    # Standard deployment with prompts
#   ./deploy-minikube.sh --clean            # Clean and redeploy
#   ./deploy-minikube.sh --skip-build       # Skip Docker build
#   ./deploy-minikube.sh --skip-seed        # Skip seed data loading
#   ./deploy-minikube.sh --auto-seed        # Automatically load seed data
#
# =============================================================================

set -e  # Exit on error

# =============================================================================
# CONFIGURATION
# =============================================================================
MINIKUBE_CPUS=${MINIKUBE_CPUS:-4}
MINIKUBE_MEMORY=${MINIKUBE_MEMORY:-4096}
IMAGE_NAME="order-service:latest"
NAMESPACE="default"

# =============================================================================
# COLOR CODES FOR OUTPUT
# =============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

check_prerequisites() {
    print_info "Checking prerequisites..."
    
    if ! command -v minikube &> /dev/null; then
        print_error "minikube is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        print_error "docker is not installed. Please install it first."
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

start_minikube() {
    print_info "Starting Minikube..."
    
    if minikube status &> /dev/null; then
        print_warning "Minikube is already running"
    else
        minikube start --cpus=$MINIKUBE_CPUS --memory=$MINIKUBE_MEMORY
        print_success "Minikube started successfully"
    fi
    
    print_info "Minikube status:"
    minikube status
}

build_and_load_image() {
    print_info "Building Docker image..."
    docker build -t $IMAGE_NAME .
    print_success "Docker image built successfully"
    
    print_info "Loading image into Minikube..."
    minikube image load $IMAGE_NAME
    print_success "Image loaded into Minikube"
    
    print_info "Verifying image in Minikube..."
    if minikube image ls | grep -q "order-service"; then
        print_success "Image verified in Minikube"
    else
        print_error "Image not found in Minikube"
        exit 1
    fi
}

deploy_kubernetes_resources() {
    print_info "Deploying Kubernetes resources..."
    
    # Apply in specific order for dependencies
    print_info "Creating PVC..."
    kubectl apply -f k8s/pvc.yaml
    
    print_info "Creating ConfigMap and Secret..."
    kubectl apply -f k8s/configmap.yaml
    kubectl apply -f k8s/secret.yaml
    
    print_info "Deploying MongoDB..."
    kubectl apply -f k8s/mongo-deployment.yaml
    kubectl apply -f k8s/mongo-service.yaml
    
    print_info "Deploying Order Service..."
    kubectl apply -f k8s/order-deployment.yaml
    kubectl apply -f k8s/order-service.yaml
    
    print_success "All Kubernetes resources deployed"
}

wait_for_pods() {
    print_info "Waiting for pods to be ready..."
    
    print_info "Waiting for MongoDB (timeout: 300s)..."
    if kubectl wait --for=condition=ready pod -l app=mongo --timeout=300s; then
        print_success "MongoDB is ready"
    else
        print_error "MongoDB failed to become ready"
        kubectl get pods -l app=mongo
        kubectl logs -l app=mongo --tail=50
        exit 1
    fi
    
    print_info "Waiting for Order Service (timeout: 300s)..."
    if kubectl wait --for=condition=ready pod -l app=order-service --timeout=300s; then
        print_success "Order Service is ready"
    else
        print_error "Order Service failed to become ready"
        kubectl get pods -l app=order-service
        kubectl logs -l app=order-service --tail=50
        exit 1
    fi
}

verify_deployment() {
    print_info "Verifying deployment..."
    echo ""
    
    print_info "Deployments:"
    kubectl get deployments
    echo ""
    
    print_info "Pods:"
    kubectl get pods
    echo ""
    
    print_info "Services:"
    kubectl get services
    echo ""
}

test_service() {
    print_info "Testing service health..."
    
    # Start port-forward in background
    kubectl port-forward svc/order-service 3001:3001 > /dev/null 2>&1 &
    PORT_FORWARD_PID=$!
    
    # Wait for port-forward to be ready
    sleep 3
    
    # Test health endpoint
    if curl -s http://localhost:3001/health | grep -q "ok"; then
        print_success "Service health check passed"
    else
        print_warning "Service health check failed, but service might still be starting"
    fi
    
    # Kill port-forward
    kill $PORT_FORWARD_PID 2> /dev/null || true
}

load_seed_data() {
    print_info "Loading seed data..."
    
    # Get the order-service pod name
    POD_NAME=$(kubectl get pods -l app=order-service -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$POD_NAME" ]; then
        print_error "Could not find order-service pod"
        return 1
    fi
    
    print_info "Using pod: $POD_NAME"
    
    # Check if seed data files exist
    if [ ! -f "data/etsr_orders.csv" ]; then
        print_warning "Orders seed file not found: data/etsr_orders.csv"
    else
        print_info "Loading orders from data/etsr_orders.csv..."
        if kubectl exec $POD_NAME -- node scripts/load-seed.js --file data/etsr_orders.csv --type orders; then
            print_success "Orders loaded successfully"
        else
            print_error "Failed to load orders"
        fi
    fi
    
    if [ ! -f "data/etsr_tickets.csv" ]; then
        print_warning "Tickets seed file not found: data/etsr_tickets.csv"
    else
        print_info "Loading tickets from data/etsr_tickets.csv..."
        if kubectl exec $POD_NAME -- node scripts/load-seed.js --file data/etsr_tickets.csv --type tickets; then
            print_success "Tickets loaded successfully"
        else
            print_error "Failed to load tickets"
        fi
    fi
}

verify_seed_data() {
    print_info "Verifying seed data..."
    
    # Use kubectl exec to verify data directly from the pod
    POD_NAME=$(kubectl get pods -l app=order-service -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$POD_NAME" ]; then
        print_error "Could not find order-service pod"
        return 1
    fi
    
    print_info "Checking database counts..."
    
    # Execute verification script inside the pod
    VERIFY_RESULT=$(kubectl exec $POD_NAME -- node -e "
        const mongoose = require('mongoose');
        mongoose.connect(process.env.MONGO_URI).then(() => 
            Promise.all([
                mongoose.connection.db.collection('orders').countDocuments(),
                mongoose.connection.db.collection('tickets').countDocuments()
            ])
        ).then(([orders, tickets]) => {
            console.log('Orders: ' + orders);
            console.log('Tickets: ' + tickets);
            process.exit(0);
        }).catch(err => {
            console.error('Error:', err.message);
            process.exit(1);
        });
    " 2>&1)
    
    echo "$VERIFY_RESULT" | while read line; do
        print_info "$line"
    done
    
    print_success "Seed data verification complete"
}

print_access_info() {
    echo ""
    print_success "=== Deployment Complete ==="
    echo ""
    print_info "To access the Order Service, run:"
    echo -e "  ${GREEN}kubectl port-forward svc/order-service 3001:3001${NC}"
    echo ""
    print_info "Then access the service at:"
    echo -e "  ${GREEN}http://localhost:3001${NC}"
    echo ""
    print_info "Health check:"
    echo -e "  ${GREEN}curl http://localhost:3001/health${NC}"
    echo ""
    print_info "To view logs:"
    echo -e "  ${GREEN}kubectl logs -f deployment/order-service${NC}"
    echo ""
    print_info "To access MongoDB:"
    echo -e "  ${GREEN}kubectl port-forward svc/mongo 27017:27017${NC}"
    echo -e "  ${GREEN}mongosh mongodb://localhost:27017/order-service${NC}"
    echo ""
    print_info "To clean up:"
    echo -e "  ${GREEN}kubectl delete -f k8s/${NC}"
    echo -e "  ${GREEN}minikube stop${NC}"
    echo ""
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================
main() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║         Minikube Deployment - Order Service                   ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Parse command line arguments
    SKIP_BUILD=false
    SKIP_SEED=false
    AUTO_SEED=false
    CLEAN=false
    
    for arg in "$@"; do
        case $arg in
            --skip-build)
                SKIP_BUILD=true
                ;;
            --skip-seed)
                SKIP_SEED=true
                ;;
            --auto-seed)
                AUTO_SEED=true
                ;;
            --clean)
                CLEAN=true
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --clean         Clean up existing resources before deploying"
                echo "  --skip-build    Skip building and loading Docker image"
                echo "  --skip-seed     Skip loading seed data (don't prompt)"
                echo "  --auto-seed     Automatically load seed data without prompting"
                echo "  --help, -h      Show this help message"
                echo ""
                echo "Environment Variables:"
                echo "  MINIKUBE_CPUS      Number of CPUs for Minikube (default: 4)"
                echo "  MINIKUBE_MEMORY    Memory for Minikube in MB (default: 4096)"
                echo ""
                echo "Examples:"
                echo "  $0                      # Standard deployment"
                echo "  $0 --clean              # Clean and redeploy"
                echo "  $0 --auto-seed          # Deploy and auto-load seed data"
                echo "  $0 --skip-build         # Skip Docker build step"
                echo ""
                exit 0
                ;;
        esac
    done
    
    # Step 1: Clean up if requested
    if [ "$CLEAN" = true ]; then
        print_step "Cleaning up existing resources..."
        kubectl delete -f k8s/ 2> /dev/null || true
        print_success "Cleanup complete"
        sleep 5
    fi
    
    # Step 2: Prerequisites check
    print_step "Checking prerequisites..."
    check_prerequisites
    
    # Step 3: Start Minikube
    print_step "Starting Minikube cluster..."
    start_minikube
    
    # Step 4: Build and load Docker image
    if [ "$SKIP_BUILD" = false ]; then
        print_step "Building and loading Docker image..."
        build_and_load_image
    else
        print_warning "Skipping image build (--skip-build flag set)"
    fi
    
    # Step 5: Deploy Kubernetes resources
    print_step "Deploying Kubernetes resources..."
    deploy_kubernetes_resources
    
    # Step 6: Wait for pods to be ready
    print_step "Waiting for pods to be ready..."
    wait_for_pods
    
    # Step 7: Verify deployment
    print_step "Verifying deployment..."
    verify_deployment
    
    # Step 8: Test service health
    print_step "Testing service health..."
    test_service
    
    # Step 9: Load seed data
    if [ "$SKIP_SEED" = false ]; then
        echo ""
        if [ "$AUTO_SEED" = true ]; then
            print_step "Auto-loading seed data..."
            load_seed_data
            verify_seed_data
        else
            read -p "$(echo -e ${CYAN}Do you want to load seed data? \(y/N\): ${NC})" -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                print_step "Loading seed data..."
                load_seed_data
                verify_seed_data
            else
                print_info "Skipping seed data loading"
            fi
        fi
    else
        print_warning "Skipping seed data loading (--skip-seed flag set)"
    fi
    
    # Step 10: Display access information
    print_access_info
}

# Run main function
main "$@"
