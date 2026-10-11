#!/bin/bash
set -eu
cd /opt/sendfable
export GIT_SSH_COMMAND="ssh -i /root/.ssh/github_deploy -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"
git fetch origin
git reset --hard cdfc6ff19127abf99ac0a279184bb6bf19dc9ac8
test ! -e src/lib/newslette
export SKIP_GIT_SYNC=1
bash scripts/deploy-production.sh
echo "=== AFTER ==="
git rev-parse HEAD
docker exec sendfable-worker sh -c 'test ! -d /app/src/lib/newsletter && echo WORKER_CLEAN || echo WORKER_DIRTY'
curl -sf -o /dev/null -w 'health:%{http_code}\n' http://127.0.0.1:3010/api/health
