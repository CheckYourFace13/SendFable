#!/usr/bin/env bash
# Canonical production deploy for SendFable. Builds app+worker from git.
# Newsletter automation is required: assert fails closed if modules are missing.
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
HEAD_MSG="$(git log -1 --format=%s)"
case "$HEAD_MSG" in
  *"Remove the newsletter"*|*"remove the newsletter"*)
    echo "REFUSING_DEPLOY: HEAD removes TDP newsletter automation ($HEAD_MSG)"
    exit 2
    ;;
esac

test -f scripts/assert-tdp-newsletter.sh
test -f src/lib/newsletter/auto-welcome.ts
test -f src/lib/newsletter/auto-weekly.ts
test -f src/lib/newsletter/welcome-html.ts
sh scripts/assert-tdp-newsletter.sh

docker compose -p sendfable -f docker-compose.prod.yml build app worker
docker compose -p sendfable -f docker-compose.prod.yml up -d --no-deps app worker
sleep 15
docker run --rm sendfable-worker:latest sh scripts/assert-tdp-newsletter.sh
docker exec sendfable-worker sh scripts/assert-tdp-newsletter.sh
docker exec sendfable-worker sh -c 'grep -q "Explore drinks" src/lib/newsletter/welcome-html.ts'
curl -sf http://127.0.0.1:3010/api/health; echo
echo DEPLOY_OK "$(git rev-parse --short HEAD)"
