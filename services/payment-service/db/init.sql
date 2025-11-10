-- Drop tables if they exist (for clean initialization)
DROP TABLE IF EXISTS idempotency_keys CASCADE;
DROP TABLE IF EXISTS payments CASCADE;

-- Create sequence for payment_id (for compatibility with seed data)
CREATE SEQUENCE IF NOT EXISTS payments_payment_id_seq;

-- Create payments table
CREATE TABLE payments (
  payment_id INTEGER PRIMARY KEY DEFAULT nextval('payments_payment_id_seq'),
  order_id VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT now()
);

-- Associate sequence with the table
ALTER SEQUENCE payments_payment_id_seq OWNED BY payments.payment_id;

-- Create idempotency_keys table
CREATE TABLE idempotency_keys (
  key VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  response JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_idempotency_user_id ON idempotency_keys(user_id);
