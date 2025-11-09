#!/bin/bash

# =============================================================================
# Minikube Cleanup Script for Order Service
# =============================================================================
# This script removes all Kubernetes resources and optionally stops/deletes
# the Minikube cluster.
#
# Usage:
#   ./cleanup-minikube.sh                   # Remove K8s resources only
#   ./cleanup-minikube.sh --stop            # Remove resources and stop Minikube
#   ./cleanup-minikube.sh --delete          # Remove resources and delete Minikube cluster
#   ./cleanup-minikube.sh --full            # Full cleanup (delete cluster and images)
#
# =============================================================================

set -e  # Exit on error

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

# =============================================================================
# CLEANUP FUNCTIONS
# =============================================================================
cleanup_kubernetes_resources() {
    print_step "Removing Kubernetes resources..."
    
    if kubectl delete -f k8s/ 2> /dev/null; then
        print_success "Kubernetes resources removed"
    else
        print_warning "No Kubernetes resources found or already removed"
    fi
    
    # Wait for resources to be deleted
    print_info "Waiting for resources to be fully deleted..."
    sleep 5
    
    # Check if any resources remain
    REMAINING_PODS=$(kubectl get pods 2>/dev/null | grep -E "order-service|mongo" | wc -l || echo "0")
    if [ "$REMAINING_PODS" -gt 0 ]; then
        print_warning "Some pods still terminating..."
        kubectl get pods | grep -E "order-service|mongo" || true
    else
        print_success "All resources cleaned up"
    fi
}

stop_minikube() {
    print_step "Stopping Minikube cluster..."
    
    if minikube status &> /dev/null; then
        minikube stop
        print_success "Minikube cluster stopped"
    else
        print_warning "Minikube is not running"
    fi
}

delete_minikube() {
    print_step "Deleting Minikube cluster..."
    
    if minikube status &> /dev/null; then
        minikube delete
        print_success "Minikube cluster deleted"
    else
        print_warning "Minikube cluster does not exist"
    fi
}

cleanup_docker_images() {
    print_step "Removing Docker images..."
    
    if docker images | grep -q "order-service"; then
        docker rmi order-service:latest 2>/dev/null || print_warning "Failed to remove order-service image"
        print_success "Docker images cleaned up"
    else
        print_info "No order-service images found"
    fi
}

show_status() {
    echo ""
    print_info "Current status:"
    echo ""
    
    # Check Minikube status
    if minikube status &> /dev/null; then
        echo -e "  ${GREEN}●${NC} Minikube: Running"
    else
        echo -e "  ${RED}●${NC} Minikube: Stopped/Not found"
    fi
    
    # Check Kubernetes resources
    PODS=$(kubectl get pods 2>/dev/null | grep -E "order-service|mongo" | wc -l || echo "0")
    if [ "$PODS" -gt 0 ]; then
        echo -e "  ${GREEN}●${NC} K8s Resources: $PODS pods running"
    else
        echo -e "  ${GRAY}●${NC} K8s Resources: None"
    fi
    
    # Check Docker images
    IMAGES=$(docker images | grep -c "order-service" || echo "0")
    if [ "$IMAGES" -gt 0 ]; then
        echo -e "  ${GREEN}●${NC} Docker Images: $IMAGES order-service image(s)"
    else
        echo -e "  ${GRAY}●${NC} Docker Images: None"
    fi
    
    echo ""
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================
main() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║         Minikube Cleanup - Order Service                      ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Parse command line arguments
    STOP_MINIKUBE=false
    DELETE_MINIKUBE=false
    FULL_CLEANUP=false
    
    for arg in "$@"; do
        case $arg in
            --stop)
                STOP_MINIKUBE=true
                ;;
            --delete)
                DELETE_MINIKUBE=true
                ;;
            --full)
                FULL_CLEANUP=true
                DELETE_MINIKUBE=true
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --stop          Remove resources and stop Minikube cluster"
                echo "  --delete        Remove resources and delete Minikube cluster"
                echo "  --full          Full cleanup (delete cluster and Docker images)"
                echo "  --help, -h      Show this help message"
                echo ""
                echo "Default (no options): Only removes Kubernetes resources"
                echo ""
                echo "Examples:"
                echo "  $0                      # Remove K8s resources only"
                echo "  $0 --stop               # Remove resources and stop Minikube"
                echo "  $0 --delete             # Remove resources and delete cluster"
                echo "  $0 --full               # Complete cleanup including images"
                echo ""
                exit 0
                ;;
        esac
    done
    
    # Show current status
    show_status
    
    # Confirm cleanup
    echo -e "${YELLOW}⚠ WARNING: This will remove deployed resources${NC}"
    if [ "$DELETE_MINIKUBE" = true ]; then
        echo -e "${YELLOW}⚠ WARNING: This will DELETE the Minikube cluster${NC}"
    fi
    if [ "$FULL_CLEANUP" = true ]; then
        echo -e "${YELLOW}⚠ WARNING: This will also remove Docker images${NC}"
    fi
    echo ""
    
    read -p "$(echo -e ${CYAN}Are you sure you want to continue? \(y/N\): ${NC})" -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Cleanup cancelled"
        exit 0
    fi
    
    echo ""
    
    # Execute cleanup steps
    cleanup_kubernetes_resources
    
    if [ "$STOP_MINIKUBE" = true ]; then
        stop_minikube
    fi
    
    if [ "$DELETE_MINIKUBE" = true ]; then
        delete_minikube
    fi
    
    if [ "$FULL_CLEANUP" = true ]; then
        cleanup_docker_images
    fi
    
    echo ""
    print_success "=== Cleanup Complete ==="
    echo ""
    
    # Show final status
    show_status
    
    # Provide next steps
    if [ "$DELETE_MINIKUBE" = false ]; then
        print_info "To redeploy, run: ./deploy-minikube.sh"
        if [ "$STOP_MINIKUBE" = false ]; then
            print_info "To stop Minikube: ./cleanup-minikube.sh --stop"
        fi
    else
        print_info "To start fresh, run: ./deploy-minikube.sh"
    fi
    echo ""
}

# Run main function
main "$@"
