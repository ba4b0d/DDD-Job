#!/bin/sh
# Entrypoint: chown mounted volumes so appuser can write, then drop
# privileges and exec the CMD.
#
# Background: when the container was first built to run as root, the
# named volumes `db_data` and `uploads_data` were created with root
# ownership. After we switched to non-root `appuser`, those volumes
# remained root-owned and `appuser` could not open the SQLite file
# -> "attempt to write a readonly database". This script fixes the
# ownership once per container start.
set -e

# Chown mounted volumes (silent failure if already owned by appuser)
chown -R appuser:appgroup /app/data 2>/dev/null || true
chown -R appuser:appgroup /app/uploads 2>/dev/null || true

# Drop to appuser and exec the CMD
exec su-exec appuser "$@"
