#!/bin/bash
# Backup PostgreSQL database for Planview
# Usage: ./scripts/backup.sh [output_dir]

set -euo pipefail

OUTPUT_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${OUTPUT_DIR}/planview_${TIMESTAMP}.sql.gz"

mkdir -p "$OUTPUT_DIR"

echo "Backing up Planview database..."
docker compose exec -T planview-db pg_dump -U planview planview | gzip > "$BACKUP_FILE"

echo "Backup saved to: $BACKUP_FILE"
echo "Size: $(du -h "$BACKUP_FILE" | cut -f1)"
