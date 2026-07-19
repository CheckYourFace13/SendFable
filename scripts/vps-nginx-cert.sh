#!/usr/bin/env bash
set -euo pipefail

echo "=== Nginx backup ==="
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p /root/nginx-backups
tar -czf "/root/nginx-backups/nginx-$TS.tar.gz" -C /etc nginx
cp -a /etc/nginx/sites-enabled "/root/nginx-backups/sites-enabled-$TS"
sha256sum /etc/nginx/sites-available/* > "/root/nginx-backups/sites-sha-$TS.txt" || true
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

echo "=== DNS ==="
dig +short sendfable.com A || true

echo "=== Certbot attempt ==="
# May fail while GoDaddy parking A records still resolve alongside VPS IP
set +e
certbot --nginx -d sendfable.com -d www.sendfable.com --non-interactive --agree-tos --email chris@sendfable.com --redirect
CERT_RC=$?
set -e
echo "CERTBOT_EXIT=$CERT_RC"
nginx -t
systemctl reload nginx
ls -la /etc/letsencrypt/live/sendfable.com 2>/dev/null || echo "NO_CERT_YET"
