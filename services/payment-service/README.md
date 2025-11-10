# Payment Service

A microservice for processing payments in an event ticketing system.

## Quick Start

### Prerequisites
- Minikube
- kubectl
- Docker
- PostgreSQL (running locally)

### Deploy to Minikube

```bash
# Deploy the service (will prompt to load seed data)
./deploy.sh

# Set up port forwarding to access on port 3003
kubectl port-forward service/payment-service 3003:3003
```

### Data Management

```bash
# Load seed data from CSV (400 payment records)
./load-seed-data.sh

# Delete all data and reload from CSV
./reload-data.sh
```

### Test the Service

```bash
# Health check
curl http://localhost:3003/health
```

### Undeploy

```bash
./undeploy.sh
```

## Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide with all steps, API examples, and troubleshooting
- **[DATA_MANAGEMENT.md](DATA_MANAGEMENT.md)** - Seed data loading and management guide
- **[COMMANDS.sh](COMMANDS.sh)** - Quick reference of all common commands

## Scripts

- **`deploy.sh`** - Automated deployment script for Minikube (includes seed data option)
- **`undeploy.sh`** - Automated undeployment script
- **`load-seed-data.sh`** - Load 400+ payment records from CSV
- **`reload-data.sh`** - Delete and reload all data from CSV

## Architecture

- **Service Port**: 3003 (container and host port)
- **NodePort**: 30004 (direct Minikube access)
- **Database**: PostgreSQL (local, accessed via host.minikube.internal)
- **Authentication**: JWT with role-based access control

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/v1/payments/charge` | Process a payment |
| GET | `/v1/payments/:id` | Get payment by ID |
| GET | `/v1/payments/order/:orderId` | Get payments by order ID |
| GET | `/v1/debug/decode-token` | Decode JWT (dev only) |

## Sample cURL Commands

### Health Check
```bash
curl http://localhost:3003/health
```

### Process Payment
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

### Get Payment by ID
```bash
curl -X GET http://localhost:3003/v1/payments/1 \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

### Generate JWT Token for Testing
```bash
node generateToken.cjs
```

## Kubernetes Resources

- **Deployment**: `k8s/deployment.yaml`
- **Service**: `k8s/service.yaml` (NodePort 30004)
- **ConfigMap**: `k8s/configmap.yaml`
- **Secret**: `k8s/secret.yaml`

## Development

### Local Development
```bash
npm install
npm start
```

### Rebuild and Redeploy
```bash
eval $(minikube docker-env)
docker build -t payment-service:latest .
kubectl rollout restart deployment/payment-service
```

## Database

The service uses PostgreSQL with the following tables:
- `payments` - Payment transactions
- `idempotency_keys` - Idempotency tracking

Schema is automatically initialized by `deploy.sh` from `db/init.sql`.

## License

ISC
