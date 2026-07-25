#!/usr/bin/env bash
# One-time migration: move existing DB to named Docker volume
# Run ONCE on Pi5 after pulling the new docker-compose.yml
set -e

echo "📦 Migrating database to named volume..."

# Stop containers
docker compose down 2>/dev/null || true

# Start backend briefly to create the named volume
docker compose up -d backend
sleep 3

# Find the volume mountpoint
VOL=$(docker compose exec backend sh -c "find /app/data -name '*.db' -exec dirname {} \;" 2>/dev/null | head -1)
if [ -z "$VOL" ]; then
  VOL="/app/data"
fi

echo "Volume path inside container: $VOL"

# Copy existing DB into the container if it exists on host
if [ -f "./data/3djat.db" ]; then
  docker cp ./data/3djat.db "$(docker compose ps -q backend):$VOL/3djat.db"
  echo "✅ Migrated 3djat.db to named volume"
else
  echo "⚠️  No existing ./data/3djat.db — will seed fresh"
fi

# Restart everything
docker compose down
docker compose up -d --build

echo ""
echo "✅ Done — database is now in a named volume (persists across rebuilds)"
