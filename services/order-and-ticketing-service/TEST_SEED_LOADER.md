# Testing Seed Loader

Quick verification that the seed loader works with the provided CSV data.

## CSV Data Summary

### etsr_orders.csv
- **Rows**: 400 orders (+ 1 header row = 401 total lines)
- **Columns**: order_id, user_id, event_id, status, payment_status, order_total, created_at
- **Sample**: 
  ```
  1,23,25,CREATED,SUCCESS,940.73,2024-01-28 22:02:21
  ```

### etsr_tickets.csv
- **Rows**: 995 tickets (+ 1 header row = 996 total lines)
- **Columns**: ticket_id, order_id, event_id, seat_id, price_paid
- **Sample**:
  ```
  1,1,25,3121,895.93
  ```

## Seed Loader Mapping

### Orders CSV → Order Model

| CSV Column | Model Field | Transformation |
|------------|-------------|-----------------|
| order_id | orderId | Direct mapping |
| user_id | userId | Direct mapping |
| event_id | eventId | Direct mapping |
| status | status | Uppercase conversion |
| payment_status | paymentStatus | Uppercase conversion |
| order_total | total | Parse as float |
| (calculated) | tax | 5% of total |
| (empty) | seats | Empty array |

### Tickets CSV → Ticket Model

| CSV Column | Model Field | Transformation |
|------------|-------------|-----------------|
| ticket_id | ticketId | Direct mapping |
| order_id | orderId | Direct mapping |
| event_id | eventId | Direct mapping |
| seat_id | seat | Direct mapping |
| price_paid | price | Parse as float |
| (current) | issuedAt | Current timestamp |

## Test Steps

### 1. Verify MongoDB Connection

```bash
# Start MongoDB (if not running)
mongod

# Or with Docker
docker run -d -p 27017:27017 mongo:6
```

### 2. Load Orders

```bash
node scripts/load-seed.js --file data/etsr_orders.csv --type orders
```

**Expected Output**:
```
[info]: Loading orders from data/etsr_orders.csv
[info]: Inserted order: 1
[info]: Inserted order: 2
...
[info]: Inserted order: 400
[info]: Loaded 400 orders from CSV
```

### 3. Load Tickets

```bash
node scripts/load-seed.js --file data/etsr_tickets.csv --type tickets
```

**Expected Output**:
```
[info]: Loading tickets from data/etsr_tickets.csv
[info]: Inserted ticket: 1
[info]: Inserted ticket: 2
...
[info]: Inserted ticket: 995
[info]: Loaded 995 tickets from CSV
```

### 4. Verify Data in MongoDB

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/order

# Count documents
db.orders.countDocuments()      # Should return 400
db.tickets.countDocuments()     # Should return 995

# View sample order
db.orders.findOne()

# View sample ticket
db.tickets.findOne()

# Check order with tickets
db.orders.findOne({ orderId: "1" })
db.tickets.find({ orderId: "1" })
```

### 5. Verify Data Transformation

```bash
# Check order total and tax calculation
db.orders.findOne({ orderId: "1" })
# Expected: { total: 940.73, tax: 47.04 (5% of 940.73) }

# Check payment status mapping
db.orders.find({ paymentStatus: "SUCCESS" }).count()
# Should return count of orders with SUCCESS status

# Check ticket price
db.tickets.findOne({ ticketId: "1" })
# Expected: { price: 895.93 }
```

## Troubleshooting

### Issue: "File not found"

**Solution**: Ensure you're in the project root directory:
```bash
pwd  # Should end with: order-and-ticketing-service
ls data/etsr_orders.csv  # Should exist
```

### Issue: "MongoDB connection failed"

**Solution**: Start MongoDB:
```bash
# Local
mongod

# Docker
docker run -d -p 27017:27017 mongo:6

# Docker Compose
docker-compose up mongo
```

### Issue: "Duplicate key error"

**Solution**: Clear existing data:
```bash
mongosh mongodb://localhost:27017/order
db.orders.deleteMany({})
db.tickets.deleteMany({})
exit
```

Then reload:
```bash
node scripts/load-seed.js --file data/etsr_orders.csv --type orders
node scripts/load-seed.js --file data/etsr_tickets.csv --type tickets
```

### Issue: Partial load (some rows fail)

**Cause**: Invalid data in CSV row
**Solution**: Check logs for specific row errors, fix CSV if needed, clear DB, and reload

## Performance Metrics

- **Orders Load Time**: ~2-5 seconds (400 rows)
- **Tickets Load Time**: ~5-10 seconds (995 rows)
- **Total Time**: ~10-15 seconds
- **Database Size**: ~5-10 MB

## Data Validation

After loading, verify data integrity:

```bash
mongosh mongodb://localhost:27017/order

# Check for missing required fields
db.orders.find({ orderId: { $exists: false } }).count()  # Should be 0
db.orders.find({ userId: { $exists: false } }).count()   # Should be 0
db.tickets.find({ ticketId: { $exists: false } }).count() # Should be 0

# Check for valid numeric values
db.orders.find({ total: { $lt: 0 } }).count()  # Should be 0
db.tickets.find({ price: { $lt: 0 } }).count() # Should be 0

# Check tax calculation (should be ~5% of total)
db.orders.aggregate([
  { $project: { 
    orderId: 1, 
    total: 1, 
    tax: 1, 
    expectedTax: { $multiply: ["$total", 0.05] },
    taxDiff: { $abs: { $subtract: ["$tax", { $multiply: ["$total", 0.05] }] } }
  }},
  { $match: { taxDiff: { $gt: 0.01 } } }
]).toArray()  # Should return empty array (no mismatches)
```

## Next Steps

1. ✅ Verify seed data loads successfully
2. ✅ Test API endpoints with loaded data
3. ✅ Run integration tests
4. ✅ Deploy to Docker Compose
5. ✅ Deploy to Kubernetes

## API Testing with Loaded Data

```bash
# Get a loaded order
curl http://localhost:3001/v1/orders/1

# Expected response includes order with 400 orders loaded
# and tickets associated with that order
```

