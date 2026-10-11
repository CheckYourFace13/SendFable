#!/usr/bin/env bash
# Prove newsletter survives two normal rebuilds without mid-flight git wipe races.
set -euo pipefail
exec >/tmp/sf-deploy-verify.log 2>&1
echo START "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
cd /opt/sendfable
export GIT_SSH_COMMAND='ssh -i /root/.ssh/github_deploy -o IdentitiesOnly=yes'
git remote set-url origin https://github.com/CheckYourFace13/SendFable.git

PIN="${DEPLOY_SHA:-}"
git fetch origin main
if [ -z "$PIN" ]; then
  PIN="$(git rev-parse origin/main)"
fi
git reset --hard "$PIN"
git log -1 --oneline
export DEPLOY_SHA="$PIN"

for f in \
  /tmp/sf-scribe-deploy.sh \
  /tmp/sf-scribe-final.sh \
  /tmp/sf-scribe-after.sh \
  /tmp/sf-scribe-clean-deploy.sh \
  /tmp/sf-final-clean-deploy.sh \
  /tmp/_tmp-final-clean-deploy.sh
do
  printf '%s\n' '#!/bin/bash' 'echo "BLOCKED: use /opt/sendfable/scripts/deploy-production.sh"' 'exit 1' > "$f"
  chmod +x "$f"
done

DEPLOY_SHA="$PIN" bash scripts/deploy-production.sh
docker exec -w /app sendfable-worker npx tsx scripts/tdp-enable-auto-newsletter.ts --confirm-owner-qa
docker exec -w /app sendfable-worker npx tsx scripts/tdp-patch-live-welcome.ts || true
docker exec -w /app sendfable-worker npx tsx scripts/tdp-global-nl-qa.ts --confirm-owner-qa

# Second rebuild from the same pinned SHA (no floating origin/main fetch).
SKIP_GIT_SYNC=1 DEPLOY_SHA="$PIN" bash scripts/deploy-production.sh
test "$(git rev-parse HEAD)" = "$PIN"
docker exec sendfable-worker sh scripts/assert-tdp-newsletter.sh
docker exec sendfable-postgres psql -U sendfable -d sendfable -c \
  'select w.name, w."autoWelcomeEnabled", c."autoSendEnabled", c."checkFrequency", c.enabled from "Workspace" w left join "MarketingAutopilotConfig" c on c."workspaceId"=w.id where w.name='\''TheDrinkPlace'\'';'

echo SF_DEPLOY_VERIFY_OK "$(git rev-parse --short HEAD)" pin="$PIN"
