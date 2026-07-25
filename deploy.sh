#!/usr/bin/env bash
# Deploy to Pi5 — run from Windows (git bash)
# Usage: bash deploy.sh           (push + deploy)
#        bash deploy.sh --no-push (deploy only)

set -e
PI5="${PI5_HOST:-pi5}"
REMOTE_DIR="${REMOTE_DIR:-~/ddd-job}"

# 1. Git push
if [[ "$1" != "--no-push" ]]; then
  echo "📤 Pushing to GitHub..."
  cd "$(dirname "$0")"
  if ! git diff --quiet || ! git diff --cached --quiet; then
    git add -u  # Only add tracked files, not new untracked ones
    if ! git diff --cached --quiet; then
      git commit -m "deploy: $(date '+%Y-%m-%d %H:%M')"
      git push origin master
    else
      echo "   Nothing staged for commit"
    fi
  else
    echo "   Nothing to commit"
  fi
fi

# 2. SSH + pull + rebuild
echo "🔄 Deploying to Pi5..."
ssh "$PI5" "cd $REMOTE_DIR && git pull && docker compose up -d --build"

echo ""
echo "✅ Done — http://${PI5_HOST:-192.168.100.51}:8080"
