# Payment Service - Data Management Guide

This guide explains how to manage seed data for the Payment Service.

## Overview

The Payment Service includes 400+ pre-generated payment records in CSV format for testing and development purposes.

**Seed Data File**: `data/etsr_payments.csv`
- **Total Records**: 400 payments
- **Date Range**: 2023-2025
- **Payment Methods**: UPI, CARD, NETBANKING, WALLET
- **Statuses**: SUCCESS, FAILED, PENDING

## Database Schema

### Payments Table

| Column | Type | Description |
|--------|------|-------------|
| payment_id | INTEGER (PK) | Auto-incrementing payment ID |
| order_id | INTEGER | Associated order ID |
| amount | DECIMAL(10,2) | Payment amount |
| method | VARCHAR(50) | Payment method (UPI/CARD/NETBANKING/WALLET) |
| status | VARCHAR(20) | Payment status (SUCCESS/FAILED/PENDING) |
| reference | VARCHAR(100) | Payment reference/transaction ID |
| created_at | TIMESTAMP | Payment creation timestamp |

### Idempotency Keys Table

| Column | Type | Description |
|--------|------|-------------|
| key | VARCHAR(255) (PK) | Unique idempotency key |
| user_id | VARCHAR(255) | User who made the request |
| response | JSONB | Cached response |
| created_at | TIMESTAMP | Key creation timestamp |

## Scripts

### 1. Load Seed Data (`load-seed-data.sh`)

Loads payment records from CSV into the database.

**Usage:**
```bash
./load-seed-data.sh
```

**What it does:**
1. ✅ Validates CSV file exists
2. ✅ Tests database connection
3. ✅ Clears existing payment data
4. ✅ Loads data from CSV
5. ✅ Updates payment_id sequence
6. ✅ Displays statistics and sample records

**Output Example:**
```
Step 1: Checking CSV file...
✅ CSV file found with 400 records

Step 2: Testing database connection...
✅ Database connection successful

Step 3: Clearing existing payment data...
✅ Existing data cleared

Step 4: Loading seed data from CSV...
✅ Seed data loaded successfully

Step 5: Verifying data load...
   Records loaded: 400
✅ Data verification successful

Step 6: Payment Statistics
==========================
 Total Payments  | 400
 SUCCESS         | 215
 FAILED          | 98
 PENDING         | 87
 Total Amount    | 1,523,456.78
```

### 2. Reload Data (`reload-data.sh`)

Deletes all existing data and reloads from CSV with confirmation prompts.

**Usage:**
```bash
./reload-data.sh
```

**What it does:**
1. ⚠️  Prompts for confirmation
2. 💾 Optionally creates backup
3. 🗑️ Deletes all payment and idempotency data
4. 📥 Calls `load-seed-data.sh` to reload
5. ✅ Displays completion status

**Interactive Prompts:**
```
⚠️  WARNING: This will DELETE all existing data!

Are you sure you want to delete and reload all data? (yes/no): yes

Do you want to backup current data before deleting? (y/n): y
Creating backup: backup_payments_20251109_143022.sql
✅ Backup created
```

## Manual Data Operations

### Load Data Manually

```bash
# Via psql
PGPASSWORD=postgres psql -U postgres -h localhost -d payments_db \
  -c "\COPY payments(payment_id, order_id, amount, method, status, reference, created_at) \
  FROM 'data/etsr_payments.csv' WITH (FORMAT csv, HEADER true);"

# Update sequence
PGPASSWORD=postgres psql -U postgres -h localhost -d payments_db \
  -c "SELECT setval('payments_payment_id_seq', (SELECT MAX(payment_id) FROM payments));"
```

### Clear Data Manually

```bash
# Truncate payments
PGPASSWORD=postgres psql -U postgres -h localhost -d payments_db \
  -c "TRUNCATE TABLE payments RESTART IDENTITY CASCADE;"

# Truncate all tables
PGPASSWORD=postgres psql -U postgres -h localhost -d payments_db \
  -c "TRUNCATE TABLE idempotency_keys, payments RESTART IDENTITY CASCADE;"
```

### Backup and Restore

**Backup:**
```bash
# Full database backup
PGPASSWORD=postgres pg_dump -U postgres -h localhost payments_db > backup_full.sql

# Data only backup
PGPASSWORD=postgres pg_dump -U postgres -h localhost -d payments_db \
  -t payments -t idempotency_keys --data-only > backup_data.sql

# Specific table
PGPASSWORD=postgres pg_dump -U postgres -h localhost -d payments_db \
  -t payments --data-only > backup_payments.sql
```

**Restore:**
```bash
# Full restore
PGPASSWORD=postgres psql -U postgres -h localhost -d payments_db < backup_full.sql

# Data only restore
PGPASSWORD=postgres psql -U postgres -h localhost -d payments_db < backup_data.sql
```

## Seed Data Statistics

### Payment Methods Distribution

| Method | Count | Percentage |
|--------|-------|------------|
| UPI | ~100 | 25% |
| CARD | ~100 | 25% |
| NETBANKING | ~100 | 25% |
| WALLET | ~100 | 25% |

### Payment Status Distribution

| Status | Count | Percentage |
|--------|-------|------------|
| SUCCESS | ~215 | 53.75% |
| FAILED | ~98 | 24.5% |
| PENDING | ~87 | 21.75% |

### Sample Data

```csv
payment_id,order_id,amount,method,status,reference,created_at
1,1,940.73,NETBANKING,SUCCESS,ETP20251003-I05Y7A,2024-01-28 22:06:21
2,2,615.38,NETBANKING,SUCCESS,ETP20251003-5R6RCH,2024-08-19 00:55:20
3,3,3004.78,NETBANKING,SUCCESS,ETP20251003-M9RH04,2024-01-24 20:34:17
```

## Common Queries

### Payment Statistics

```sql
-- Overall statistics
SELECT 
  COUNT(*) as total_payments,
  COUNT(DISTINCT order_id) as unique_orders,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount,
  MIN(amount) as min_amount,
  MAX(amount) as max_amount
FROM payments;

-- By status
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM payments), 2) as percentage,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount
FROM payments
GROUP BY status
ORDER BY count DESC;

-- By payment method
SELECT 
  method,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount
FROM payments
GROUP BY method
ORDER BY count DESC;

-- By month
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as payments,
  SUM(amount) as total_amount
FROM payments
GROUP BY month
ORDER BY month DESC;
```

### Data Validation

```sql
-- Check for duplicate payment_ids
SELECT payment_id, COUNT(*) 
FROM payments 
GROUP BY payment_id 
HAVING COUNT(*) > 1;

-- Check for missing data
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN order_id IS NULL THEN 1 END) as missing_order_id,
  COUNT(CASE WHEN amount IS NULL THEN 1 END) as missing_amount,
  COUNT(CASE WHEN method IS NULL THEN 1 END) as missing_method,
  COUNT(CASE WHEN status IS NULL THEN 1 END) as missing_status,
  COUNT(CASE WHEN reference IS NULL THEN 1 END) as missing_reference
FROM payments;

-- Check data ranges
SELECT 
  MIN(created_at) as earliest_payment,
  MAX(created_at) as latest_payment,
  MIN(amount) as min_amount,
  MAX(amount) as max_amount
FROM payments;
```

## Integration with Deployment

The seed data loading is integrated into the deployment process:

```bash
./deploy.sh
```

During deployment, you'll be prompted:
```
Do you want to load seed data from CSV? (y/N):
```

- Press `y` to load 400 payment records
- Press `n` to skip seed data (empty database)

## Troubleshooting

### CSV File Not Found

**Error:**
```
❌ CSV file not found: data/etsr_payments.csv
```

**Solution:**
- Ensure you're running the script from the payment-service directory
- Check that `data/etsr_payments.csv` exists

### Database Connection Failed

**Error:**
```
❌ Cannot connect to database
```

**Solution:**
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL
brew services start postgresql@14

# Test connection manually
psql -U postgres -h localhost -d payments_db
```

### Permission Denied

**Error:**
```
permission denied for table payments
```

**Solution:**
```bash
# Grant permissions
PGPASSWORD=postgres psql -U postgres -h localhost -d payments_db \
  -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;"
```

### Sequence Not Updated

**Issue:** New payments start from ID 1 instead of 401

**Solution:**
```bash
# Manually update sequence
PGPASSWORD=postgres psql -U postgres -h localhost -d payments_db \
  -c "SELECT setval('payments_payment_id_seq', (SELECT MAX(payment_id) FROM payments));"
```

## Best Practices

1. **Always backup before reloading data** in production
2. **Use reload-data.sh** instead of manual commands for consistency
3. **Check statistics** after loading to verify data integrity
4. **Test queries** on seed data before running on production
5. **Keep CSV file updated** if schema changes

## Summary

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `load-seed-data.sh` | Load CSV data | Initial setup, after schema changes |
| `reload-data.sh` | Delete and reload | Reset to clean state, testing |
| Manual backup | Create backup | Before major changes |
| Manual queries | Statistics | Data analysis, verification |

## Support

For issues with data management:
1. Check script output for specific error messages
2. Verify PostgreSQL is running and accessible
3. Ensure CSV file format matches schema
4. Check troubleshooting section above
