#!/bin/bash
# Build the frontend and collect artifacts for deployment to Gitea repo.
# Output: ./build-artifacts/spaghetti-frontend-dist.tar
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/frontend"

echo "[build] Installing deps..."
npm ci --silent

echo "[build] Building frontend..."
VITE_API_URL="${VITE_API_URL:-}" npm run build

echo "[build] Creating artifact..."
ARTIFACTS="$ROOT/build-artifacts"
mkdir -p "$ARTIFACTS"
cd "$ROOT/frontend/dist"
tar czf "$ARTIFACTS/spaghetti-frontend-dist.tar" .
ls -lh "$ARTIFACTS/spaghetti-frontend-dist.tar"
echo "[build] Done."
