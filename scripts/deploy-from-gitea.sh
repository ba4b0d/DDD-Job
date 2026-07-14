#!/bin/bash
# Pull the latest release artifact from Gitea and update the local nginx-served frontend dist.
# Run on the Pi5: GITEA_TOKEN=xxx ./scripts/deploy-from-gitea.sh [tag-or-latest]
set -euo pipefail

: "${GITEA_BASE_URL:?GITEA_BASE_URL not set (e.g. http://192.168.100.33:3000)}"
: "${GITEA_TOKEN:?GITEA_TOKEN not set}"
: "${WEBROOT:?WEBROOT not set (e.g. /srv/spaghetti-web)}"

REPO="${GITEA_REPO:-ba4b0d/DDD-Job}"
TAG="${1:-latest}"

if [ "$TAG" = "latest" ]; then
  echo "[deploy] Fetching latest release info from $GITEA_BASE_URL ..."
  TAG=$(curl -sf "$GITEA_BASE_URL/api/v1/repos/$REPO/releases/latest" \
       -H "Authorization: token $GITEA_TOKEN" \
       | grep -o '"tag_name":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -z "$TAG" ]; then
    echo "[deploy] No releases found in $REPO" >&2
    exit 1
  fi
fi
echo "[deploy] Using release tag: $TAG"

ASSET_URL=$(curl -sf "$GITEA_BASE_URL/api/v1/repos/$REPO/releases/tags/$TAG" \
          -H "Authorization: token $GITEA_TOKEN" \
          | grep -o '"browser_download_url":"[^"]*\.tar"' | head -1 \
          | cut -d'"' -f4)
if [ -z "$ASSET_URL" ]; then
  echo "[deploy] No .tar asset found in release $TAG" >&2
  exit 1
fi

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT
echo "[deploy] Downloading $ASSET_URL ..."
curl -sL -H "Authorization: token $GITEA_TOKEN" "$ASSET_URL" -o "$TMPDIR/spaghetti-dist.tar"

echo "[deploy] Extracting to $WEBROOT ..."
mkdir -p "$WEBROOT"
tar xzf "$TMPDIR/spaghetti-dist.tar" -C "$WEBROOT"

echo "[deploy] Done. Visit / to see the new build."
