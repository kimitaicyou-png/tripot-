#!/bin/bash
set -euo pipefail

BACKUP_DIR="${HOME}/projects/coaris/companies/tripot/backups"
mkdir -p "$BACKUP_DIR"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/tripot_${DATE}.sql"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set. Run: export DATABASE_URL=\$(grep DATABASE_URL .env.local | cut -d= -f2-)"
  exit 1
fi

pg_dump "$DATABASE_URL" --no-owner --no-acl > "$BACKUP_FILE"
gzip "$BACKUP_FILE"

echo "Backup saved: ${BACKUP_FILE}.gz"
echo "Size: $(du -h "${BACKUP_FILE}.gz" | cut -f1)"

find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
echo "Old backups (>30 days) cleaned"
