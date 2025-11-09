# User Service - Minikube Deployment Guide

This guide provides instructions for deploying the User Service microservice on Minikube.

## Prerequisites

Before deploying, ensure you have the following installed:

- [Docker](https://docs.docker.com/get-docker/)
- [Minikube](https://minikube.sigs.k8s.io/docs/start/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- Java 17 or higher (for local development)
- Maven 3.6+ (for local development)

## Quick Start

### 1. Start Minikube

```bash
minikube start --driver=docker --cpus=4 --memory=4096
```

### 2. Deploy to Minikube

Simply run the deployment script:

```bash
./deploy-minikube.sh
```

This script will:
- Start Minikube if not already running
- Build the Docker image inside Minikube's Docker daemon
- Create the `event-ticketing` namespace
- Deploy MySQL database with persistent storage
- Deploy the User Service
- Wait for all pods to be ready

### 3. Access the Service

Once deployment is complete, you can access the service at:

```bash
http://$(minikube ip):30081
```

Check health status:

```bash
curl http://$(minikube ip):30081/actuator/health
```

## Manual Deployment Steps

If you prefer to deploy manually:

### 1. Set Docker Environment

```bash
eval $(minikube docker-env)
```

### 2. Build Docker Image

```bash
docker build -t user-service:latest .
```

### 3. Apply Kubernetes Manifests

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Deploy MySQL
kubectl apply -f k8s/mysql-deployment.yaml

# Wait for MySQL to be ready
kubectl wait --for=condition=ready pod -l app=mysql -n event-ticketing --timeout=300s

# Deploy User Service
kubectl apply -f k8s/user-service-configmap.yaml
kubectl apply -f k8s/user-service-deployment.yaml
```

## Kubernetes Resources

The deployment includes:

- **Namespace**: `event-ticketing`
- **MySQL Deployment**: Database with persistent volume
- **MySQL Service**: Internal ClusterIP service
- **User Service Deployment**: Spring Boot application
- **User Service Service**: NodePort service (port 30081)

## Useful Commands

### View Resources

```bash
# List all pods
kubectl get pods -n event-ticketing

# List all services
kubectl get svc -n event-ticketing

# Get detailed pod information
kubectl describe pod <pod-name> -n event-ticketing
```

### View Logs

```bash
# User Service logs
kubectl logs -f deployment/user-service -n event-ticketing

# MySQL logs
kubectl logs -f deployment/mysql -n event-ticketing
```

### Access the Application

```bash
# Get Minikube IP
minikube ip

# Access the service
curl http://$(minikube ip):30081/actuator/health

# Test user registration (adjust endpoint based on your controller)
curl -X POST http://$(minikube ip):30081/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123","email":"test@example.com"}'
```

### Debug

```bash
# Execute commands inside a pod
kubectl exec -it deployment/user-service -n event-ticketing -- /bin/sh

# Port forward to local machine
kubectl port-forward svc/user-service 8081:8081 -n event-ticketing
```

### Minikube Dashboard

```bash
minikube dashboard
```

## Cleanup

To remove all deployed resources:

```bash
./undeploy-minikube.sh
```

Or manually:

```bash
kubectl delete -f k8s/user-service-deployment.yaml
kubectl delete -f k8s/user-service-configmap.yaml
kubectl delete -f k8s/mysql-deployment.yaml
kubectl delete namespace event-ticketing
```

## Configuration

### Environment Variables

The User Service uses the following configuration (in `k8s/user-service-deployment.yaml`):

- `SPRING_DATASOURCE_URL`: MySQL connection URL
- `SPRING_DATASOURCE_USERNAME`: Database username
- `SPRING_DATASOURCE_PASSWORD`: Database password (from secret)
- `JWT_SECRET`: Secret key for JWT token generation

### MySQL Configuration

- **Database Name**: `userdb`
- **Username**: `root`
- **Password**: `root` (change in production!)
- **Storage**: 1Gi persistent volume

### Scaling

To scale the User Service:

```bash
kubectl scale deployment user-service --replicas=3 -n event-ticketing
```

## Troubleshooting

### Pod Not Starting

```bash
# Check pod status
kubectl get pods -n event-ticketing

# View pod events
kubectl describe pod <pod-name> -n event-ticketing

# Check logs
kubectl logs <pod-name> -n event-ticketing
```

### Database Connection Issues

```bash
# Verify MySQL is running
kubectl get pods -l app=mysql -n event-ticketing

# Test MySQL connection
kubectl exec -it deployment/mysql -n event-ticketing -- mysql -u root -proot -e "SHOW DATABASES;"
```

### Image Pull Issues

Make sure you're using Minikube's Docker daemon:

```bash
eval $(minikube docker-env)
docker build -t user-service:latest .
```

### Health Check Failures

The deployment includes health checks that may take time to pass:
- Liveness probe: 60s initial delay
- Readiness probe: 30s initial delay

If pods are restarting, check:
```bash
kubectl logs <pod-name> -n event-ticketing --previous
```

## Production Considerations

Before deploying to production:

1. **Security**:
   - Change default MySQL password
   - Use Kubernetes Secrets for sensitive data
   - Enable HTTPS/TLS
   - Implement network policies

2. **Resources**:
   - Adjust CPU and memory limits based on load
   - Configure horizontal pod autoscaling

3. **Storage**:
   - Use appropriate storage class for your cloud provider
   - Configure backup strategy for MySQL

4. **Monitoring**:
   - Add Prometheus metrics
   - Configure log aggregation
   - Set up alerting

5. **High Availability**:
   - Deploy multiple replicas
   - Use MySQL replication or managed database service
   - Configure pod disruption budgets

## Next Steps

- Set up ingress controller for better routing
- Add monitoring with Prometheus and Grafana
- Implement CI/CD pipeline
- Configure horizontal pod autoscaling
- Add API Gateway for microservices

## Support

For issues or questions, please refer to the project documentation or create an issue in the repository.
