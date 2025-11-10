-- schema.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Current seat availability view for this service (snapshot of catalog seats)
CREATE TABLE seat_availability (
  seat_id varchar PRIMARY KEY,
  event_id varchar NOT NULL,
  section varchar,
  row varchar,
  seat_number varchar,
  price numeric(10,2) NOT NULL,
  status varchar NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE | HELD | ALLOCATED
  last_updated timestamptz DEFAULT now()
);

-- holds (temporary reservations)
CREATE TABLE seat_holds (
  hold_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idempotency_key varchar NULL,
  order_id varchar NULL,
  event_id varchar NOT NULL,
  seat_id varchar NOT NULL,
  user_id varchar NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status varchar NOT NULL DEFAULT 'HELD', -- HELD | RELEASED | ALLOCATED
  CONSTRAINT fk_seat FOREIGN KEY (seat_id) REFERENCES seat_availability(seat_id) ON DELETE CASCADE
);

CREATE INDEX idx_seat_holds_event ON seat_holds(event_id);
CREATE INDEX idx_seat_holds_expires_at ON seat_holds(expires_at);

-- Allocations table (final)
CREATE TABLE seat_allocations (
  allocation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id varchar NOT NULL,
  event_id varchar NOT NULL,
  seats jsonb NOT NULL, -- snapshot: [{seat_id, section, row, seat_number, price}]
  created_at timestamptz DEFAULT now()
);

-- idempotency table to store results for idempotent POST calls
CREATE TABLE idempotency_keys (
  idempotency_key varchar PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  response_code int,
  response_body jsonb
);
