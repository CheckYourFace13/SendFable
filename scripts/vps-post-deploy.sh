#!/usr/bin/env bash
set -euo pipefail

echo "=== Containers ==="
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
ss -tlnp | grep 3010 || true

echo "=== Worker logs ==="
docker logs sendfable-worker --tail 25 2>&1

echo "=== Create owner ==="
export OWNER_PASSWORD
OWNER_PASSWORD="$(cat /root/sendfable-secrets/owner-password.txt)"
docker exec \
  -e OWNER_EMAIL=chris@sendfable.com \
  -e OWNER_PASSWORD="$OWNER_PASSWORD" \
  -e OWNER_NAME=Chris \
  sendfable-worker npx tsx scripts/create-owner.ts

echo "=== Nginx backup ==="
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p /root/nginx-backups
tar -czf "/root/nginx-backups/nginx-$TS.tar.gz" -C /etc nginx
cp -a /etc/nginx/sites-enabled "/root/nginx-backups/sites-enabled-$TS"
sha256sum /etc/nginx/sites-available/* > "/root/nginx-backups/sites-sha-$TS.txt"
echo "BACKUP=$TS"

echo "=== Install sendfable site ==="
cp /opt/sendfable/deploy/nginx-sendfable.conf /etc/nginx/sites-available/sendfable
ln -sfn /etc/nginx/sites-available/sendfable /etc/nginx/sites-enabled/sendfable
nginx -t
systemctl reload nginx
echo "NGINX_RELOAD_OK"
ls -la /etc/nginx/sites-enabled/

echo "=== Smoke Host headers ==="
curl -sI -H 'Host: sendfable.com' http://127.0.0.1/ | head -15
echo '---'
curl -sI -H 'Host: gravyblock.com' http://127.0.0.1/ | head -8
echo '---'
curl -sI -H 'Host: rentalnoodle.com' http://127.0.0.1/ | head -8

echo "=== Public DNS check ==="
dig +short sendfable.com A || true
