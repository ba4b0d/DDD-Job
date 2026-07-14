#!/bin/bash
# Build frontend, create tarball, and create/update a release on Gitea with the artifact attached.
# Usage: GITEA_TOKEN=xxx GITEA_BASE_URL=http://192.168.100.33:3000 ./scripts/release-gitea.sh [tag]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAG="${1:-v$(date +%Y%m%d-%H%M%S)}"
REPO="${GITEA_REPO:-ba4b0d/DDD-Job}"  # Gitea owner/repo

: "${GITEA_BASE_URL:?GITEA_BASE_URL not set (e.g. http://192.168.100.33:3000)}"
: "${GITEA_TOKEN:?GITEA_TOKEN not set}"

echo "[release] Building frontend..."
bash "$ROOT/scripts/build-frontend.sh"
ARTIFACT="$ROOT/build-artifacts/spaghetti-frontend-dist.tar"

cd "$ROOT/frontend"
echo "[release] Creating Gitea release $TAG..."
# 1. Create release (idempotent — returns existing release ID if it exists)
REL_JSON=$(curl -sf -X POST "$GITEA_BASE_URL/api/v1/repos/$REPO/releases" \
  -H "Authorization: token $GITEA_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"tag_name\":\"$TAG\",\"name\":\"$TAG\",\"body\":\"Spaghetti frontend build artifact (.tar.gz of dist/) for self-hosted deployment.\"}" \
  || curl -sf "$GITEA_BASE_URL/api/v1/repos/$REPO/releases/tags/$TAG" \
       -H "Authorization: token $GITEA_TOKEN")
REL_ID=$(echo "$REL_JSON" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
if [ -z "$REL_ID" ]; then
  echo "[release] Failed to create/find release" >&2
  echo "$REL_JSON" | head -10
  exit 1
fi
echo "[release] Release ID: $REL_ID"

echo "[release] Uploading artifact..."
curl -sf -X POST "$GITEA_BASE_URL/api/v1/repos/$REPO/releases/$REL_ID/assets" \
  -H "Authorization: token $GITEA_TOKEN" \
  -F "attachment=@$ARTIFACT" \
  -o /dev/null
echo "[release] Uploaded $ARTIFACT"
echo "[release] Done. Release: $GITEA_BASE_URL/$REPO/releases/tag/$TAG"
