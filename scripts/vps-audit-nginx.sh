#!/usr/bin/env bash
set +e
echo "=== NGINX SITES ==="
for f in /etc/nginx/sites-available/*; do
  echo "---- $f ----"
  grep -E 'server_name|listen |proxy_pass|root |ssl_certificate' "$f" | head -50
done
echo "=== SENDFABLE IN NGINX ==="
grep -Rni sendfable /etc/nginx 2>/dev/null || echo none
echo "=== PORT 3000 ==="
ss -tlnp | grep 3000
pid=$(ss -tlnp | awk '/:3000/{match($0,/pid=([0-9]+)/,a); print a[1]; exit}')
echo "pid=$pid"
if [ -n "$pid" ]; then
  ps -fp "$pid"
  ls -la "/proc/$pid/cwd" 2>/dev/null
  tr '\0' ' ' < "/proc/$pid/cmdline"; echo
fi
echo "=== HOST POSTGRES BIND ==="
ss -tlnp | grep 5432
echo "=== REDIS ==="
ss -tlnp | grep 6379 || echo "6379 not listening"
echo "=== LETSENCRYPT LIVE ==="
ls /etc/letsencrypt/live 2>/dev/null || echo none
echo "=== CERTBOT ==="
command -v certbot; certbot certificates 2>/dev/null | head -80
echo "=== /opt PROJECTS ==="
for d in /opt/*/; do echo "## $d"; ls "$d" | head -15; done
echo "=== /home/deploy ==="
ls -la /home/deploy | head -40
echo "=== NGINX -t ==="
nginx -t 2>&1
echo "=== DONE ==="
