#!/bin/bash
set -u
echo "=== FLAGS BEFORE ==="
docker exec sendfable-postgres psql -U sendfable -d sendfable -c "select w.name, w.\"autoWelcomeEnabled\", c.\"autoSendEnabled\" from \"Workspace\" w left join \"MarketingAutopilotConfig\" c on c.\"workspaceId\"=w.id where w.name in ('TheDrinkPlace','DrinkKnird');"
docker exec sendfable-postgres psql -U sendfable -d sendfable -c "UPDATE \"Workspace\" SET \"autoWelcomeEnabled\"=false, \"updatedAt\"=now() WHERE name='TheDrinkPlace' AND \"autoWelcomeEnabled\"=true; UPDATE \"MarketingAutopilotConfig\" c SET \"autoSendEnabled\"=false, \"updatedAt\"=now() FROM \"Workspace\" w WHERE c.\"workspaceId\"=w.id AND w.name='TheDrinkPlace' AND c.\"autoSendEnabled\"=true;"
echo "=== DOCKER DIRS ==="
du -xh -d 1 /var/lib/docker 2>/dev/null | sort -hr | head -12
echo "=== DEPLOY HOME ==="
du -xh -d 1 /home/deploy 2>/dev/null | sort -hr | head -12
echo "=== PRUNE ==="
docker image prune -af
docker builder prune -af
echo "=== JOURNAL ==="
journalctl --vacuum-size=50M
npm cache clean --force >/dev/null 2>&1 || true
echo "=== DAEMON ==="
cat /etc/docker/daemon.json 2>/dev/null || echo NO_DAEMON_JSON
echo "=== LOGROTATE ==="
ls /etc/logrotate.d
echo "=== DF ==="
df -h /
