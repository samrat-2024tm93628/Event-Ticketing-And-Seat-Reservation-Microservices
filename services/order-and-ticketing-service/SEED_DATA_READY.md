# ✅ Seed Data Integration Complete

The seed loader has been successfully updated to work with your CSV data files.

## What Was Done

### 1. Updated Seed Loader Script
**File**: `scripts/load-seed.js`

The loader now correctly maps your CSV columns to the Order Service models:

**Orders Mapping** (etsr_orders.csv):
```
order_id        → orderId
user_id         → userId
event_id        → eventId
status          → status (converted to uppercase)
payment_status  → paymentStatus (converted to uppercase)
order_total     → total
(calculated)    → tax (5% of total)
(empty)         → seats (will be populated from tickets)
```

**Tickets Mapping** (etsr_tickets.csv):
```
ticket_id       → ticketId
order_id        → orderId
event_id        → eventId
seat_id         → seat
price_paid      → price
(current time)  → issuedAt
```

### 2. Updated Documentation
- **README.md** — Added seed data loading section with actual CSV file names
- **SEED_DATA_GUIDE.md** — Comprehensive guide for loading and querying seed data
- **SETUP_SUMMARY.md** — Complete project overview
- **TEST_SEED_LOADER.md** — Testing procedures and verification steps

## Your CSV Data

Located in `data/` directory:

| File | Rows | Purpose |
|------|------|---------|
| etsr_orders.csv | 400 | Order records |
| etsr_tickets.csv | 995 | Ticket records |
| etsr_users.csv | 80 | User reference data |
| etsr_events.csv | 60 | Event reference data |
| etsr_seats.csv | - | Seat reference data |
| etsr_payments.csv | - | Payment reference data |
| etsr_venues.csv | - | Venue reference data |

## Quick Start

### Option 1: Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start MongoDB (in another terminal)
mongod

# 3. Load orders
node scripts/load-seed.js --file data/etsr_orders.csv --type orders

# 4. Load tickets
node scripts/load-seed.js --file data/etsr_tickets.csv --type tickets

# 5. Start the service
npm run dev

# 6. Test API
curl http://localhost:3001/v1/orders/1
```

### Option 2: Docker Compose

```bash
# 1. Start all services
docker-compose up -d

# 2. Wait for services to be ready (10-15 seconds)
sleep 15

# 3. Load orders
docker-compose exec order-service node scripts/load-seed.js --file data/etsr_orders.csv --type orders

# 4. Load tickets
docker-compose exec order-service node scripts/load-seed.js --file data/etsr_tickets.csv --type tickets

# 5. Test API
curl http://localhost:3001/v1/orders/1
```

## Verify Data Loaded

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/order

# Check counts
db.orders.countDocuments()      # Should show 400
db.tickets.countDocuments()     # Should show 995

# View sample order
db.orders.findOne()

# View sample ticket
db.tickets.findOne()

# Find tickets for order 1
db.tickets.find({ orderId: "1" })
```

## Expected Results

### After Loading Orders
```
[info]: Loading orders from data/etsr_orders.csv
[info]: Inserted order: 1
[info]: Inserted order: 2
...
[info]: Inserted order: 400
[info]: Loaded 400 orders from CSV
```

### After Loading Tickets
```
[info]: Loading tickets from data/etsr_tickets.csv
[info]: Inserted ticket: 1
[info]: Inserted ticket: 2
...
[info]: Inserted ticket: 995
[info]: Loaded 995 tickets from CSV
```

### Sample Order in MongoDB
```javascript
{
  _id: ObjectId("..."),
  orderId: "1",
  userId: "23",
  eventId: "25",
  seats: [],
  total: 940.73,
  tax: 47.04,
  status: "CREATED",
  paymentStatus: "SUCCESS",
  createdAt: ISODate("2024-01-28T22:02:21.000Z"),
  updatedAt: ISODate("...")
}
```

### Sample Ticket in MongoDB
```javascript
{
  _id: ObjectId("..."),
  ticketId: "1",
  orderId: "1",
  eventId: "25",
  seat: "3121",
  price: 895.93,
  issuedAt: ISODate("...")
}
```

## API Testing

Once data is loaded, test the API:

```bash
# Get order 1 with all tickets
curl http://localhost:3001/v1/orders/1

# Response includes order details and associated tickets
{
  "order": {
    "orderId": "1",
    "userId": "23",
    "eventId": "25",
    "total": 940.73,
    "tax": 47.04,
    "status": "CREATED",
    "paymentStatus": "SUCCESS"
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
```bash
# Ensure you're in the project root
pwd  # Should end with: order-and-ticketing-service
ls data/etsr_orders.csv  # Should exist
```

### "MongoDB connection failed" Error
```bash
# Start MongoDB
mongod

# Or with Docker
docker run -d -p 27017:27017 mongo:6
```

### "Duplicate key error" Error
```bash
# Clear existing data
mongosh mongodb://localhost:27017/order
db.orders.deleteMany({})
db.tickets.deleteMany({})
exit

# Reload
node scripts/load-seed.js --file data/etsr_orders.csv --type orders
node scripts/load-seed.js --file data/etsr_tickets.csv --type tickets
```

## Documentation Files

- **README.md** — Main API documentation with curl examples
- **SEED_DATA_GUIDE.md** — Detailed seed data loading guide
- **SETUP_SUMMARY.md** — Complete project structure and setup
- **TEST_SEED_LOADER.md** — Testing procedures and verification
- **README-k8s.md** — Kubernetes deployment guide
- **SEED_DATA_READY.md** — This file

## Next Steps

1. ✅ Load seed data using the commands above
2. ✅ Verify data in MongoDB
3. ✅ Test API endpoints with curl
4. ✅ Deploy to Docker Compose or Kubernetes
5. ✅ Integrate with actual Reservation and Payment services
6. ✅ Add unit and integration tests

## Support

For detailed information:
- **Loading data**: See SEED_DATA_GUIDE.md
- **Testing**: See TEST_SEED_LOADER.md
- **API usage**: See README.md
- **Kubernetes**: See README-k8s.md
- **Project structure**: See SETUP_SUMMARY.md

---

**Status**: ✅ Ready to load seed data and test the Order Service!

