#!/bin/bash
set -u
echo "=== REDEPLOY SCRIPT ==="
sed -n '1,80p' /tmp/sf-redeploy-only.sh
echo "=== DEPLOY LOG TAIL ==="
tail -n 40 /tmp/sf-deploy-production.log
echo "=== VERIFY LOG TAIL ==="
tail -n 15 /tmp/sf-deploy-verify.log
