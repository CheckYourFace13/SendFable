#!/bin/bash
set -u
ps -eo pid,etime,args | grep -E 'deploy-production|docker|pkill|sf-final|sf-auth|newsletter' | grep -v grep || echo NONE
echo "HEAD $(cd /opt/sendfable && git rev-parse --short HEAD)"
curl -sS -o /dev/null -w 'health:%{http_code}\n' http://127.0.0.1:3010/api/health || true
