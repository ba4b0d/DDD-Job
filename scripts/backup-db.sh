#!/bin/bash
# Backup script for SQLite database (WAL safe)
# Usage: ./scripts/backup-db.sh

set -e

# Detect if running inside container or on host
if [ -d "/app/data" ] && [ -w "/app/data" ]; then
    DEFAULT_BACKUP_DIR="/app/data/backups"
    DB_PATH="/app/data/3djat.db"
elif [ -f "backend/data/3djat.db" ]; then
    DEFAULT_BACKUP_DIR="backups"
    DB_PATH="backend/data/3djat.db"
elif [ -f "data/3djat.db" ]; then
    DEFAULT_BACKUP_DIR="backups"
    DB_PATH="data/3djat.db"
else
    DEFAULT_BACKUP_DIR="backups"
    DB_PATH="./3djat.db"
fi

BACKUP_DIR="${BACKUP_DIR:-$DEFAULT_BACKUP_DIR}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/spaghetti_${TIMESTAMP}.db"

echo "Creating WAL-safe backup from ${DB_PATH} to ${BACKUP_FILE}..."

python3 -c "
import sqlite3
import sys

db_path = '${DB_PATH}'
backup_path = '${BACKUP_FILE}'

src = sqlite3.connect(db_path)
dst = sqlite3.connect(backup_path)

with dst:
    src.backup(dst)

dst.close()
src.close()
print(f'Backup complete: {backup_path}')
"

# Keep last 14 daily backups, delete older ones
find "$BACKUP_DIR" -name "spaghetti_*.db" -type f -mtime +14 -delete 2>/dev/null || true

# Push to Google Drive (if docker backend is running)
if command -v docker >/dev/null 2>&1 && [ -f "docker-compose.yml" ]; then
    echo "Pushing backup to Google Drive..."
    docker compose exec -T backend python /app/scripts/gdrive_backup.py || echo "Warning: Google Drive upload skipped or failed"
fi

echo "Backup finished successfully."
