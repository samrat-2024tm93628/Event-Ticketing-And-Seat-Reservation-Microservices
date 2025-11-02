# Order Service - Setup Summary

Complete microservice for order and ticketing with all infrastructure, models, controllers, and seed data.

## Project Structure

```
order-and-ticketing-service/
├── src/
│   ├── app.js                          # Express app bootstrap
│   ├── config/
│   │   ├── index.js                    # Config loader
│   │   ├── db.js                       # MongoDB connection with retry
│   │   └── logger.js                   # (deprecated, use utils/logger)
│   ├── models/
│   │   ├── Order.js                    # Order schema with optimistic concurrency
│   │   ├── Ticket.js                   # Ticket schema
│   │   └── IdempotencyKey.js           # Idempotency store with TTL
│   ├── controllers/
│   │   └── ordersController.js         # Order CRUD + orchestration
│   ├── services/
│   │   ├── reservationClient.js        # Reservation service HTTP client
│   │   └── paymentClient.js            # Payment service HTTP client
│   ├── routes/
│   │   ├── orders.js                   # Order endpoints
│   │   └── webhooks.js                 # Webhook endpoints
│   ├── middleware/
│   │   ├── idempotency.js              # Idempotency middleware
│   │   └── errorHandler.js             # Error handling middleware
│   ├── utils/
│   │   ├── logger.js                   # Winston logger
│   │   ├── calc.js                     # Order calculation utilities
│   │   └── idempotencyStore.js         # Idempotency key storage
│   ├── events/
│   │   └── handlers.js                 # Webhook event handlers
│   └── mocks/
│       ├── reservationMock.js          # Mock reservation service
│       └── paymentMock.js              # Mock payment service
├── scripts/
│   └── load-seed.js                    # CSV seed data loader
├── k8s/
│   ├── configmap.yaml                  # Kubernetes ConfigMap
│   ├── secret.yaml                     # Kubernetes Secret
│   ├── pvc.yaml                        # Persistent Volume Claim
│   ├── mongo-deployment.yaml           # MongoDB deployment
│   ├── mongo-service.yaml              # MongoDB service
│   ├── order-deployment.yaml           # Order Service deployment
│   └── order-service.yaml              # Order Service
├── data/
│   ├── etsr_orders.csv                 # 400 sample orders
│   ├── etsr_tickets.csv                # 995 sample tickets
│   ├── etsr_users.csv                  # 80 sample users
│   ├── etsr_events.csv                 # 60 sample events
│   ├── etsr_seats.csv                  # Seat data
│   ├── etsr_payments.csv               # Payment records
│   └── etsr_venues.csv                 # Venue data
├── Dockerfile                          # Docker image definition
├── docker-compose.yml                  # Local development stack
├── package.json                        # Dependencies
├── .env.example                        # Environment template
├── README.md                           # Main documentation
├── README-k8s.md                       # Kubernetes guide
├── SEED_DATA_GUIDE.md                  # Seed data loading guide
└── SETUP_SUMMARY.md                    # This file
```

## Quick Start

### 1. Local Development (Node.js)

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start MongoDB (separate terminal)
mongod

# Run in development mode
npm run dev
```

### 2. Docker Compose (Recommended)

```bash
# Start all services (MongoDB, Order Service, Mocks)
docker-compose up

# In another terminal, load seed data
docker-compose exec order-service node scripts/load-seed.js --file data/etsr_orders.csv --type orders
docker-compose exec order-service node scripts/load-seed.js --file data/etsr_tickets.csv --type tickets
```

### 3. Kubernetes (Minikube)

```bash
# Start Minikube
minikube start --cpus=4 --memory=4096

# Build and load image
docker build -t order-service:latest .
minikube image load order-service:latest

# Deploy
kubectl apply -f k8s/

# Port forward
kubectl port-forward svc/order-service 3001:3001
```

## API Endpoints

### Orders

- `POST /v1/orders` — Create order (requires Idempotency-Key header)
- `GET /v1/orders/:id` — Get order by ID
- `POST /v1/orders/:id/cancel` — Cancel order

### Webhooks

- `POST /v1/webhooks/payment` — Payment callback
- `POST /v1/webhooks/reservation` — Reservation callback

### Health

- `GET /health` — Service health check

## Key Features

✅ **Idempotency** — Duplicate request protection with TTL-based key storage
✅ **Orchestration** — Multi-step order workflow (reserve → charge → allocate → confirm)
✅ **Retry Logic** — Automatic retries for external service calls
✅ **Error Handling** — Comprehensive error handling with rollback on failure
✅ **Webhooks** — Asynchronous event handling for payment and reservation callbacks
✅ **Logging** — Winston logger with structured logging
✅ **Mongoose Models** — Optimistic concurrency, TTL indexes, proper validation
✅ **Docker** — Multi-container setup with Docker Compose
✅ **Kubernetes** — Production-ready K8s manifests with health checks
✅ **Seed Data** — 400 orders + 995 tickets for testing

## Environment Variables

```
MONGO_URI=mongodb://localhost:27017/order
PORT=3001
RESERVATION_SERVICE_URL=http://localhost:3002
PAYMENT_SERVICE_URL=http://localhost:3003
IDEMPOTENCY_TTL_SECONDS=3600
NODE_ENV=development
LOG_LEVEL=info
```

## Testing

### Manual Testing with curl

```bash
# Create order
curl -X POST http://localhost:3001/v1/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-1" \
  -d '{
    "userId": "user-1",
    "eventId": "event-1",
    "seats": ["A1"],
    "paymentMethod": "credit_card"
  }'

# Get order
curl http://localhost:3001/v1/orders/1

# Cancel order
curl -X POST http://localhost:3001/v1/orders/1/cancel
```

### Load Testing with Seed Data

```bash
# Load 400 orders
node scripts/load-seed.js --file data/etsr_orders.csv --type orders

# Query via API
curl http://localhost:3001/v1/orders/1
```

## Database

### MongoDB Collections

- **orders** — Order documents with status tracking
- **tickets** — Ticket documents linked to orders
- **idempotencykeys** — Idempotency key mappings (auto-expires)

### Indexes

- `orders.orderId` (unique)
- `orders.userId`
- `orders.eventId`
- `orders.status`
- `orders.paymentStatus`
- `tickets.ticketId` (unique)
- `tickets.orderId`
- `idempotencykeys.key` (unique)
- `idempotencykeys.expiresAt` (TTL)

## External Services

### Reservation Service (Mock)

- `POST /reserve` — Reserve seats temporarily
- `POST /allocate` — Allocate seats permanently
- `POST /release` — Release seats
- `POST /seat-prices` — Get seat prices

### Payment Service (Mock)

- `POST /charge` — Process payment (with Idempotency-Key)
- `POST /refund` — Process refund

## Deployment

### Docker

```bash
docker build -t order-service:latest .
docker run -p 3001:3001 \
  -e MONGO_URI=mongodb://mongo:27017/order \
  -e RESERVATION_SERVICE_URL=http://reservation:3002 \
  -e PAYMENT_SERVICE_URL=http://payment:3003 \
  order-service:latest
```

### Kubernetes

See `README-k8s.md` for detailed Kubernetes deployment instructions.

## Documentation

- **README.md** — Main documentation with API examples
- **README-k8s.md** — Kubernetes deployment guide
- **SEED_DATA_GUIDE.md** — Seed data loading and querying
- **SETUP_SUMMARY.md** — This file

## Next Steps

1. ✅ Load seed data: `node scripts/load-seed.js --file data/etsr_orders.csv --type orders`
2. ✅ Test API endpoints with curl commands in README.md
3. ✅ Deploy to Kubernetes using manifests in k8s/
4. ✅ Integrate with actual Reservation and Payment services
5. ✅ Add unit and integration tests
6. ✅ Set up CI/CD pipeline

## Support

For issues or questions:
1. Check logs: `npm run dev` or `docker-compose logs order-service`
2. Review README.md for API examples
3. Check SEED_DATA_GUIDE.md for data loading issues
4. Review README-k8s.md for Kubernetes deployment issues

