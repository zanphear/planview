#!/bin/bash
# Restore PostgreSQL database for Planview
# Usage: ./scripts/restore.sh <backup_file.sql.gz>

set -euo pipefail

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: File not found: $BACKUP_FILE"
    exit 1
fi

echo "WARNING: This will drop and recreate the planview database."
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo "Dropping existing database..."
docker compose exec -T planview-db psql -U planview -d postgres -c "DROP DATABASE IF EXISTS planview;"
docker compose exec -T planview-db psql -U planview -d postgres -c "CREATE DATABASE planview OWNER planview;"

echo "Restoring from: $BACKUP_FILE"
gunzip -c "$BACKUP_FILE" | docker compose exec -T planview-db psql -U planview planview

echo "Running migrations..."
docker compose exec planview-web alembic upgrade head

echo "Restore complete."
