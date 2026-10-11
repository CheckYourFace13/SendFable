#!/usr/bin/env bash
# Authoritative SendFable production deploy.
# Exclusive lock, then reset to origin/main or DEPLOY_SHA and rebuild app + worker.
# Refuses a tree that still contains newsletter auto-send.
set -euo pipefail
cd /opt/sendfable

LOCK_FILE="${SENDFABLE_DEPLOY_LOCK:-/var/lock/sendfable-deploy.lock}"
LOCK_DIR="$(dirname "$LOCK_FILE")"
mkdir -p "$LOCK_DIR" 2>/dev/null || true
if ! touch "$LOCK_FILE" 2>/dev/null; then
  LOCK_FILE="/opt/sendfable/.sendfable-deploy.lock"
  touch "$LOCK_FILE"
fi

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  holder="$(cat "${LOCK_FILE}.holder" 2>/dev/null || true)"
  echo "DEPLOY_LOCK_HELD: another SendFable deploy is in progress${holder:+ ($holder)}"
  exit 4
fi
echo "pid=$$ host=$(hostname) started=$(date -u +%Y-%m-%dT%H:%M:%SZ) sha=${DEPLOY_SHA:-origin/main}" >"${LOCK_FILE}.holder"
trap 'rm -f "${LOCK_FILE}.holder"; flock -u 9' EXIT

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
if [ -e src/lib/newsletter ] || [ -f scripts/assert-tdp-newsletter.sh ] || [ -f scripts/require-tdp-newsletter-sources.sh ] || [ -f scripts/_tmp-sf-deploy-verify.sh ]; then
  echo "REFUSING_DEPLOY: newsletter auto-send files are present"
  exit 2
fi
if grep -R -n enqueueAutopilotAutoSend src/lib src/worker >/dev/null 2>&1; then
  echo "REFUSING_DEPLOY: enqueueAutopilotAutoSend is still in the tree"
  exit 2
fi

docker compose -p sendfable -f docker-compose.prod.yml build app worke
docker compose -p sendfable -f docker-compose.prod.yml up -d --no-deps app worke
sleep 12
docker exec sendfable-worker sh -c 'test ! -d /app/src/lib/newsletter && ! grep -q enqueueAutopilotAutoSend /app/src/lib/autopilot/tick.ts /app/src/worker/index.ts'
curl -sf -o /dev/null -w 'health:%{http_code}\n' http://127.0.0.1:3010/api/health
echo DEPLOY_OK "$(git rev-parse --short HEAD)"
