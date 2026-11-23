#!/usr/bin/env bash
set -euo pipefail
echo "=== UTC now ==="
date -u
echo "=== sendfable errors Nov 23 ==="
grep -E "sendfable.com" /var/log/nginx/error.log /var/log/nginx/error.log.1 2>/dev/null | grep "23/Nov/2026\|2026/11/23" | tail -80 || true
echo "=== access status counts 17:37-17:54 UTC ==="
awk '$4 ~ /23\/Nov\/2026:17:(3[7-9]|4[0-9]|5[0-4]):/ && $0 ~ /sendfable\.com/ {print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -30
echo "=== non-2xx/3xx in window ==="
awk '$4 ~ /23\/Nov\/2026:17:(3[7-9]|4[0-9]|5[0-4]):/ && $0 ~ /sendfable\.com/ && $9+0 >= 400 {print}' /var/log/nginx/access.log | head -40
echo "=== request volume in window ==="
awk '$4 ~ /23\/Nov\/2026:17:(3[7-9]|4[0-9]|5[0-4]):/ && $0 ~ /sendfable\.com/ {c++} END{print c+0}' /var/log/nginx/access.log
echo "=== upstream resets today for sendfable ==="
grep -E "sendfable.com.*(reset by peer|prematurely closed|Connection refused|timed out)" /var/log/nginx/error.log /var/log/nginx/error.log.1 2>/dev/null | tail -40 || true
echo "=== memory ==="
free -h
echo "=== docker health ==="
docker inspect sendfable-app --format 'Status={{.State.Status}} Health={{if .State.Health}}{{.State.Health.Status}}{{end}} OOM={{.State.OOMKilled}} RestartCount={{.RestartCount}} Started={{.State.StartedAt}}'
echo "=== worker_connections ==="
nginx -T 2>/dev/null | grep -E "worker_connections|worker_rlimit_nofile|keepalive_timeout" | head -20
