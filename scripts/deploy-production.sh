#!/usr/bin/env bash
set -euo pipefail
cd /opt/sendfable
export GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-ssh -i /root/.ssh/github_deploy -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new}"
git fetch origin
git reset --hard origin/main
git log -1 --oneline
sh scripts/assert-tdp-newsletter.sh
docker compose -p sendfable -f docker-compose.prod.yml build app worker
docker compose -p sendfable -f docker-compose.prod.yml up -d --no-deps app worker
sleep 15
docker run --rm sendfable-worker:latest sh scripts/assert-tdp-newsletter.sh
docker exec sendfable-worker sh -c 'grep -q "Explore drinks" src/lib/newsletter/welcome-html.ts'
curl -sf http://127.0.0.1:3010/api/health; echo
echo DEPLOY_OK "$(git rev-parse --short HEAD)"
