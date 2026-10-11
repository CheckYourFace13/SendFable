#!/bin/bash
set -u
echo "=== HEALTH ==="
curl -sf -o /dev/null -w 'health:%{http_code}\n' http://127.0.0.1:3010/api/health || echo HEALTH_FAIL
docker ps --format '{{.Names}} {{.Status}}' | grep sendfable
echo "=== SMS FLAG ==="
docker exec sendfable-app printenv SENDFABLE_SMS_PUBLIC_ENABLED || echo UNSET
echo "=== FLAGS ==="
docker exec sendfable-postgres psql -U sendfable -d sendfable -c "select w.name, w.\"autoWelcomeEnabled\", c.\"autoSendEnabled\" from \"Workspace\" w left join \"MarketingAutopilotConfig\" c on c.\"workspaceId\"=w.id where w.name in ('TheDrinkPlace','DrinkKnird');"
echo "=== DF ==="
df -h /
