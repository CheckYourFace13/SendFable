#!/usr/bin/env bash
set -euo pipefail
cd /opt/sendfable
git pull --ff-only origin main || true
# Copy script into worker (image may lag git on host until rebuild; bind from host)
docker compose -p sendfable -f docker-compose.prod.yml cp scripts/vps-72h-growth-verify-inner.ts worker:/app/scripts/vps-72h-growth-verify-inner.ts
docker compose -p sendfable -f docker-compose.prod.yml exec -T worker npx tsx scripts/vps-72h-growth-verify-inner.ts

echo ""
echo "===== WORKER FLAGS ====="
docker compose -p sendfable -f docker-compose.prod.yml exec -T worker sh -c '
for k in SENDFABLE_ACQUISITION_ENABLED SENDFABLE_ACQUISITION_DISCOVERY_ENABLED SENDFABLE_ACQUISITION_SENDING_ENABLED SENDFABLE_ACQUISITION_AUTO_APPROVE SENDFABLE_ACQUISITION_AUTO_RAMP; do
  eval "v=\$$k"; echo "$k=${v:-(unset)}"
done
'

echo ""
echo "===== SMOKE ====="
for path in / /pricing /signup /login /api/health /sitemap.xml /robots.txt; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://sendfable.com$path" || echo ERR)
  echo "$code $path"
done

echo ""
echo "===== WORKER LOG ====="
docker logs sendfable-worker --tail 50 2>&1 | grep -iE 'acquisition|sent:|discover|sender|imap|pause' | tail -30 || echo "(no acq log lines yet)"

echo DONE
