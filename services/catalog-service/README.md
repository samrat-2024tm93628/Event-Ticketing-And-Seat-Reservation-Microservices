# Catalog Service

Event catalog service for managing venues and events in a microservices architecture.

## Tech Stack
- **Java 17**
- **Spring Boot 3.5.7**
- **MySQL 8.0**
- **Docker & Kubernetes**

## Prerequisites
- Java 17 or higher
- MySQL 8.0 running locally
- Docker (for containerization)
- Minikube (for Kubernetes deployment)

## Database Setup

Create the database before running the service:

```sql
CREATE DATABASE catalog_db;
```

**Database Configuration:**
- Host: `localhost`
- Port: `3306`
- Database: `catalog_db`
- Username: `root`
- Password: `Root@12345`

Update credentials in `src/main/resources/application.properties` if needed.

## Running the Application

### Option 1: Run Locally (Port 3005)

```bash
./mvnw spring-boot:run
```

Service will be available at: `http://localhost:3005`

### Option 2: Run with Docker Compose

```bash
docker-compose up --build
```

This starts the catalog service (MySQL is expected to run locally).

### Option 3: Deploy to Minikube

1. **Ensure Minikube is running:**
```bash
minikube start
```

2. **Deploy the service:**
```bash
./deploy-to-minikube.sh
```

The script will automatically set up port-forwarding to `localhost:3005`.

Service accessible at: `http://localhost:3005`

**Note:** Press `Ctrl+C` to stop port-forwarding. Direct Minikube access also available at: `http://$(minikube ip):30050`

## API Endpoints

### Venues

**Create Venue:**
```bash
curl -X POST http://localhost:3005/venues \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Madison Square Garden",
    "city": "New York",
    "capacity": 20000
  }'
```

**Get All Venues:**
```bash
curl http://localhost:3005/venues
```

**Get Venue by ID:**
```bash
curl http://localhost:3005/venues/1
```

### Events

**Create Event:**
```bash
curl -X POST http://localhost:3005/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Rock Concert 2025",
    "eventType": "Concert",
    "eventDate": "2025-12-15",
    "basePrice": 150.00,
    "status": "AVAILABLE",
    "venue": {
      "venueId": 1
    }
  }'
```

**Get All Events:**
```bash
curl http://localhost:3005/events
```

**Get Event by ID:**
```bash
curl http://localhost:3005/events/1
```

**Get Events by Venue:**
```bash
curl http://localhost:3005/events/venue/1
```

## Kubernetes Management

**View Logs:**
```bash
kubectl logs -l app=catalog-service -f
```

**Check Pod Status:**
```bash
kubectl get pods -l app=catalog-service
```

**Check Service:**
```bash
kubectl get svc catalog-service
```

**Scale Deployment:**
```bash
kubectl scale deployment catalog-service --replicas=2
```

**Restart Deployment:**
```bash
kubectl rollout restart deployment catalog-service
```

**Undeploy from Minikube:**
```bash
./undeploy-from-minikube.sh
```

## Project Structure

```
catalog-service/
├── src/
│   ├── main/
│   │   ├── java/com/event/catalogservice/
│   │   │   ├── controller/        # REST controllers
│   │   │   ├── entity/            # JPA entities
│   │   │   ├── repository/        # Data repositories
│   │   │   └── service/           # Business logic
│   │   └── resources/
│   │       └── application.properties
├── k8s/                           # Kubernetes manifests
│   ├── configmap.yaml
│   ├── deployment.yaml
│   └── service.yaml
├── Dockerfile                     # Multi-stage Docker build
├── docker-compose.yml
├── deploy-to-minikube.sh         # Deployment script with port-forwarding
└── undeploy-from-minikube.sh     # Cleanup script
```

## Configuration

The service runs on **port 3005** by default. Database connection is configured to use:
- `localhost:3306` for local development
- `host.minikube.internal:3306` for Minikube deployment

## Troubleshooting

**Permission denied for mvnw:**
```bash
chmod +x mvnw
```

**Minikube image pull issues:**
```bash
eval $(minikube docker-env)
docker build -t catalog-service:latest .
kubectl rollout restart deployment catalog-service
```

**View application logs:**
```bash
kubectl logs -l app=catalog-service --tail=100
```