#!/usr/bin/env bash
# One-time migration: move existing DB from bind mount to named volume
# Run ONCE on Pi5 after pulling the new docker-compose.yml
set -e

echo "📦 Migrating database to named volume..."

# Stop old containers
docker-compose down 2>/dev/null || true

# Create named volume and copy existing DB into it
VOLUME_PATH=$(docker volume inspect 3djat-pricing_db_data --format '{{.Mountpoint}}' 2>/dev/null || echo "")
if [ -z "$VOLUME_PATH" ]; then
  echo "Creating named volume..."
  docker-compose up -d backend
  sleep 3
  docker-compose down
  VOLUME_PATH=$(docker volume inspect 3djat-pricing_db_data --format '{{.Mountpoint}}')
fi

echo "Volume path: $VOLUME_PATH"

# Copy existing DB if it exists and volume is empty
if [ -f "./data/3djat.db" ] && [ ! -f "$VOLUME_PATH/3djat.db" ]; then
  cp ./data/3djat.db "$VOLUME_PATH/3djat.db"
  echo "✅ Migrated 3djat.db to named volume"
elif [ -f "$VOLUME_PATH/3djat.db" ]; then
  echo "✅ Database already in named volume"
else
  echo "⚠️  No existing database found — will seed fresh"
fi

# Start everything
docker-compose up -d --build
echo "✅ Done — database is now in a named volume (persists across rebuilds)"
