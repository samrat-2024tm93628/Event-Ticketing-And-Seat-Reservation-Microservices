# Reservation Service - Minikube Deployment

## Prerequisites

1. **Minikube** installed and running
2. **kubectl** installed
3. **PostgreSQL** running locally on port 5432

## PostgreSQL Setup

### Database and User Configuration

You need to create a database and user for the reservation service. Connect to your local PostgreSQL and run:

```sql
-- Create database
CREATE DATABASE reservationdb;

-- Create user (if you want a specific user)
CREATE USER postgres WITH PASSWORD 'postgres';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE reservationdb TO postgres;
```

**Default connection string used**: `postgres://postgres:postgres@host.minikube.internal:5432/reservationdb`

If you want to use different credentials, edit the `DATABASE_URL` environment variable in `k8s/deployment.yaml`.

### Initialize the Schema

Before deploying, initialize the database schema:

```bash
# Connect to PostgreSQL
psql -U postgres -d reservationdb

# Run the schema
\i schema.sql
```

**Note**: The deployment script will automatically seed the database with data from `data/etsr_seats.csv` if the file exists.

### Enable Remote Connections (if needed)

Make sure your PostgreSQL accepts connections from Minikube. Edit your `postgresql.conf`:

```
listen_addresses = '*'
```

And your `pg_hba.conf` to allow connections from Minikube:

```
# Add this line
host    all             all             192.168.0.0/16          md5
```

Then restart PostgreSQL:

```bash
# macOS with Homebrew
brew services restart postgresql

# Or find your PostgreSQL service
```

## Deployment

### Deploy the Service

Run the deployment script:

```bash
./deploy.sh
```

This script will:
1. Build the Docker image in Minikube's Docker daemon
2. Deploy the application to Minikube
3. Create a NodePort service on port 30002
4. Display the service URL

### Access the Service

After deployment, the service will be available at:

```bash
# Get the service URL
minikube service reservation-service --url

# Or access directly at NodePort
http://$(minikube ip):30002
```

### Test the Service

```bash
# Health check
curl $(minikube service reservation-service --url)/health

# Metrics
curl $(minikube service reservation-service --url)/metrics
```

## API Testing Examples

Once deployed and port-forwarded, you can test the reservation service with these curl commands:

### 1. Get Available Seats for an Event

```bash
# Get all seats for event ID "1" (from seeded data)
curl -X GET "http://localhost:3002/?eventId=1"

# Expected response shows 196 seats for event 1
```

### 2. Reserve Seats (Hold)

```bash
# Reserve seats for an order (using actual seat IDs from event 1)
curl -X POST "http://localhost:3002/reserve" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-key-123" \
  -d '{
    "orderId": "order-123",
    "eventId": "1",
    "seats": ["1", "2"],
    "userId": "user-456"
  }'

# Response example:
# {
#   "holdIds": ["550e8400-e29b-41d4-a716-446655440000", "6ba7b810-9dad-11d1-80b4-00c04fd430c8"],
#   "reserved": [
#     {"holdId": "550e8400-e29b-41d4-a716-446655440000", "seatId": "1", "price": 733.28},
#     {"holdId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8", "seatId": "2", "price": 683.28}
#   ],
#   "expires_at": "2025-11-09T12:30:00.000Z"
# }
```

### 3. Get Hold Details

```bash
# Retrieve information about a specific hold (use hold_id from reserve response)
HOLD_ID="550e8400-e29b-41d4-a716-446655440000"

curl -X GET "http://localhost:3002/holds/${HOLD_ID}"
```

### 4. Allocate Seats (After Payment Success)

```bash
# Convert held seats to allocated (final confirmation)
curl -X POST "http://localhost:3002/allocate" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-123",
    "eventId": "1",
    "seats": ["1", "2"],
    "holdIds": ["550e8400-e29b-41d4-a716-446655440000", "6ba7b810-9dad-11d1-80b4-00c04fd430c8"]
  }'

# Response example:
# {
#   "allocated": [
#     {
#       "seat_id": "1",
#       "section": "C",
#       "row": "24",
#       "seat_number": "13",
#       "price": 733.28
#     },
#     {
#       "seat_id": "2",
#       "section": "D",
#       "row": "3",
#       "seat_number": "36",
#       "price": 683.28
#     }
#   ]
# }
```

### 5. Release Seats (Cancel Reservation)

```bash
# Release held seats by hold IDs
curl -X POST "http://localhost:3002/release" \
  -H "Content-Type: application/json" \
  -d '{
    "holdIds": ["550e8400-e29b-41d4-a716-446655440000", "6ba7b810-9dad-11d1-80b4-00c04fd430c8"]
  }'

# OR release by seat IDs
curl -X POST "http://localhost:3002/release" \
  -H "Content-Type: application/json" \
  -d '{
    "seats": ["1", "2"]
  }'

# Response:
# {"ok": true}
```

### Complete Workflow Example

```bash
# Step 1: Get available seats for event 1
EVENT_ID="1"
echo "=== Getting available seats for event ${EVENT_ID} ==="
curl -s -X GET "http://localhost:3002/?eventId=${EVENT_ID}" | jq '.'

# Step 2: Reserve seats (using first 2 seat IDs from the response)
echo -e "\n=== Reserving seats ==="
RESERVE_RESPONSE=$(curl -s -X POST "http://localhost:3002/reserve" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{
    "orderId": "order-'$(date +%s)'",
    "eventId": "'${EVENT_ID}'",
    "seats": ["1", "2"],
    "userId": "user-789"
  }')
echo $RESERVE_RESPONSE | jq '.'

# Extract hold IDs and seat IDs
HOLD_ID_1=$(echo $RESERVE_RESPONSE | jq -r '.holdIds[0]')
HOLD_ID_2=$(echo $RESERVE_RESPONSE | jq -r '.holdIds[1]')
ORDER_ID=$(echo $RESERVE_RESPONSE | jq -r '.reserved[0].orderId // "order-'$(date +%s)'"')

# Step 3: Check hold details
echo -e "\n=== Checking hold details for first seat ==="
curl -s -X GET "http://localhost:3002/holds/${HOLD_ID_1}" | jq '.'

# Step 4: Either allocate (after payment) OR release (cancel)
# To allocate (uncomment to use):
echo -e "\n=== To allocate seats (after payment success) ==="
echo "curl -s -X POST \"http://localhost:3002/allocate\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{"
echo "    \"orderId\": \"order-$(date +%s)\","
echo "    \"eventId\": \"${EVENT_ID}\","
echo "    \"seats\": [\"1\", \"2\"],"
echo "    \"holdIds\": [\"${HOLD_ID_1}\", \"${HOLD_ID_2}\"]"
echo "  }' | jq '.'"

# OR to release (uncomment to use):
echo -e "\n=== Releasing seats (cancelling reservation) ==="
curl -s -X POST "http://localhost:3002/release" \
  -H "Content-Type: application/json" \
  -d "{\"holdIds\": [\"${HOLD_ID_1}\", \"${HOLD_ID_2}\"]}" | jq '.'

# Verify seats are available again
echo -e "\n=== Verifying seats are available again ==="
curl -s -X GET "http://localhost:3002/?eventId=${EVENT_ID}" | jq '.seats[] | select(.seat_id == "1" or .seat_id == "2")'
```

### Quick Test Script

```bash
# Simple test to verify the service is working
echo "Testing Reservation Service..."

# Health check
echo -e "\n1. Health Check:"
curl -s http://localhost:3002/health | jq '.'

# Get seats for event 1
echo -e "\n2. Get available seats for event 1:"
curl -s "http://localhost:3002/?eventId=1" | jq '.seats[0:3]'

# Reserve 2 seats
echo -e "\n3. Reserve seats 1 and 2:"
curl -s -X POST "http://localhost:3002/reserve" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{
    "orderId": "test-order",
    "eventId": "1",
    "seats": ["1", "2"],
    "userId": "test-user"
  }' | jq '.'

echo -e "\n✅ Test complete!"
```

### Notes on API Usage

- **IDs Format**: seat_id and event_id are varchar (can be integers like "1", "2" or strings)
- **Hold IDs**: hold_id is UUID, generated automatically by the service
- **Idempotency Keys**: Use the `Idempotency-Key` header for `/reserve` to prevent duplicate reservations on retries
- **Hold Expiry**: Reserved seats automatically expire after 15 minutes if not allocated
- **Seat States**: AVAILABLE → HELD → ALLOCATED (or back to AVAILABLE if released)

## Database Management

### Reload Database Data

To delete all data and reload from the CSV file:

```bash
./reload-data.sh
```

This script will:
1. Drop all tables (seat_availability, seat_holds, seat_allocations, idempotency_keys)
2. Recreate tables from schema.sql
3. Import data from data/etsr_seats.csv
4. Show statistics about loaded data

**Use this when you want to reset the database to a clean state with fresh data.**

## Undeploy

To remove the service from Minikube:

```bash
./undeploy.sh
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods
kubectl describe pod -l app=reservation-service
```

### View Logs

```bash
kubectl logs -f deployment/reservation-service
```

### Database Connection Issues

If the service can't connect to PostgreSQL:

1. Check PostgreSQL is running: `pg_isready`
2. Verify PostgreSQL is listening on all interfaces: `netstat -an | grep 5432`
3. Check Minikube can reach host: `minikube ssh` then `ping host.minikube.internal`
4. Verify firewall isn't blocking connections

### Update Database Connection

Edit `k8s/deployment.yaml` and change the `DATABASE_URL` environment variable:

```yaml
- name: DATABASE_URL
  value: "postgres://YOUR_USER:YOUR_PASSWORD@host.minikube.internal:5432/reservationdb"
```

Then redeploy:

```bash
./undeploy.sh
./deploy.sh
```

## Port Configuration

- **Application Port**: 3002 (internal container port)
- **NodePort**: 30002 (external access port)
- **PostgreSQL Port**: 5432 (on host machine)

## Environment Variables

You can modify these in `k8s/deployment.yaml`:

- `PORT`: Application port (default: 3002)
- `DATABASE_URL`: PostgreSQL connection string
- `LOG_LEVEL`: Logging level (default: info)
