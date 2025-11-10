# Testing Payment Failure Scenarios

This guide explains how to test payment failures and verify that seats are properly released.

## Configuration

The payment service uses the `PAYMENT_FAILURE_RATE` environment variable to simulate payment gateway failures:

- `0.0` = Always succeed (100% success)
- `0.2` = 20% failure rate (default)
- `0.5` = 50% failure rate
- `0.8` = 80% failure rate
- `1.0` = Always fail (100% failure)

## Testing Methods

### Method 1: Increase Failure Rate to 80% (Recommended)

This makes it very likely that your next order will fail:

**Option A: Update ConfigMap (Persistent)**
```bash
# Edit the ConfigMap
kubectl edit configmap payment-config

# Change: PAYMENT_FAILURE_RATE: "0.2"
# To:     PAYMENT_FAILURE_RATE: "0.8"

# Restart the deployment to pick up the change
kubectl rollout restart deployment/payment-service
kubectl rollout status deployment/payment-service
```

**Option B: Set Environment Variable Directly (Temporary)**
```bash
# Update the payment service pod to use 80% failure rate
kubectl set env deployment/payment-service PAYMENT_FAILURE_RATE=0.8

# Wait for pod to restart
kubectl rollout status deployment/payment-service
```

# Now test - most orders will fail
kubectl port-forward service/order-service 3001:3001

curl --location 'http://localhost:3001/v1/orders' \
--header 'Content-Type: application/json' \
--header 'Idempotency-Key: test-failure-high-rate-001' \
--data '{
    "userId": "1",
    "eventId": "1",
    "seats": ["11", "12"],
    "paymentMethod": "UPI"
}'
```

### Method 2: Force 100% Failure

Guaranteed to fail every time:

**Option A: Update ConfigMap (Persistent)**
```bash
# Edit the ConfigMap
kubectl edit configmap payment-config

# Change: PAYMENT_FAILURE_RATE: "0.2"
# To:     PAYMENT_FAILURE_RATE: "1.0"

# Restart the deployment
kubectl rollout restart deployment/payment-service
kubectl rollout status deployment/payment-service
```

**Option B: Set Environment Variable Directly (Temporary)**
```bash
# Set failure rate to 100%
kubectl set env deployment/payment-service PAYMENT_FAILURE_RATE=1.0

# Wait for restart
kubectl rollout status deployment/payment-service
```

# Test - will always fail
curl --location 'http://localhost:3001/v1/orders' \
--header 'Content-Type: application/json' \
--header 'Idempotency-Key: test-failure-guaranteed-001' \
--data '{
    "userId": "1",
    "eventId": "1",
    "seats": ["13", "14"],
    "paymentMethod": "CARD"
}'
```

### Method 3: Keep Default Rate (20%) and Try Multiple Times

```bash
# With 20% failure rate, try 5-10 times
for i in {1..10}; do
  echo "Attempt $i:"
  curl --location 'http://localhost:3001/v1/orders' \
  --header 'Content-Type: application/json' \
  --header "Idempotency-Key: test-failure-attempt-$i" \
  --data "{
      \"userId\": \"1\",
      \"eventId\": \"1\",
      \"seats\": [\"$((20+i))\", \"$((30+i))\"],
      \"paymentMethod\": \"UPI\"
  }"
  echo -e "\n---\n"
done
```

## Expected Behavior on Payment Failure

When a payment fails, you should see:

### 1. Order API Response (402 Payment Required)
```json
{
    "error": "Payment failed",
    "message": "Unable to process payment",
    "orderId": "abc-123-def-456"
}
```

### 2. Order Service Logs
```
[info]: Processing payment for order abc-123-def-456, amount: 1539.89
[error]: Payment failed for order abc-123-def-456
[info]: Seats released after payment failure for order abc-123-def-456
```

### 3. Database State

**Order Status:**
```bash
# Check order in MongoDB
kubectl exec -it deployment/mongo -- mongosh order-service --eval "db.orders.find({orderId: 'YOUR_ORDER_ID'}).pretty()"

# Expected:
# status: "CANCELLED"
# paymentStatus: "FAILED"
```

**Seat Status:**
```bash
# Check seats in PostgreSQL (reservation service)
psql -h localhost -p 5432 -U postgres -d reservationdb \
  -c "SELECT seat_id, status FROM seat_availability WHERE seat_id IN ('13', '14');"

# Expected: status = 'AVAILABLE' (seats released)
```

**Payment Record:**
```bash
# Check payment in PostgreSQL (payment service)
psql -h localhost -p 5432 -U postgres -d paymentdb \
  -c "SELECT order_id, status, amount FROM payments WHERE order_id = 'YOUR_ORDER_ID';"

# Expected: status = 'FAILED'
```

## Verification Steps

### 1. Check Seat Availability Before Order
```bash
curl 'http://localhost:3002/v1/seats?eventId=1' | jq '.seats[] | select(.seat_id=="15" or .seat_id=="16")'
```

Expected: `"status": "AVAILABLE"`

### 2. Create Order (which will fail payment)
```bash
curl --location 'http://localhost:3001/v1/orders' \
--header 'Content-Type: application/json' \
--header 'Idempotency-Key: verify-release-001' \
--data '{
    "userId": "1",
    "eventId": "1",
    "seats": ["15", "16"],
    "paymentMethod": "UPI"
}'
```

Expected: `"error": "Payment failed"`

### 3. Check Seat Availability After Failed Order
```bash
curl 'http://localhost:3002/v1/seats?eventId=1' | jq '.seats[] | select(.seat_id=="15" or .seat_id=="16")'
```

Expected: `"status": "AVAILABLE"` (seats should be released!)

### 4. Verify You Can Re-order the Same Seats
```bash
curl --location 'http://localhost:3001/v1/orders' \
--header 'Content-Type: application/json' \
--header 'Idempotency-Key: verify-release-002' \
--data '{
    "userId": "1",
    "eventId": "1",
    "seats": ["15", "16"],
    "paymentMethod": "UPI"
}'
```

If seats were properly released, this should either succeed or fail with payment again (not "seats unavailable").

## Restore Normal Behavior

After testing, restore the default 20% failure rate:

**Option A: Restore ConfigMap (Persistent)**
```bash
# Edit the ConfigMap back to default
kubectl edit configmap payment-config

# Change to: PAYMENT_FAILURE_RATE: "0.2"

# Restart the deployment
kubectl rollout restart deployment/payment-service
kubectl rollout status deployment/payment-service
```

**Option B: Remove Environment Variable Override (if you used Option B)**
```bash
# Remove the override to use ConfigMap default
kubectl set env deployment/payment-service PAYMENT_FAILURE_RATE-

# Wait for restart
kubectl rollout status deployment/payment-service
```

## Monitoring During Tests

Watch logs in real-time:

```bash
# Terminal 1: Order service logs
kubectl logs -f -l app=order-service

# Terminal 2: Payment service logs
kubectl logs -f -l app=payment-service

# Terminal 3: Reservation service logs
kubectl logs -f -l app=reservation-service
```

## Key Things to Verify

✅ Order status becomes `CANCELLED`
✅ Payment status becomes `FAILED`
✅ Seats return to `AVAILABLE` status
✅ Seat holds are marked as `RELEASED`
✅ No tickets are created
✅ User can attempt to book the same seats again
✅ Order service logs show "Seats released after payment failure"
