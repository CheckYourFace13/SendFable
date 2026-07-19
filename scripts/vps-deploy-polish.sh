#!/usr/bin/env bash
set -euo pipefail

cd /opt/sendfable
git fetch origin main
git reset --hard origin/main

# Ensure platform owner email for admin gate
if ! grep -q '^PLATFORM_OWNER_EMAIL=' .env; then
  echo 'PLATFORM_OWNER_EMAIL=chris@iscreamstudio.com' >> .env
fi

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
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep sendfable

# Backup + early-access smoke
bash /opt/sendfable/scripts/vps-backup-sendfable.sh || true

echo "=== Early access submit ==="
curl -sS -o /tmp/ea.json -w '%{http_code}' -X POST https://sendfable.com/api/early-access \
  -H 'Content-Type: application/json' \
  -d '{"email":"audit-lead+'$(date +%s)'@example.com","consent":true,"mainGoal":"audit","source":"deploy-smoke"}'
echo
cat /tmp/ea.json; echo

echo "=== Public smoke ==="
curl -sI https://sendfable.com/early-access | head -8
curl -sI https://sendfable.com/favicon.ico | head -8
curl -sI https://gravyblock.com/ | head -5
curl -sI https://rentalnoodle.com/ | head -5

echo "=== Auth admin ==="
EMAIL=chris@iscreamstudio.com
PASSWORD="$(cat /root/sendfable-secrets/owner-password.txt)"
JAR=$(mktemp)
CSRF=$(curl -sS -c "$JAR" -b "$JAR" https://sendfable.com/api/auth/csrf | python3 -c 'import sys,json; print(json.load(sys.stdin)["csrfToken"])')
curl -sS -o /dev/null -c "$JAR" -b "$JAR" -X POST 'https://sendfable.com/api/auth/callback/credentials' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "email=$EMAIL" \
  --data-urlencode "password=$PASSWORD" \
  --data-urlencode 'callbackUrl=https://sendfable.com/dashboard' \
  --data-urlencode 'json=true'
curl -sS -b "$JAR" -o /dev/null -w 'dashboard=%{http_code}\n' https://sendfable.com/dashboard
curl -sS -b "$JAR" -o /dev/null -w 'admin=%{http_code}\n' https://sendfable.com/admin
curl -sS -b "$JAR" https://sendfable.com/api/admin/overview | python3 -c 'import sys,json; d=json.load(sys.stdin); print("admin_users", d.get("counts",{}).get("users"), "leads", d.get("counts",{}).get("earlyAccessLeads"), "ses", d.get("system",{}).get("sesReady"), "stripe", d.get("system",{}).get("stripeReady"))'

echo "DEPLOY_POLISH_OK"
