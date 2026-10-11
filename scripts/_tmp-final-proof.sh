#!/bin/bash
set -u
cd /opt/sendfable
echo "HEAD $(git rev-parse --short HEAD)"
docker ps --format '{{.Names}} {{.Status}}' | grep sendfable
curl -sS -o /dev/null -w 'health:%{http_code}\n' http://127.0.0.1:3010/api/health || true
curl -sS -o /tmp/sf-one.json -w 'form:%{http_code}\n' http://127.0.0.1:3010/api/forms/public/drinkknird-newsletter || true
head -c 200 /tmp/sf-one.json; echo
docker exec sendfable-worker sh -c 'test ! -d /app/src/lib/newsletter && echo WORKER_CLEAN || echo WORKER_DIRTY'
ps -eo args | grep -E 'deploy-production|docker compose -p sendfable' | grep -v grep || echo NO_DEPLOY
