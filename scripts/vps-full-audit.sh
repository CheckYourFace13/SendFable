#!/usr/bin/env bash
# Read-only audit for Sendfable production VPS. Safe to run as root.
set -euo pipefail
echo "=== IDENTITY ==="
hostname; whoami; hostname -I || true
cat /etc/os-release
echo "=== RESOURCES ==="
nproc
free -h
df -h /
echo "=== DOCKER ==="
docker --version || true
docker compose version || true
echo "=== CONTAINERS ==="
docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' || true
echo "=== COMPOSE PROJECTS ==="
docker compose ls || true
echo "=== NETWORKS ==="
docker network ls || true
echo "=== VOLUMES ==="
docker volume ls || true
echo "=== SENDFABLE NAME CONFLICTS ==="
docker ps -a --format '{{.Names}}' | grep -i sendfable || echo "(no sendfable containers)"
docker network ls --format '{{.Name}}' | grep -i sendfable || echo "(no sendfable networks)"
docker volume ls --format '{{.Name}}' | grep -i sendfable || echo "(no sendfable volumes)"
ls -la /opt 2>/dev/null || true
ls -la /opt/sendfable 2>/dev/null || echo "(no /opt/sendfable)"
echo "=== PROJECT DIRS ==="
ls -la /opt 2>/dev/null || true
ls -la /var/www 2>/dev/null || true
ls -la /home 2>/dev/null || true
echo "=== LISTENERS ==="
ss -tlnp | grep -E ':80 |:443 |:3000 |:5432 |:6379 ' || true
echo "=== FIREWALL ==="
ufw status verbose 2>/dev/null || true
iptables -S 2>/dev/null | head -40 || true
echo "=== CADDY ==="
command -v caddy || true
systemctl is-active caddy 2>/dev/null || true
docker ps --format '{{.Names}} {{.Image}}' | grep -i caddy || true
ls -la /etc/caddy 2>/dev/null || true
ls -la /opt/*/Caddyfile 2>/dev/null || true
find /opt /etc -maxdepth 3 -name 'Caddyfile' 2>/dev/null | head -20 || true
echo "=== NGINX ==="
command -v nginx || true
systemctl is-active nginx 2>/dev/null || true
ls -la /etc/nginx/sites-enabled 2>/dev/null || true
echo "=== TRAEFIK ==="
command -v traefik || true
docker ps --format '{{.Names}} {{.Image}}' | grep -i traefik || true
echo "=== DOMAINS HINTS ==="
grep -RhosE '([a-z0-9-]+\.)+[a-z]{2,}' /etc/caddy /etc/nginx/sites-enabled /opt --include='Caddyfile' --include='*.conf' 2>/dev/null | sort -u | head -80 || true
echo "=== AUDIT_DONE ==="
