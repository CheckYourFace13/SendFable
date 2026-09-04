#!/usr/bin/env bash
set -euo pipefail
cd /opt/sendfable
git fetch origin
git checkout main
git pull --ff-only origin main
echo "COMMIT=$(git rev-parse --short HEAD)"
docker compose -p sendfable -f docker-compose.prod.yml up -d --build app worker
sleep 20
docker compose -p sendfable -f docker-compose.prod.yml ps
# Confirm SES attribution + inventory helpers in worker image
docker compose -p sendfable -f docker-compose.prod.yml exec -T worker sh -c '
  grep -q "normalizedId\|ses_accepted\|normalizedMessageId" /app/src/lib/acquisition/lifecycle.ts /app/src/lib/acquisition/send.ts 2>/dev/null && echo SES_ATTRIBUTION=PRESENT || echo SES_ATTRIBUTION=MISSING
  test -f /app/src/lib/acquisition/discovery/autofill.ts && echo AUTOFILL_MODULE=PRESENT || echo AUTOFILL_MODULE=MISSING
  test -f /app/src/lib/acquisition/delivery-health.ts && echo DELIVERY_HEALTH=PRESENT || echo DELIVERY_HEALTH=MISSING
'
