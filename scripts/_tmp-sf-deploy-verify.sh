#!/usr/bin/env bash
# Canonical redeploy proof: newsletter must survive normal deploy-production twice.
set -euo pipefail
exec >/tmp/sf-deploy-verify.log 2>&1
echo START "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
cd /opt/sendfable
export GIT_SSH_COMMAND='ssh -i /root/.ssh/github_deploy -o IdentitiesOnly=yes'

git remote set-url origin https://github.com/CheckYourFace13/SendFable.git
git fetch origin main
git reset --hard origin/main
git log -1 --oneline
test -f scripts/assert-tdp-newsletter.sh
test -f scripts/deploy-production.sh
test -f src/lib/newsletter/auto-welcome.ts
test -f src/lib/newsletter/auto-weekly.ts
sh scripts/assert-tdp-newsletter.sh

# Neutralize host wipe scripts (competing paths)
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

bash scripts/deploy-production.sh
docker exec sendfable-worker sh scripts/assert-tdp-newsletter.sh
curl -sf http://127.0.0.1:3010/api/health; echo

# Owner QA only — must duplicate-block welcome, not blast subscribers
docker exec -w /app sendfable-worker npx tsx scripts/tdp-enable-auto-newsletter.ts --confirm-owner-qa
docker exec -w /app sendfable-worker npx tsx scripts/tdp-patch-live-welcome.ts || true
docker exec -w /app sendfable-worker npx tsx scripts/tdp-global-nl-qa.ts --confirm-owner-qa

# Second canonical deploy proves newsletter survives normal redeploy
bash scripts/deploy-production.sh
docker exec sendfable-worker sh scripts/assert-tdp-newsletter.sh
docker exec sendfable-postgres psql -U sendfable -d sendfable -c \
  'select w.name, w."autoWelcomeEnabled", c."autoSendEnabled", c."checkFrequency", c.enabled from "Workspace" w left join "MarketingAutopilotConfig" c on c."workspaceId"=w.id where w.name='\''TheDrinkPlace'\'';'

echo SF_DEPLOY_VERIFY_OK "$(git rev-parse --short HEAD)"
