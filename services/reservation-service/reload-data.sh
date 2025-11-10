#!/bin/bash

# Reload Database Data
# This script drops all tables, recreates the schema, and reloads seed data

set -e

echo "🗑️  Dropping existing tables..."
psql -U postgres -d reservationdb -c "DROP TABLE IF EXISTS seat_holds, seat_allocations, seat_availability, idempotency_keys CASCADE;"

echo "📋 Creating tables from schema..."
psql -U postgres -d reservationdb -f schema.sql

echo "🌱 Seeding database with data..."
if [ -f "data/etsr_seats.csv" ]; then
    DATABASE_URL="postgres://postgres:postgres@localhost:5432/reservationdb" npm run seed data/etsr_seats.csv
    echo "✅ Database reloaded successfully!"
else
    echo "❌ Error: data/etsr_seats.csv not found"
    exit 1
fi

echo ""
echo "📊 Database Statistics:"
psql -U postgres -d reservationdb -c "
    SELECT 
        'seat_availability' as table_name, 
        COUNT(*) as row_count 
    FROM seat_availability
    UNION ALL
    SELECT 
        'seat_holds' as table_name, 
        COUNT(*) as row_count 
    FROM seat_holds
    UNION ALL
    SELECT 
        'seat_allocations' as table_name, 
        COUNT(*) as row_count 
    FROM seat_allocations;
"

echo ""
echo "🎫 Sample seats by event:"
psql -U postgres -d reservationdb -c "
    SELECT 
        event_id, 
        COUNT(*) as total_seats,
        COUNT(CASE WHEN status = 'AVAILABLE' THEN 1 END) as available,
        COUNT(CASE WHEN status = 'HELD' THEN 1 END) as held,
        COUNT(CASE WHEN status = 'ALLOCATED' THEN 1 END) as allocated
    FROM seat_availability 
    GROUP BY event_id 
    ORDER BY event_id 
    LIMIT 10;
"
