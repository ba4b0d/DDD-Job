#!/usr/bin/env bash
# Deploy to Pi5 — run from Windows (git bash)
# Usage: bash deploy.sh           (push the current clean commit + deploy)
#        bash deploy.sh --no-push (deploy the already-pushed commit)

set -euo pipefail
PI5="${PI5_HOST:-pi5}"
REMOTE_DIR="${REMOTE_DIR:-/home/ba4b0d/ddd-job}"

cd "$(dirname "$0")"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Refusing to deploy: tracked files are modified or staged." >&2
  echo "Commit tracked changes first, then deploy that explicit commit." >&2
  exit 1
fi

BRANCH="$(git branch --show-current)"
COMMIT="$(git rev-parse HEAD)"
printf -v REMOTE_DIR_Q '%q' "$REMOTE_DIR"
if [[ -z "$BRANCH" ]]; then
  echo "Refusing to deploy from detached HEAD." >&2
  exit 1
fi

# 1. Git push
if [[ "${1:-}" != "--no-push" ]]; then
  echo "📤 Pushing ${BRANCH} at ${COMMIT}..."
  git push origin "${BRANCH}"
fi

# 2. SSH + pull + rebuild
echo "🔄 Deploying to Pi5..."
ssh "$PI5" "cd $REMOTE_DIR_Q && \
  test -z \"\$(git status --porcelain)\" && \
  git fetch origin '$BRANCH' && \
  git checkout '$BRANCH' && \
  git reset --hard '$COMMIT' && \
  docker compose up -d --build"

echo ""
echo "✅ Done — http://${PI5_HOST:-192.168.100.51}:8080"
