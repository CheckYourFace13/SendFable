#!/usr/bin/env bash
# Canonical production deploy for SendFable (app + worker).
# Exclusive flock + content-based newsletter source checks.
# Do not use /tmp wipe/authoritative scripts that pin wipe SHAs.
set -euo pipefail
cd /opt/sendfable

LOCK_FILE="${SENDFABLE_DEPLOY_LOCK:-/var/lock/sendfable-deploy.lock}"
LOCK_DIR="$(dirname "$LOCK_FILE")"
mkdir -p "$LOCK_DIR" 2>/dev/null || true
# Prefer /var/lock; fall back to /opt/sendfable if not writable.
if ! touch "$LOCK_FILE" 2>/dev/null; then
  LOCK_FILE="/opt/sendfable/.sendfable-deploy.lock"
  touch "$LOCK_FILE"
fi

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  holder="$(cat "${LOCK_FILE}.holder" 2>/dev/null || true)"
  echo "DEPLOY_LOCK_HELD: another SendFable deploy is in progress${holder:+ ($holder)}"
  echo "Coordinate with the holder; do not force parallel docker compose up for sendfable."
  exit 4
fi
echo "pid=$$ host=$(hostname) started=$(date -u +%Y-%m-%dT%H:%M:%SZ) sha=${DEPLOY_SHA:-origin/main} by=${DEPLOY_ACTOR:-unknown}" >"${LOCK_FILE}.holder"
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

# Content-based gate (not commit-message matching alone).
sh scripts/require-tdp-newsletter-sources.sh

docker compose -p sendfable -f docker-compose.prod.yml build app worker
docker compose -p sendfable -f docker-compose.prod.yml up -d --no-deps app worker
sleep 15
docker run --rm sendfable-worker:latest sh scripts/assert-tdp-newsletter.sh
docker exec sendfable-worker sh scripts/assert-tdp-newsletter.sh
docker exec sendfable-worker sh -c 'test -f src/lib/newsletter/auto-welcome.ts && grep -q "Explore drinks" src/lib/newsletter/welcome-html.ts'
curl -sf http://127.0.0.1:3010/api/health; echo
echo DEPLOY_OK "$(git rev-parse --short HEAD)" lock="$LOCK_FILE"
