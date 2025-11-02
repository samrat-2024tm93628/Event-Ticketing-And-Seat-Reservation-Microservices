# Seed Data Loading Guide

This guide explains how to load the provided CSV seed data into the Order Service database.

## Available Seed Data Files

Located in `data/` directory:

- **etsr_orders.csv** — 400 sample orders with various statuses and payment states
- **etsr_tickets.csv** — 995 sample tickets associated with orders
- **etsr_users.csv** — 80 sample users (reference data)
- **etsr_events.csv** — 60 sample events (reference data)
- **etsr_seats.csv** — Seat information (reference data)
- **etsr_payments.csv** — Payment records (reference data)
- **etsr_venues.csv** — Venue information (reference data)

## Quick Start

### Prerequisites

- MongoDB running (locally or via Docker)
- Node.js 18+
- Dependencies installed: `npm install`

### Load Orders

```bash
node scripts/load-seed.js --file data/etsr_orders.csv --type orders
```

Expected output:
```
[info]: Loading orders from data/etsr_orders.csv
[info]: Inserted order: 1
[info]: Inserted order: 2
...
[info]: Loaded 400 orders from CSV
```

### Load Tickets

```bash
node scripts/load-seed.js --file data/etsr_tickets.csv --type tickets
```

Expected output:
```
[info]: Loading tickets from data/etsr_tickets.csv
[info]: Inserted ticket: 1
[info]: Inserted ticket: 2
...
[info]: Loaded 995 tickets from CSV
```

## Using with Docker Compose

### 1. Start Services

```bash
docker-compose up -d
```

Wait for services to be ready (about 10-15 seconds).

### 2. Load Data

```bash
# Load orders
docker-compose exec order-service node scripts/load-seed.js --file data/etsr_orders.csv --type orders

# Load tickets
docker-compose exec order-service node scripts/load-seed.js --file data/etsr_tickets.csv --type tickets
```

### 3. Verify Data

```bash
# Connect to MongoDB
docker-compose exec mongo mongosh mongodb://localhost:27017/order

# In mongosh shell:
db.orders.countDocuments()      # Should show 400
db.tickets.countDocuments()     # Should show 995
db.orders.findOne()             # View sample order
```

## Data Structure

### Orders CSV Format

| Column | Type | Example |
|--------|------|---------|
| order_id | Integer | 1 |
| user_id | Integer | 23 |
| event_id | Integer | 25 |
| status | String | CREATED, CONFIRMED, CANCELLED |
| payment_status | String | SUCCESS, PENDING, FAILED |
| order_total | Float | 940.73 |
| created_at | DateTime | 2024-01-28 22:02:21 |

### Tickets CSV Format

| Column | Type | Example |
|--------|------|---------|
| ticket_id | Integer | 1 |
| order_id | Integer | 1 |
| event_id | Integer | 25 |
| seat_id | Integer | 3121 |
| price_paid | Float | 895.93 |

## Data Mapping

The seed loader maps CSV columns to Order Service models:

### Orders Mapping

```
CSV Column          → Order Model Field
order_id            → orderId
user_id             → userId
event_id            → eventId
status              → status (converted to uppercase)
payment_status      → paymentStatus (converted to uppercase)
order_total         → total
(calculated)        → tax (5% of total)
(empty)             → seats (populated from tickets)
```

### Tickets Mapping

```
CSV Column          → Ticket Model Field
ticket_id           → ticketId
order_id            → orderId
event_id            → eventId
seat_id             → seat
price_paid          → price
(current time)      → issuedAt
```

## Querying Loaded Data

### MongoDB Shell

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/order

# Count documents
db.orders.countDocuments()
db.tickets.countDocuments()

# Find orders by status
db.orders.find({ status: "CONFIRMED" }).count()
db.orders.find({ paymentStatus: "SUCCESS" }).count()

# Find tickets for a specific order
db.tickets.find({ orderId: "1" })

# Aggregate: Total revenue from confirmed orders
db.orders.aggregate([
  { $match: { status: "CONFIRMED" } },
  { $group: { _id: null, totalRevenue: { $sum: "$total" } } }
])
```

### API Queries

```bash
# Get a specific order
curl http://localhost:3001/v1/orders/1

# Expected response:
{
  "order": {
    "_id": "...",
    "orderId": "1",
    "userId": "23",
    "eventId": "25",
    "total": 940.73,
    "tax": 47.04,
    "status": "CREATED",
    "paymentStatus": "SUCCESS",
    "createdAt": "2024-01-28T22:02:21.000Z",
    "updatedAt": "..."
  },
  "tickets": [
    {
      "ticketId": "1",
      "orderId": "1",
      "eventId": "25",
      "seat": "3121",
      "price": 895.93
    }
  ]
}
```

## Troubleshooting

### "File not found" Error

Ensure you're running the command from the project root directory:
```bash
pwd  # Should show: .../order-and-ticketing-service
```

### "MongoDB connection failed" Error

Ensure MongoDB is running:
```bash
# Local MongoDB
mongosh mongodb://localhost:27017

# Docker MongoDB
docker-compose exec mongo mongosh
```

### Duplicate Key Error

If you get a duplicate key error, the data may already be loaded. Clear the database:
```bash
# Using MongoDB shell
db.orders.deleteMany({})
db.tickets.deleteMany({})

# Then reload
node scripts/load-seed.js --file data/etsr_orders.csv --type orders
node scripts/load-seed.js --file data/etsr_tickets.csv --type tickets
```

### Partial Load

If the loader stops midway, check the logs for specific row errors. You can:
1. Fix the CSV if needed
2. Clear the database
3. Reload from the beginning

## Performance Notes

- Loading 400 orders: ~2-5 seconds
- Loading 995 tickets: ~5-10 seconds
- Total time: ~10-15 seconds

For larger datasets, consider:
- Using bulk insert operations
- Increasing MongoDB connection pool size
- Running on a machine with more resources

## Next Steps

After loading seed data:

1. **Test API endpoints** — Use the sample orders to test GET, POST, and cancel operations
2. **Run integration tests** — Test order creation workflow with real data
3. **Analyze data** — Use MongoDB queries to understand data distribution
4. **Performance testing** — Load test with the seed data as baseline

