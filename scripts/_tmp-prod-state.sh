#!/bin/bash
set -u
echo "=== HOST HEAD ==="
cd /opt/sendfable
git rev-parse HEAD
git log -1 --oneline
git status -sb
echo "=== CONTAINERS ==="
docker ps --format '{{.Names}} {{.Status}} {{.Image}}' | grep sendfable || true
echo "=== APP LABEL ==="
docker exec sendfable-app sh -c 'cat /app/BUILD_COMMIT 2>/dev/null; ls /app/.next/BUILD_ID 2>/dev/null; echo ---; grep -R -l enqueueAutopilotAutoSend /app/.next /app/server.js 2>/dev/null | head -5; echo app_grep_done; test ! -d /app/src/lib/newsletter && echo APP_NEWSLETTER_DIR_ABSENT || echo APP_NEWSLETTER_DIR_PRESENT'
echo "=== WORKER LABEL ==="
docker exec sendfable-worker sh -c 'grep -n enqueueAutopilotAutoSend /app/src/worker/index.ts /app/src/lib/autopilot/tick.ts 2>/dev/null; echo worker_grep_done; test ! -d /app/src/lib/newsletter && echo WORKER_NEWSLETTER_DIR_ABSENT || echo WORKER_NEWSLETTER_DIR_PRESENT; head -5 /app/package.json'
echo "=== DISK ==="
df -h /
echo "=== PROCS ==="
ps -eo pid,etime,cmd | grep -E 'sf-redeploy|sf-deploy-verify|deploy-production|tdp-enable-auto|restore-sf|sf-final' | grep -v grep || echo NONE
echo "=== HEALTH ==="
curl -sf -o /dev/null -w 'health:%{http_code}\n' http://127.0.0.1:3010/api/health
