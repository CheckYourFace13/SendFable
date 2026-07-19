#!/usr/bin/env bash
# Daily-friendly Postgres dump for Sendfable Compose stack.
# Does not touch other VPS projects.
set -euo pipefail

STAMP=$(date +%Y%m%d-%H%M%S)
DIR=/root/sendfable-backups
mkdir -p "$DIR"
chmod 700 "$DIR"

OUT="$DIR/sendfable-$STAMP.sql.gz"
docker exec sendfable-postgres pg_dump -U sendfable -d sendfable --no-owner --no-acl | gzip -c > "$OUT"
chmod 600 "$OUT"

# Keep last 14 dumps
ls -1t "$DIR"/sendfable-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f

echo "BACKUP_OK $OUT"
ls -lh "$OUT"
