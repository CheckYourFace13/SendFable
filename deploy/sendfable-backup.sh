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

# Optional off-host credentials
if [ -f /root/sendfable-backups/backup-iam.env ]; then
  # shellcheck disable=SC1091
  set -a; . /root/sendfable-backups/backup-iam.env; set +a
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

# ── Off-host encrypted copy (Option A) ──────────────────────────────────────
# Requires BACKUP_S3_* + age. Never logs object contents or customer PII.
upload_offhost() {
  local tier="$1" # daily|weekly|monthly
  [ -n "${BACKUP_S3_BUCKET:-}" ] || return 0
  [ -n "${BACKUP_S3_ACCESS_KEY_ID:-}" ] || return 0
  [ -n "${BACKUP_AGE_RECIPIENT:-}" ] || { log "OFFHOST skip: no BACKUP_AGE_RECIPIENT"; return 0; }
  command -v age >/dev/null || { log "OFFHOST skip: age not installed"; alert "Sendfable off-host backup skipped — age missing" "Install age on the VPS."; return 1; }
  command -v aws >/dev/null || { log "OFFHOST skip: awscli missing"; alert "Sendfable off-host backup skipped — awscli missing" "Install awscli on the VPS."; return 1; }

  local enc="$FILE.age"
  if ! age -r "$BACKUP_AGE_RECIPIENT" -o "$enc" "$FILE"; then
    log "OFFHOST FAIL age-encrypt"
    alert "Sendfable off-host encrypt FAILED" "age encryption failed for $STAMP"
    return 1
  fi
  chmod 600 "$enc"
  local prefix="${BACKUP_S3_PREFIX:-postgres}"
  local key="${prefix}/${tier}/sendfable-${STAMP}.sql.gz.age"
  local region="${BACKUP_S3_REGION:-us-east-1}"

  if ! AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID" \
       AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY" \
       AWS_DEFAULT_REGION="$region" \
       aws s3 cp "$enc" "s3://${BACKUP_S3_BUCKET}/${key}" --only-show-errors --sse AES256; then
    log "OFFHOST FAIL s3-cp $key"
    alert "Sendfable off-host upload FAILED" "s3 cp failed for tier=$tier stamp=$STAMP"
    rm -f "$enc"
    return 1
  fi

  # Integrity: head object size must match local encrypted size
  local remote
  remote=$(AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID" \
           AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY" \
           AWS_DEFAULT_REGION="$region" \
           aws s3api head-object --bucket "$BACKUP_S3_BUCKET" --key "$key" --query ContentLength --output text 2>/dev/null || echo 0)
  local local_sz
  local_sz=$(stat -c%s "$enc")
  if [ "$remote" != "$local_sz" ]; then
    log "OFFHOST FAIL size-mismatch local=$local_sz remote=$remote"
    alert "Sendfable off-host integrity FAILED" "Size mismatch after upload stamp=$STAMP"
    rm -f "$enc"
    return 1
  fi
  sha256sum "$enc" > "$enc.sha256"
  date -Is > "$BACKUP_DIR/last-offhost-success"
  log "OFFHOST OK s3://${BACKUP_S3_BUCKET}/${key} (${local_sz} bytes)"
  rm -f "$enc"  # keep only sha256 marker locally optional — leave enc for weekly/monthly copy path? remove to save disk
}

# Credentials already loaded at top of script if present.

upload_offhost daily || true
if [ "$DOW" = "7" ]; then upload_offhost weekly || true; fi
if [ "$DOM" = "01" ]; then upload_offhost monthly || true; fi

# Off-host freshness alert (monitor also checks last-offhost-success)
if [ -n "${BACKUP_S3_BUCKET:-}" ] && [ ! -f "$BACKUP_DIR/last-offhost-success" ]; then
  log "OFFHOST warn: configured but no successful upload yet"
fi
