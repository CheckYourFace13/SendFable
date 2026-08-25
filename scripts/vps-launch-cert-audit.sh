#!/usr/bin/env bash
set -euo pipefail
cd /opt/sendfable
echo "=== VPS GIT ==="
echo "VPS_HEAD=$(git rev-parse HEAD)"
git status -sb
git log -1 --oneline
echo "=== DIRTY ==="
git status --porcelain || true
echo "=== DOCKER ==="
docker compose -p sendfable -f docker-compose.prod.yml ps
echo "=== HEALTH ==="
curl -sf http://127.0.0.1:3010/api/health; echo
echo "=== FLAGS ==="
for f in ALLOW_PUBLIC_SIGNUP CAMPAIGN_SEND_ENABLED STRIPE_BILLING_ENABLED EARLY_LAUNCH \
  SENDFABLE_SMS_PUBLIC_ENABLED SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED SENDFABLE_SMS_BILLING_ENABLED \
  SENDFABLE_SMS_ACTIVATION_PURCHASE_ENABLED SENDFABLE_SMS_REGISTRATION_ENABLED \
  SENDFABLE_SMS_NUMBER_PURCHASE_ENABLED SENDFABLE_SMS_LIVE_SENDING_ENABLED \
  SENDFABLE_SMS_INBOUND_ENABLED SENDFABLE_SMS_REPLY_ENABLED SENDFABLE_SMS_MOCK_PROVIDER_ENABLED \
  ANALYTICS_ENABLED; do
  val=$(grep -E "^${f}=" .env | cut -d= -f2- || echo "(unset)")
  echo "${f}=${val}"
done
echo "=== TELNYX KEYS PRESENT ==="
for f in TELNYX_API_KEY TELNYX_PUBLIC_KEY TELNYX_MESSAGING_PROFILE_ID; do
  if grep -qE "^${f}=.+" .env; then echo "${f}=SET"; else echo "${f}=MISSING"; fi
done
echo "=== MIGRATIONS ==="
docker compose -p sendfable -f docker-compose.prod.yml exec -T app npx prisma migrate status 2>&1 | tail -20
echo "=== DISK/MEM ==="
df -h / | tail -1
free -h | head -2
uptime
echo "=== NEED RESTART ==="
if [ -f /var/run/reboot-required ]; then cat /var/run/reboot-required /var/run/reboot-required.pkgs 2>/dev/null || echo REBOOT_REQUIRED; else echo NO_REBOOT_FLAG; fi
echo "=== ZOMBIES ==="
ps -eo pid,stat,comm | awk '$2 ~ /Z/ {print}' | head -20 || true
echo "=== SSL ==="
echo | openssl s_client -servername sendfable.com -connect 127.0.0.1:443 2>/dev/null | openssl x509 -noout -dates -subject 2>/dev/null || true
echo "=== NGINX ==="
nginx -t 2>&1 | tail -5
echo "=== BACKUPS ==="
ls -lt /root/sendfable-backups 2>/dev/null | head -5 || ls -lt /var/backups/sendfable 2>/dev/null | head -5 || echo "backup dir not found"
echo "=== REDIS ==="
docker compose -p sendfable -f docker-compose.prod.yml exec -T redis redis-cli ping 2>&1 || true
echo "=== WORKER LOGS (last 30) ==="
docker compose -p sendfable -f docker-compose.prod.yml logs --tail=30 worker 2>&1 | tail -30
echo "=== APP LOGS 5xx-ish (last 50) ==="
docker compose -p sendfable -f docker-compose.prod.yml logs --tail=50 app 2>&1 | grep -iE 'error|fatal|5[0-9]{2}' | tail -20 || echo none
