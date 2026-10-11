#!/usr/bin/env bash
# Authoritative SendFable production deploy.
# Resets the checkout to origin/main (or DEPLOY_SHA) and rebuilds app + worker.
# Does not enable newsletter auto-send and refuses a tree that still contains it.
set -euo pipefail
cd /opt/sendfable
export GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-ssh -i /root/.ssh/github_deploy -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new}"

if [ "${SKIP_GIT_SYNC:-0}" != "1" ]; then
  git fetch origin
  if [ -n "${DEPLOY_SHA:-}" ]; then
    git reset --hard "$DEPLOY_SHA"
  else
    git reset --hard origin/main
  fi
fi

git log -1 --oneline
if [ -e src/lib/newsletter ] || [ -f scripts/assert-tdp-newsletter.sh ] || [ -f scripts/_tmp-sf-deploy-verify.sh ]; then
  echo "REFUSING_DEPLOY: newsletter auto-send files are present"
  exit 2
fi
if grep -R -n enqueueAutopilotAutoSend src/lib src/worker >/dev/null 2>&1; then
  echo "REFUSING_DEPLOY: enqueueAutopilotAutoSend is still in the tree"
  exit 2
fi

docker compose -p sendfable -f docker-compose.prod.yml build app worker
docker compose -p sendfable -f docker-compose.prod.yml up -d --no-deps app worker
sleep 12
docker exec sendfable-worker sh -c 'test ! -d /app/src/lib/newsletter && ! grep -q enqueueAutopilotAutoSend /app/src/lib/autopilot/tick.ts /app/src/worker/index.ts'
curl -sf -o /dev/null -w 'health:%{http_code}\n' http://127.0.0.1:3010/api/health
echo DEPLOY_OK "$(git rev-parse --short HEAD)"
