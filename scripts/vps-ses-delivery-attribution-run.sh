#!/usr/bin/env bash
set -euo pipefail
cd /opt/sendfable

# Copy check script into worker if needed, then run DB attribution check
docker cp /tmp/vps-ses-delivery-attribution-check.ts sendfable-worker:/app/scripts/vps-ses-delivery-attribution-check.ts 2>/dev/null || true
docker compose -p sendfable -f docker-compose.prod.yml exec -T worker npx tsx scripts/vps-ses-delivery-attribution-check.ts

echo ""
echo "=== ENV SES_CONFIGURATION_SET ==="
grep -E '^SES_CONFIGURATION_SET=' .env | sed 's/\r$//' || echo "UNSET"

echo ""
echo "=== AWS configuration set event destinations ==="
set -a
# shellcheck disable=SC1091
source <(grep -E '^(AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_REGION|SES_CONFIGURATION_SET)=' .env | sed 's/\r$//')
set +a
REGION="${AWS_REGION:-us-east-1}"
CFG="${SES_CONFIGURATION_SET:-sendfable-events}"
echo "REGION=$REGION CFG=$CFG"

aws sesv2 get-configuration-set --configuration-set-name "$CFG" --region "$REGION" --output json 2>&1 | head -c 2000 || true
echo ""
aws sesv2 get-configuration-set-event-destinations --configuration-set-name "$CFG" --region "$REGION" --output json 2>&1 || true

echo ""
echo "=== App logs: ses-webhook (last 6h) ==="
docker compose -p sendfable -f docker-compose.prod.yml logs app --since 24h 2>/dev/null | grep -E 'ses-webhook|unknown messageId|acquisition' | tail -n 80 || true

echo ""
echo "=== Worker logs: send/delivery (last 24h) ==="
docker compose -p sendfable -f docker-compose.prod.yml logs worker --since 24h 2>/dev/null | grep -E 'sent:|delivery_pending|ses_accepted|autofill|send:' | tail -n 60 || true
