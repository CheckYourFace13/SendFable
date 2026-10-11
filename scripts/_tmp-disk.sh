#!/bin/bash
set -u
echo "=== DF ==="
df -h /
echo "=== TOP DIRS ==="
du -xh -d 1 / 2>/dev/null | sort -hr | head -20
echo "=== DOCKER ==="
docker system df
echo "=== LOGS ==="
du -xh -d 1 /var/log 2>/dev/null | sort -hr | head -15
echo "=== TMP ==="
du -xh -d 1 /tmp 2>/dev/null | sort -hr | head -10
echo "=== OPT ==="
du -xh -d 1 /opt 2>/dev/null | sort -hr | head -15
echo "=== HOME ==="
du -xh -d 1 /home 2>/dev/null | sort -hr | head -10
echo "=== ROOT HOME ==="
du -xh -d 1 /root 2>/dev/null | sort -hr | head -15
echo "=== FLAGS ==="
docker exec sendfable-postgres psql -U sendfable -d sendfable -c "select w.name, w.\"autoWelcomeEnabled\", c.\"autoSendEnabled\", c.enabled from \"Workspace\" w left join \"MarketingAutopilotConfig\" c on c.\"workspaceId\"=w.id where w.name in ('TheDrinkPlace','DrinkKnird');"
