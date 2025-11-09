# Payment Service - Minikube Deployment Guide

This guide provides step-by-step instructions to deploy the Payment Service on Minikube and access it via port 3003.

## Prerequisites

- **Minikube** installed and running
- **kubectl** installed and configured
- **Docker** installed
- **PostgreSQL** installed locally and running
- **Node.js** (for local development/testing)

## Architecture

The Payment Service is a Node.js microservice that:
- Handles payment processing for orders
- Stores payment transactions in PostgreSQL
- Implements idempotency for payment requests
- Uses JWT authentication with role-based access control
- Exposes a health check endpoint

## Project Structure

```
payment-service/
├── server.js                 # Main application server
├── package.json             # Node.js dependencies
├── dockerfile               # Docker image definition
├── deploy.sh               # Deployment script
├── undeploy.sh             # Undeployment script
├── db/
│   └── init.sql            # Database schema
├── src/
│   ├── auth/
│   │   └── authMiddleware.js
│   └── db/
│       └── dbClient.js
└── k8s/
    ├── deployment.yaml     # Kubernetes deployment
    ├── service.yaml        # Kubernetes service (NodePort)
    ├── configmap.yaml      # Configuration
    └── secret.yaml         # Secrets (DB credentials, JWT secret)
```

## Deployment Steps

### Step 1: Start Minikube

```bash
minikube start
```

Verify Minikube is running:
```bash
minikube status
```

### Step 2: Ensure PostgreSQL is Running

Make sure PostgreSQL is running on your local machine:
```bash
# Check if PostgreSQL is running
ps aux | grep postgres

# Or using brew services (macOS)
brew services list | grep postgresql
```

### Step 3: Run Deployment Script

Navigate to the payment-service directory and run:

```bash
./deploy.sh
```

The deployment script will:
1. ✅ Check Minikube status
2. ✅ Configure Docker to use Minikube's Docker daemon
3. ✅ Build the Docker image
4. ✅ Create/verify PostgreSQL database `payments_db`
5. ✅ Initialize database schema
6. ✅ Apply Kubernetes ConfigMap and Secret
7. ✅ Deploy the application
8. ✅ Create the Service (NodePort)
9. ✅ Wait for pods to be ready

### Step 4: Set Up Port Forwarding

After deployment, forward port 3003 to the service:

```bash
kubectl port-forward service/payment-service 3003:3003
```

To run in background:
```bash
kubectl port-forward service/payment-service 3003:3003 &
```

Alternatively, access via NodePort (without port forwarding):
```bash
# Get Minikube IP
minikube ip

# Access service at http://<MINIKUBE_IP>:30004
```

### Step 5: Load Seed Data (Optional)

The deployment script will prompt you to load seed data. Alternatively, load it manually:

```bash
./load-seed-data.sh
```

This will load 400+ payment records from `data/etsr_payments.csv`.

### Step 6: Verify Deployment

Check the deployment status:
```bash
kubectl get pods -l app=payment-service
kubectl get service payment-service
kubectl get deployment payment-service
```

Check logs:
```bash
kubectl logs -l app=payment-service -f
```

## API Endpoints

### Health Check
```bash
curl http://localhost:3003/health
```

**Expected Response:**
```
Payment Service is running
```

### Debug: Decode JWT Token (Dev Only)
```bash
curl -X GET http://localhost:3003/v1/debug/decode-token \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**Expected Response:**
```json
{
  "decoded": {
    "sub": "user123",
    "role": "admin",
    "iat": 1699564800,
    "exp": 1699651200
  }
}
```

### Protected Test Endpoint
```bash
curl -X GET http://localhost:3003/v1/payments/test-protected \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**Expected Response (with valid token):**
```json
{
  "message": "Access granted to protected route",
  "user": {
    "sub": "user123",
    "role": "admin"
  }
}
```

### Process Payment (Charge)
```bash
curl -X POST http://localhost:3003/v1/payments/charge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -d '{
    "order_id": 1,
    "amount": 99.99,
    "method": "credit_card",
    "idempotency_key": "unique-key-123"
  }'
```

**Expected Response (Success):**
```json
{
  "payment_id": 1,
  "order_id": 1,
  "amount": "99.99",
  "method": "credit_card",
  "status": "SUCCESS",
  "reference": "TXN-a1b2c3d4",
  "created_at": "2025-11-09T12:00:00.000Z"
}
```

**Expected Response (Failure - simulated 20% failure rate):**
```json
{
  "payment_id": 2,
  "order_id": 1,
  "amount": "99.99",
  "method": "credit_card",
  "status": "FAILED",
  "reference": "TXN-e5f6g7h8",
  "created_at": "2025-11-09T12:00:00.000Z"
}
```

### Get Payment by ID
```bash
curl -X GET http://localhost:3003/v1/payments/1 \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**Expected Response:**
```json
{
  "payment_id": 1,
  "order_id": 1,
  "amount": "99.99",
  "method": "credit_card",
  "status": "SUCCESS",
  "reference": "TXN-a1b2c3d4",
  "created_at": "2025-11-09T12:00:00.000Z"
}
```

### Get Payments by Order ID
```bash
curl -X GET http://localhost:3003/v1/payments/order/1 \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

**Expected Response:**
```json
[
  {
    "payment_id": 1,
    "order_id": 1,
    "amount": "99.99",
    "method": "credit_card",
    "status": "SUCCESS",
    "reference": "TXN-a1b2c3d4",
    "created_at": "2025-11-09T12:00:00.000Z"
  }
]
```

## Generating JWT Tokens for Testing

The service includes scripts to generate and verify JWT tokens:

### Generate a Token
```bash
node generateToken.cjs
```

This will output a JWT token that you can use in your API requests.

### Verify a Token
```bash
node verifyToken.cjs <YOUR_JWT_TOKEN>
```

## Configuration

### Environment Variables

The service uses the following environment variables (configured via ConfigMap and Secret):

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | 3003 |
| `DB_HOST` | PostgreSQL host | host.minikube.internal |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_USER` | Database user | postgres |
| `DB_PASS` | Database password | postgres |
| `DB_NAME` | Database name | payments_db |
| `JWT_SECRET` | JWT signing secret | dev_secret_key |
| `JWT_ISSUER` | JWT issuer | https://auth.local/ |
| `JWT_AUDIENCE` | JWT audience | payment-service |

### Modifying Configuration

To update configuration:

1. Edit `k8s/configmap.yaml` (for non-sensitive data)
2. Edit `k8s/secret.yaml` (for sensitive data)
3. Apply changes:
```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
```
4. Restart the deployment:
```bash
kubectl rollout restart deployment/payment-service
```

## Undeployment

To remove the Payment Service from Minikube:

```bash
./undeploy.sh
```

The undeployment script will:
1. ✅ Stop any port-forwarding processes
2. ✅ Delete Kubernetes Service
3. ✅ Delete Kubernetes Deployment
4. ✅ Delete Secrets and ConfigMaps
5. ✅ Wait for pods to terminate
6. ✅ Optionally remove Docker image

**Note:** The database and data are preserved. To drop the database:
```bash
PGPASSWORD=postgres psql -U postgres -h localhost -c 'DROP DATABASE payments_db;'
```

## Troubleshooting

### Pods not starting
```bash
# Check pod status
kubectl get pods -l app=payment-service

# Check pod logs
kubectl logs -l app=payment-service

# Describe pod for events
kubectl describe pod -l app=payment-service
```

### Database connection issues
```bash
# Verify PostgreSQL is accessible from Minikube
# The service uses host.minikube.internal to connect to local PostgreSQL

# Test connection from within pod
kubectl exec -it deployment/payment-service -- sh
# Inside pod:
# ping host.minikube.internal
```

### Port forwarding not working
```bash
# Kill existing port-forward processes
pkill -f "kubectl port-forward.*payment-service"

# Start fresh port-forward
kubectl port-forward service/payment-service 3003:3003
```

### Image not found
```bash
# Make sure to build image in Minikube's Docker environment
eval $(minikube docker-env)
docker build -t payment-service:latest .

# Verify image exists
docker images | grep payment-service
```

## Monitoring

### Check Service Health
```bash
# Via port-forward
curl http://localhost:3003/health

# Via NodePort
curl http://$(minikube ip):30004/health
```

### View Logs
```bash
# Real-time logs
kubectl logs -l app=payment-service -f

# Last 100 lines
kubectl logs -l app=payment-service --tail=100
```

### Resource Usage
```bash
# CPU and memory usage
kubectl top pod -l app=payment-service
```

## Data Management

### Load Seed Data

Load 400+ payment records from CSV:

```bash
./load-seed-data.sh
```

Features:
- Loads data from `data/etsr_payments.csv`
- Shows statistics (SUCCESS, FAILED, PENDING counts)
- Updates sequence for new payment IDs
- Displays sample records

### Reload Data

Delete all existing data and reload from CSV:

```bash
./reload-data.sh
```

This script:
- Prompts for confirmation
- Optionally creates a backup
- Clears all payment and idempotency data
- Reloads seed data from CSV

### Backup Data

```bash
# Manual backup
PGPASSWORD=postgres pg_dump -U postgres -h localhost -d payments_db -t payments -t idempotency_keys --data-only > backup.sql

# Restore backup
PGPASSWORD=postgres psql -U postgres -h localhost -d payments_db < backup.sql
```

## Database Operations

### Connect to PostgreSQL
```bash
PGPASSWORD=postgres psql -U postgres -h localhost -d payments_db
```

### Query Payments
```sql
-- View all payments
SELECT * FROM payments;

-- View payments by status
SELECT * FROM payments WHERE status = 'SUCCESS';

-- View payments by order
SELECT * FROM payments WHERE order_id = 1;

-- Payment statistics
SELECT 
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount
FROM payments
GROUP BY status;

-- View idempotency keys
SELECT * FROM idempotency_keys;
```

### Reset Database
```bash
# Drop and recreate database
PGPASSWORD=postgres psql -U postgres -h localhost -c 'DROP DATABASE payments_db;'
PGPASSWORD=postgres psql -U postgres -h localhost -c 'CREATE DATABASE payments_db;'
PGPASSWORD=postgres psql -U postgres -h localhost -d payments_db -f db/init.sql
```

## Development

### Local Development (without Kubernetes)
```bash
# Install dependencies
npm install

# Set up database
PGPASSWORD=postgres psql -U postgres -h localhost -c 'CREATE DATABASE payments_db;'
PGPASSWORD=postgres psql -U postgres -h localhost -d payments_db -f db/init.sql

# Run locally
npm start
```

### Rebuild and Redeploy
```bash
# Build new image
eval $(minikube docker-env)
docker build -t payment-service:latest .

# Restart deployment
kubectl rollout restart deployment/payment-service
```

## Security Notes

⚠️ **Important:** This setup is for development purposes only.

- JWT secret is hardcoded (use proper secret management in production)
- Database credentials are in plain ConfigMap/Secret (use external secret managers)
- `/v1/debug/decode-token` endpoint should be removed in production
- Payment simulation uses random success/failure (implement real payment gateway)

## License

ISC

## Support

For issues or questions, please check the logs and troubleshooting section above.
