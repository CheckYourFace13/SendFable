#!/usr/bin/env bash
# Sendfable PostgreSQL backup — daily via cron.
# Scope: sendfable database ONLY. Never writes outside /root/sendfable-backups.
set -uo pipefail
umask 077

BACKUP_DIR=/root/sendfable-backups
LOG="$BACKUP_DIR/backup.log"
STAMP=$(date +%Y%m%d-%H%M%S)
DOW=$(date +%u)   # 1=Mon .. 7=Sun
DOM=$(date +%d)

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly" "$BACKUP_DIR/monthly"
chmod 700 "$BACKUP_DIR" "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly" "$BACKUP_DIR/monthly"

log() { echo "$(date -Is) $*" >> "$LOG"; }
alert() {
  docker exec sendfable-worker node scripts/ops-alert.js "$1" "$2" >> "$LOG" 2>&1 \
    || log "ALERT-DELIVERY-FAILED: $1"
}

# Abort if disk critically full (backup would make it worse).
USED=$(df --output=pcent / | tail -1 | tr -dc '0-9')
if [ "${USED:-0}" -ge 92 ]; then
  log "ABORT disk ${USED}% full"
  alert "Sendfable backup ABORTED — disk ${USED}% full" "Free space before next run. No backup was written."
  exit 1
fi

FILE="$BACKUP_DIR/daily/sendfable-$STAMP.sql.gz"
if ! docker exec sendfable-postgres pg_dump -U sendfable sendfable | gzip > "$FILE"; then
  rm -f "$FILE"
  log "FAIL pg_dump"
  alert "Sendfable DB backup FAILED" "pg_dump exited non-zero at $STAMP. See $LOG."
  exit 1
fi

# Integrity: gzip self-test + sanity size + checksum.
if ! gzip -t "$FILE" 2>>"$LOG"; then
  log "FAIL gzip-test $FILE"
  alert "Sendfable backup corrupt (gzip test failed)" "$FILE failed gzip -t."
  exit 1
fi
SIZE=$(stat -c%s "$FILE")
if [ "$SIZE" -lt 5000 ]; then
  log "FAIL size $SIZE $FILE"
  alert "Sendfable backup suspiciously small" "$FILE is only ${SIZE} bytes."
  exit 1
fi
sha256sum "$FILE" > "$FILE.sha256"
chmod 600 "$FILE" "$FILE.sha256"

# Weekly (Sunday) and monthly (1st) tiers.
if [ "$DOW" = "7" ]; then cp -p "$FILE" "$FILE.sha256" "$BACKUP_DIR/weekly/"; fi
if [ "$DOM" = "01" ]; then cp -p "$FILE" "$FILE.sha256" "$BACKUP_DIR/monthly/"; fi

# Retention: 14 daily / 60 weekly / 365 monthly days.
find "$BACKUP_DIR/daily"   -name 'sendfable-*' -mtime +14  -delete
find "$BACKUP_DIR/weekly"  -name 'sendfable-*' -mtime +60  -delete
find "$BACKUP_DIR/monthly" -name 'sendfable-*' -mtime +365 -delete

date -Is > "$BACKUP_DIR/last-success"
log "OK $FILE (${SIZE} bytes, disk ${USED}%)"
