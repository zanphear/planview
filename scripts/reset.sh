#!/bin/bash
# Reset Planview database — drop everything, migrate, reseed
# Usage: ./scripts/reset.sh

set -euo pipefail

echo "=== PLANVIEW DATABASE RESET ==="
echo "This will DESTROY ALL DATA and reseed from scratch."
read -p "Are you sure? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo "Dropping schema..."
docker compose exec -T planview-db psql -U planview planview -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "Running migrations..."
docker compose exec planview-web alembic upgrade head

echo "Seeding data..."
docker compose exec planview-web python -m seed

echo "=== Reset complete. Fresh database ready. ==="
