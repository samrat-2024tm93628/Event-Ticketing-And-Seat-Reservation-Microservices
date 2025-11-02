# Order Service

Order and Ticketing Microservice for Event Management System.

## Prerequisites

- Node.js 18+
- MongoDB

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration (MongoDB URI, service URLs, etc.)

## Running

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The service will start on the port specified in `.env` (default: 3001).

## Health Check

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok"
}
```

## Docker Compose (Local Development)

Run the entire stack locally with MongoDB, Order Service, and mock Reservation/Payment services:

```bash
docker-compose up
```

This will start:
- **MongoDB** on port 27017
- **Order Service** on port 3001
- **Reservation Mock** on port 3002
- **Payment Mock** on port 3003

All services are configured to communicate with each other. The Order Service will automatically connect to MongoDB and the mock services.

### Stopping Services

```bash
docker-compose down
```

To also remove volumes:
```bash
docker-compose down -v
```

## Seed Data Loading

Load sample orders or tickets from CSV files in the `data/` directory:

```bash
# Load orders from CSV
node scripts/load-seed.js --file data/etsr_orders.csv --type orders

# Load tickets from CSV
node scripts/load-seed.js --file data/etsr_tickets.csv --type tickets
```

### CSV Format

**Orders CSV** (`etsr_orders.csv`):
```
order_id,user_id,event_id,status,payment_status,order_total,created_at
1,23,25,CREATED,SUCCESS,940.73,2024-01-28 22:02:21
```

**Tickets CSV** (`etsr_tickets.csv`):
```
ticket_id,order_id,event_id,seat_id,price_paid
1,1,25,3121,895.93
```

### Loading Data with Docker Compose

If using Docker Compose, you can load seed data after the services are running:

```bash
# Start services
docker-compose up -d

# Wait for MongoDB to be ready (about 10 seconds)
sleep 10

# Load orders
docker-compose exec order-service node scripts/load-seed.js --file data/etsr_orders.csv --type orders

# Load tickets
docker-compose exec order-service node scripts/load-seed.js --file data/etsr_tickets.csv --type tickets
```

### Verifying Loaded Data

Query MongoDB to verify data was loaded:

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/order-service

# Count orders
db.orders.countDocuments()

# Count tickets
db.tickets.countDocuments()

# View sample order
db.orders.findOne()
```

## API Examples

### 1. Create Order (with Idempotency)

```bash
curl -X POST http://localhost:3001/v1/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: order-123-unique-key" \
  -d '{
    "userId": "user-1",
    "eventId": "event-1",
    "seats": ["A1", "A2"],
    "paymentMethod": "credit_card"
  }'
```

Expected response (200):
```json
{
  "message": "Order created successfully",
  "order": {
    "_id": "...",
    "orderId": "...",
    "userId": "user-1",
    "eventId": "event-1",
    "seats": ["A1", "A2"],
    "total": 200,
    "tax": 10,
    "status": "CONFIRMED",
    "paymentStatus": "PAID",
    "createdAt": "...",
    "updatedAt": "..."
  },
  "tickets": [
    {
      "ticketId": "...",
      "orderId": "...",
      "seat": "A1",
      "price": 100
    },
    {
      "ticketId": "...",
      "orderId": "...",
      "seat": "A2",
      "price": 100
    }
  ]
}
```

### 2. Get Order

```bash
curl http://localhost:3001/v1/orders/ORD-001
```

Expected response (200):
```json
{
  "order": { ... },
  "tickets": [ ... ]
}
```

### 3. Cancel Order

```bash
curl -X POST http://localhost:3001/v1/orders/ORD-001/cancel
```

Expected response (200):
```json
{
  "message": "Order cancelled successfully",
  "order": {
    "status": "CANCELLED",
    ...
  }
}
```

### 4. Payment Webhook (Simulate Payment Success)

```bash
curl -X POST http://localhost:3001/v1/webhooks/payment \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-001",
    "status": "PAID",
    "paymentId": "PAY-12345"
  }'
```

Expected response (200):
```json
{
  "message": "Payment callback processed successfully"
}
```

### 5. Reservation Webhook (Simulate Expiration)

```bash
curl -X POST http://localhost:3001/v1/webhooks/reservation \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-001",
    "event": "event-1",
    "seats": ["A1", "A2"],
    "action": "EXPIRED"
  }'
```

Expected response (200):
```json
{
  "message": "Reservation callback processed successfully"
}
```

## End-to-End Testing with Docker Compose

1. Start all services:
```bash
docker-compose up
```

2. Create an order:
```bash
IDEMPOTENCY_KEY="test-order-$(date +%s)"
curl -X POST http://localhost:3001/v1/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{
    "userId": "test-user",
    "eventId": "test-event",
    "seats": ["A1"],
    "paymentMethod": "credit_card"
  }'
```

3. Retrieve the order (replace ORD-ID with actual orderId from response):
```bash
curl http://localhost:3001/v1/orders/ORD-ID
```

4. Test idempotency by creating the same order again with the same Idempotency-Key:
```bash
curl -X POST http://localhost:3001/v1/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{
    "userId": "test-user",
    "eventId": "test-event",
    "seats": ["A1"],
    "paymentMethod": "credit_card"
  }'
```

You should receive the same order response (HTTP 200) instead of creating a new order.

5. Cancel the order:
```bash
curl -X POST http://localhost:3001/v1/orders/ORD-ID/cancel
```

