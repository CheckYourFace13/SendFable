#!/usr/bin/env bash
set -euo pipefail

TS=$(date +%Y%m%d-%H%M%S)
mkdir -p /root/nginx-backups
cp -a /etc/nginx/sites-available/sendfable "/root/nginx-backups/sendfable-pre-apex-$TS"
tar -czf "/root/nginx-backups/nginx-pre-apex-$TS.tar.gz" -C /etc nginx

cat > /etc/nginx/sites-available/sendfable <<'EOF'
# Sendfable — Nginx site (Certbot + www→apex)
# Upstream: Docker app bound to 127.0.0.1:3010 only.

# www → apex (HTTPS)
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name www.sendfable.com;

    ssl_certificate /etc/letsencrypt/live/sendfable.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sendfable.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://sendfable.com$request_uri;
}

# apex
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name sendfable.com;

    ssl_certificate /etc/letsencrypt/live/sendfable.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sendfable.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://127.0.0.1:3010;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 120s;
    }
}

# HTTP → HTTPS (www and apex both land on apex HTTPS)
server {
    listen 80;
    listen [::]:80;
    server_name sendfable.com www.sendfable.com;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://sendfable.com$request_uri;
    }
}
EOF

nginx -t
systemctl reload nginx
echo "WWW_APEX_REDIRECT_OK"

echo "=== Redirect checks ==="
curl -sI --max-time 15 http://sendfable.com/ | head -8
curl -sI --max-time 15 http://www.sendfable.com/ | head -8
curl -sI --max-time 15 https://www.sendfable.com/ | head -8
curl -sI --max-time 15 https://sendfable.com/ | head -8
