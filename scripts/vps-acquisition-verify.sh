#!/bin/bash
set -euo pipefail
cd /opt/sendfable
echo "HEAD=$(git rev-parse HEAD)"
grep -E '^SENDFABLE_ACQUISITION_' .env || echo 'ACQUISITION_FLAGS=unset_defaults_false'
docker compose -p sendfable -f docker-compose.prod.yml exec -T postgres \
  psql -U sendfable -d sendfable -t -c \
  'SELECT COUNT(*) FROM "AcquisitionMessage" WHERE "dryRun"=false AND status IN ('\''SENT'\'','\''DELIVERED'\'');'
docker compose -p sendfable -f docker-compose.prod.yml exec -T postgres \
  psql -U sendfable -d sendfable -t -c \
  'SELECT COUNT(*) FROM "AcquisitionProspect";'
curl -sf -o /dev/null -w 'admin_acq:%{http_code}\n' http://127.0.0.1:3010/admin/acquisition || true
curl -sf http://127.0.0.1:3010/api/health; echo
