#!/usr/bin/env bash
# Sendfable operational monitor — every 5 minutes via cron.
# Alerts the owner via SES (scripts/ops-alert.js in the worker container).
# Alert de-dup: at most one alert per check per 6 hours (state files).
set -uo pipefail

STATE=/root/sendfable-monitor-state
LOG=$STATE/monitor.log
mkdir -p "$STATE"; chmod 700 "$STATE"
DEDUP_SECS=$((6 * 3600))

log() { echo "$(date -Is) $*" >> "$LOG"; }

alert() { # $1=check-id  $2=subject  $3=body
  local id="$1" subject="$2" body="$3" mark="$STATE/alert-$1"
  local now last=0
  now=$(date +%s)
  [ -f "$mark" ] && last=$(cat "$mark" 2>/dev/null || echo 0)
  if [ $((now - last)) -lt $DEDUP_SECS ]; then
    log "SUPPRESSED($id) $subject"
    return
  fi
  echo "$now" > "$mark"
  log "ALERT($id) $subject"
  docker exec sendfable-worker node scripts/ops-alert.js "$subject" "$body" >> "$LOG" 2>&1 \
    || log "ALERT-DELIVERY-FAILED($id)"
}

clear_alert() { rm -f "$STATE/alert-$1"; }

# 1. App availability (through nginx/TLS, the real user path).
if curl -fsS -m 10 https://sendfable.com/api/health > /dev/null 2>&1; then
  clear_alert app
else
  alert app "App health check FAILED" "https://sendfable.com/api/health did not return 200."
fi

# 2. Containers running.
for c in sendfable-app sendfable-worker sendfable-postgres sendfable-redis; do
  if [ "$(docker inspect -f '{{.State.Running}}' "$c" 2>/dev/null)" = "true" ]; then
    clear_alert "container-$c"
  else
    alert "container-$c" "Container down: $c" "docker inspect reports $c not running."
  fi
done

# 3. Nginx.
if systemctl is-active --quiet nginx; then clear_alert nginx; else
  alert nginx "Nginx is not active" "systemctl reports nginx inactive — all sites affected."
fi

# 4. Disk usage.
USED=$(df --output=pcent / | tail -1 | tr -dc '0-9')
if [ "${USED:-0}" -ge 85 ]; then
  alert disk "Disk ${USED}% full" "Root filesystem at ${USED}%. Clean logs/backups soon."
else
  clear_alert disk
fi

# 5. TLS certificate expiry (< 14 days).
END=$(echo | openssl s_client -connect sendfable.com:443 -servername sendfable.com 2>/dev/null \
  | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [ -n "$END" ]; then
  END_TS=$(date -d "$END" +%s 2>/dev/null || echo 0)
  DAYS=$(( (END_TS - $(date +%s)) / 86400 ))
  if [ "$DAYS" -lt 14 ]; then
    alert tls "TLS cert expires in ${DAYS} days" "sendfable.com certificate expires $END."
  else
    clear_alert tls
  fi
fi

# 6. Backup freshness (< 26 h).
LAST=/root/sendfable-backups/last-success
if [ -f "$LAST" ] && [ $(( $(date +%s) - $(stat -c %Y "$LAST") )) -lt 93600 ]; then
  clear_alert backup
else
  alert backup "Sendfable backup is stale or missing" "No successful backup in the last 26 hours."
fi

# 6b. Off-host backup freshness when configured.
if [ -f /root/sendfable-backups/backup-iam.env ]; then
  # shellcheck disable=SC1091
  set -a; . /root/sendfable-backups/backup-iam.env; set +a
fi
if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  OFF=/root/sendfable-backups/last-offhost-success
  if [ -f "$OFF" ] && [ $(( $(date +%s) - $(stat -c %Y "$OFF") )) -lt 93600 ]; then
    clear_alert offhost
  else
    alert offhost "Sendfable off-host backup is stale or missing" "No successful S3 upload in the last 26 hours."
  fi
fi

# 7. Queue health (BullMQ campaign-send).
FAILED=$(docker exec sendfable-redis redis-cli ZCARD bull:campaign-send:failed 2>/dev/null | tr -dc '0-9')
WAITING=$(docker exec sendfable-redis redis-cli LLEN bull:campaign-send:wait 2>/dev/null | tr -dc '0-9')
if [ "${FAILED:-0}" -gt 10 ]; then
  alert queue-failed "Campaign queue has ${FAILED} failed jobs" "Inspect worker logs: docker logs sendfable-worker."
else
  clear_alert queue-failed
fi
if [ "${WAITING:-0}" -gt 500 ]; then
  alert queue-backlog "Campaign queue backlog: ${WAITING} waiting" "Worker may be stuck or underpowered."
else
  clear_alert queue-backlog
fi

# 8. Stuck/late campaigns (read-only SQL).
PSQL="docker exec sendfable-postgres psql -U sendfable -d sendfable -tAc"
STUCK=$($PSQL "SELECT count(*) FROM \"Campaign\" WHERE status='SENDING' AND \"updatedAt\" < now() - interval '2 hours'" 2>/dev/null | tr -dc '0-9')
LATE=$($PSQL "SELECT count(*) FROM \"Campaign\" WHERE status='SCHEDULED' AND \"scheduledAt\" < now() - interval '15 minutes'" 2>/dev/null | tr -dc '0-9')
if [ "${STUCK:-0}" -gt 0 ]; then
  alert campaign-stuck "${STUCK} campaign(s) stuck in SENDING > 2h" "Check worker and queue."
else
  clear_alert campaign-stuck
fi
if [ "${LATE:-0}" -gt 0 ]; then
  alert campaign-late "${LATE} scheduled campaign(s) did not start" "scheduledAt passed > 15 min ago."
else
  clear_alert campaign-late
fi

# Keep log bounded.
if [ -f "$LOG" ] && [ "$(stat -c%s "$LOG")" -gt 5000000 ]; then
  tail -n 2000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi
