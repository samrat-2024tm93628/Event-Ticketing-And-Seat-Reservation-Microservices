#!/bin/bash

# Load Seed Data Script
# This script loads seed data into the payments database

set -e

echo "=================================================="
echo "Payment Service - Load Seed Data"
echo "=================================================="

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_PASS=${DB_PASS:-postgres}
DB_NAME=${DB_NAME:-payments_db}

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CSV_FILE="${SCRIPT_DIR}/data/etsr_payments.csv"

echo ""
echo "Configuration:"
echo "  Database: ${DB_NAME}"
echo "  Host: ${DB_HOST}:${DB_PORT}"
echo "  User: ${DB_USER}"
echo "  CSV File: ${CSV_FILE}"
echo ""

# Step 1: Check if CSV file exists
echo "Step 1: Checking CSV file..."
if [ ! -f "$CSV_FILE" ]; then
    echo "❌ CSV file not found: $CSV_FILE"
    exit 1
fi

RECORD_COUNT=$(tail -n +2 "$CSV_FILE" | wc -l | tr -d ' ')
echo "✅ CSV file found with ${RECORD_COUNT} records"

# Step 2: Check database connection
echo ""
echo "Step 2: Testing database connection..."
if ! PGPASSWORD=$DB_PASS psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c '\q' 2>/dev/null; then
    echo "❌ Cannot connect to database"
    exit 1
fi
echo "✅ Database connection successful"

# Step 3: Truncate existing data
echo ""
echo "Step 3: Clearing existing payment data..."
PGPASSWORD=$DB_PASS psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "TRUNCATE TABLE payments RESTART IDENTITY CASCADE;" -q
echo "✅ Existing data cleared"

# Step 4: Load seed data from CSV
echo ""
echo "Step 4: Loading seed data from CSV..."
PGPASSWORD=$DB_PASS psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "\COPY payments(payment_id, order_id, amount, method, status, reference, created_at) FROM '${CSV_FILE}' WITH (FORMAT csv, HEADER true);" -q
echo "✅ Seed data loaded successfully"

# Step 4b: Update sequence to continue from max payment_id
echo ""
echo "Step 4b: Updating payment_id sequence..."
PGPASSWORD=$DB_PASS psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "SELECT setval('payments_payment_id_seq', (SELECT MAX(payment_id) FROM payments));" -q
echo "✅ Sequence updated"

# Step 5: Verify data load
echo ""
echo "Step 5: Verifying data load..."
LOADED_COUNT=$(PGPASSWORD=$DB_PASS psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -t -c "SELECT COUNT(*) FROM payments;" | tr -d ' ')
echo "   Records loaded: ${LOADED_COUNT}"

if [ "$LOADED_COUNT" -eq "$RECORD_COUNT" ]; then
    echo "✅ Data verification successful"
else
    echo "⚠️  Warning: Record count mismatch (Expected: ${RECORD_COUNT}, Loaded: ${LOADED_COUNT})"
fi

# Step 6: Display summary statistics
echo ""
echo "Step 6: Payment Statistics"
echo "=========================="
PGPASSWORD=$DB_PASS psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "
SELECT 
  'Total Payments' as metric,
  COUNT(*)::text as count
FROM payments
UNION ALL
SELECT 
  'SUCCESS',
  COUNT(*)::text
FROM payments WHERE status = 'SUCCESS'
UNION ALL
SELECT 
  'FAILED',
  COUNT(*)::text
FROM payments WHERE status = 'FAILED'
UNION ALL
SELECT 
  'PENDING',
  COUNT(*)::text
FROM payments WHERE status = 'PENDING'
UNION ALL
SELECT 
  'Total Amount',
  TO_CHAR(SUM(amount), 'FM999,999,999.00')
FROM payments;
" -q

# Step 7: Display sample records
echo ""
echo "Sample Records (First 5):"
echo "========================="
PGPASSWORD=$DB_PASS psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "
SELECT payment_id, order_id, amount, method, status, reference 
FROM payments 
ORDER BY payment_id 
LIMIT 5;
" -q

echo ""
echo "=================================================="
echo "✅ Seed data loaded successfully!"
echo "=================================================="
