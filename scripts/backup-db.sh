#!/bin/bash
# Backup script for SQLite database (WAL safe)
# Usage: ./scripts/backup-db.sh

set -e

BACKUP_DIR="${BACKUP_DIR:-/app/data/backups}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/3djat_${TIMESTAMP}.db"

echo "Creating WAL-safe backup at ${BACKUP_FILE}..."

if [ -f "/app/data/3djat.db" ]; then
    DB_PATH="/app/data/3djat.db"
elif [ -f "backend/data/3djat.db" ]; then
    DB_PATH="backend/data/3djat.db"
else
    DB_PATH="./3djat.db"
fi

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
find "$BACKUP_DIR" -name "3djat_*.db" -type f -mtime +14 -delete 2>/dev/null || true

echo "Backup finished successfully."
