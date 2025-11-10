#!/bin/bash

# Reload Data Script
# This script deletes all data and reloads seed data

set -e

echo "=================================================="
echo "Payment Service - Delete and Reload Data"
echo "=================================================="

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_PASS=${DB_PASS:-postgres}
DB_NAME=${DB_NAME:-payments_db}

echo ""
echo "⚠️  WARNING: This will DELETE all existing data!"
echo ""
echo "Configuration:"
echo "  Database: ${DB_NAME}"
echo "  Host: ${DB_HOST}:${DB_PORT}"
echo "  User: ${DB_USER}"
echo ""

# Prompt for confirmation
read -p "Are you sure you want to delete and reload all data? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Operation cancelled."
    exit 0
fi

echo ""
echo "Step 1: Backing up current data (optional)..."
read -p "Do you want to backup current data before deleting? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    BACKUP_FILE="backup_payments_$(date +%Y%m%d_%H%M%S).sql"
    echo "Creating backup: ${BACKUP_FILE}"
    PGPASSWORD=$DB_PASS pg_dump -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -t payments -t idempotency_keys --data-only > "$BACKUP_FILE"
    echo "✅ Backup created: ${BACKUP_FILE}"
fi

echo ""
echo "Step 2: Deleting all data..."
PGPASSWORD=$DB_PASS psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME <<EOF
-- Delete all data
TRUNCATE TABLE idempotency_keys CASCADE;
TRUNCATE TABLE payments RESTART IDENTITY CASCADE;

-- Display confirmation
SELECT 'All data deleted' as status;
EOF
echo "✅ All data deleted"

echo ""
echo "Step 3: Loading seed data..."
# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Call the load-seed-data script
if [ -f "${SCRIPT_DIR}/load-seed-data.sh" ]; then
    bash "${SCRIPT_DIR}/load-seed-data.sh"
else
    echo "❌ load-seed-data.sh not found"
    exit 1
fi

echo ""
echo "=================================================="
echo "✅ Data reload completed successfully!"
echo "=================================================="
