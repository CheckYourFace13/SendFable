#!/usr/bin/env bash
set -euo pipefail
cd /opt/sendfable

# Backup pointer before deploy
echo "PRE_DEPLOY_HEAD=$(git rev-parse HEAD)"
mkdir -p /root/sendfable-backups/pre-deploy
cp -a .env "/root/sendfable-backups/pre-deploy/env-$(date +%Y%m%d%H%M%S)" 2>/dev/null || true
git rev-parse HEAD > /root/sendfable-backups/pre-deploy/commit-before.txt

git fetch origin main
git reset --hard origin/main
echo "POST_PULL_HEAD=$(git rev-parse HEAD)"

docker compose -p sendfable -f docker-compose.prod.yml up -d --build app worker

echo "Waiting for health..."
for i in $(seq 1 60); do
  if curl -sf http://127.0.0.1:3010/api/health >/dev/null; then
    echo "healthy try=$i"
    break
  fi
  sleep 5
done

curl -sf http://127.0.0.1:3010/api/health; echo
docker compose -p sendfable -f docker-compose.prod.yml ps

# Confirm flags unchanged
for f in SENDFABLE_SMS_PUBLIC_ENABLED SENDFABLE_SMS_LIVE_SENDING_ENABLED SENDFABLE_SMS_MOCK_PROVIDER_ENABLED ALLOW_PUBLIC_SIGNUP CAMPAIGN_SEND_ENABLED STRIPE_BILLING_ENABLED; do
  echo -n "$f="; grep -E "^${f}=" .env | cut -d= -f2-
done

# Live route checks
for p in / /solutions /pricing /templates /signup /robots.txt /sitemap.xml; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://sendfable.com${p}")
  echo "HTTP $code $p"
done

# Telnyx read-only check if script present
if [ -f scripts/vps-telnyx-connectivity-check.sh ]; then
  bash scripts/vps-telnyx-connectivity-check.sh || true
fi

echo "DEPLOY_DONE HEAD=$(git rev-parse HEAD)"
