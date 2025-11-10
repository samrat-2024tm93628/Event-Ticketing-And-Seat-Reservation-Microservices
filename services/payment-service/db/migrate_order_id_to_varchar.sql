-- Migration: Change order_id from INTEGER to VARCHAR(255)
-- This allows payment service to accept UUID-based order IDs from order service

-- Step 1: Alter the column type
ALTER TABLE payments 
ALTER COLUMN order_id TYPE VARCHAR(255);

-- Verify the change
\d payments;

SELECT 'Migration completed successfully: order_id is now VARCHAR(255)' AS status;
