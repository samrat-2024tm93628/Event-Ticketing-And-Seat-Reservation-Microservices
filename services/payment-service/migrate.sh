#!/bin/bash

# Migration Script: Update Payment Service Database Schema
# Changes order_id from INTEGER to VARCHAR(255) to support UUID order IDs

echo "🔄 Starting database migration for payment service..."

# Get the PostgreSQL connection details
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_NAME=${DB_NAME:-"paymentdb"}
DB_USER=${DB_USER:-"postgres"}
DB_PASS=${DB_PASS:-"postgres"}

echo "📊 Connecting to database: $DB_NAME at $DB_HOST:$DB_PORT"

# Run the migration
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f db/migrate_order_id_to_varchar.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo "   order_id column is now VARCHAR(255)"
else
    echo "❌ Migration failed!"
    exit 1
fi
