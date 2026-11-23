#!/usr/bin/env bash
set -euo pipefail
echo "=== bounce diagnose ==="
NODE_PATH=/app/node_modules node /tmp/vps-bounce-diagnose.cjs || true
echo "=== nginx error Nov 23 17:37-17:54 ==="
grep -E 'Nov 23 17:(3[7-9]|4[0-9]|5[0-4]):' /var/log/nginx/error.log 2>/dev/null | head -50 || true
grep -E '2026/11/23 17:(3[7-9]|4[0-9]|5[0-4]):' /var/log/nginx/error.log 2>/dev/null | head -50 || true
echo "=== nginx access non-2xx in window ==="
awk '$4 ~ /23\/Nov\/2026:17:(3[7-9]|4[0-9]|5[0-4])/ && $9 !~ /^2/' /var/log/nginx/access.log 2>/dev/null | head -40 || true
echo "=== nginx upstream/ssl Nov 23 ==="
grep -E 'upstream timed out|Connection reset|SSL_do_handshake|no live upstreams|recv\(\) failed|upstream prematurely' /var/log/nginx/error.log 2>/dev/null | grep -E 'Nov 23|/23/' | head -40 || true
echo "=== access totals in window ==="
awk '$4 ~ /23\/Nov\/2026:17:(3[7-9]|4[0-9]|5[0-4])/' /var/log/nginx/access.log 2>/dev/null | awk '{c[$9]++} END {for (s in c) print s, c[s]}' || true
echo "=== worker_connections / limits ==="
nginx -T 2>/dev/null | grep -E 'worker_connections|worker_rlimit_nofile|keepalive_timeout|ssl_protocols' | head -20 || true
ulimit -n
echo "=== docker restart events today ==="
docker events --since '2026-11-23T17:00:00' --until '2026-11-23T18:00:00' --filter 'type=container' 2>/dev/null | head -20 || true
docker inspect sendfable-app --format 'Started={{.State.StartedAt}} RestartCount={{.RestartCount}} OOM={{.State.OOMKilled}}' 2>/dev/null || true
