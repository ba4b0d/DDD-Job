#!/bin/sh
# Entrypoint: chown mounted volumes so appuser can write, then drop
# privileges to appuser and exec the CMD.
#
# Background: when the container was first built to run as root, the
# named volumes `db_data` and `uploads_data` were created with root
# ownership. After we switched to non-root `appuser`, those volumes
# remained root-owned and `appuser` could not open the SQLite file
# -> "attempt to write a readonly database". This script fixes the
# ownership once per container start, then drops to appuser.
#
# We use Python's os.setuid for the privilege drop (no su-exec/gosu
# dependency, which aren't in Debian Trixie main repo).
set -e

# Chown mounted volumes (silent failure if already owned by appuser)
chown -R appuser:appgroup /app/data 2>/dev/null || true
chown -R appuser:appgroup /app/uploads 2>/dev/null || true

# Drop to appuser via Python, then exec the CMD
exec python3 -c "
import os, sys

# Look up appuser UID/GID from /etc/passwd (no pwd/spwd on slim).
uid, gid, home = None, None, None
with open('/etc/passwd') as f:
    for line in f:
        parts = line.split(':')
        if parts and parts[0] == 'appuser':
            uid, gid, home = int(parts[2]), int(parts[3]), parts[5]
            break
if uid is None:
    print('[entrypoint] appuser not found in /etc/passwd', file=sys.stderr)
    sys.exit(1)

os.setgid(gid)
os.setuid(uid)
os.environ['HOME'] = home
os.execvp(sys.argv[1], sys.argv[1:])
" "$@"
