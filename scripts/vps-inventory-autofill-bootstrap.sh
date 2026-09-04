#!/usr/bin/env bash
set -euo pipefail
# Copy ops script into running worker (not yet in image) and run.
docker cp /tmp/vps-inventory-autofill-inner.ts sendfable-worker:/app/scripts/vps-inventory-autofill-inner.ts
cd /opt/sendfable
docker compose -p sendfable -f docker-compose.prod.yml exec -T worker npx tsx scripts/vps-inventory-autofill-inner.ts
