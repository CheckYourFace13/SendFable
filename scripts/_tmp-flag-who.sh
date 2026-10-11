#!/bin/bash
set -u
echo "=== PROCS ==="
ps -eo pid,etime,cmd | grep -E 'tdp-enable|tdp-global|tdp-nl|deploy-production|sf-deploy-verify|restore-sf' | grep -v grep || echo NONE
echo "=== UPDATED ==="
docker exec sendfable-postgres psql -U sendfable -d sendfable -c "select w.name, w.\"autoWelcomeEnabled\", w.\"updatedAt\", c.\"autoSendEnabled\", c.enabled, c.\"updatedAt\" from \"Workspace\" w left join \"MarketingAutopilotConfig\" c on c.\"workspaceId\"=w.id where w.name in ('TheDrinkPlace','DrinkKnird');"
echo "=== RECENT TMP ==="
ls -lt /tmp/*sf* /tmp/*newsletter* /tmp/*tdp* 2>/dev/null | head -30
echo "=== LOG HITS ==="
grep -l 'autoWelcome\|tdp-enable\|confirm-owner' /tmp/*.log 2>/dev/null | head -20
