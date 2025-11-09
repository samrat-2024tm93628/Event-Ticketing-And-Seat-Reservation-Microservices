-- Seed data for payments table
-- This file loads payment data from CSV

-- Truncate existing data
TRUNCATE TABLE payments RESTART IDENTITY CASCADE;

-- Display summary
SELECT 'Loading seed data...' as message;

-- Note: The actual CSV loading will be done via psql command line
-- PGPASSWORD=postgres psql -U postgres -h localhost -d payments_db -c "\COPY payments(payment_id, order_id, amount, method, status, reference, created_at) FROM 'data/etsr_payments.csv' WITH (FORMAT csv, HEADER true);"
