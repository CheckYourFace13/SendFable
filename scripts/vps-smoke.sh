#!/usr/bin/env bash
set -euo pipefail

echo "=== Stack ==="
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | head -20
curl -sf http://127.0.0.1:3010/api/health; echo

echo "=== Env gates (no secrets) ==="
grep -E '^(EARLY_LAUNCH|ALLOW_PUBLIC_SIGNUP|AWS_|STRIPE_|APP_URL|NEXTAUTH_URL)=' /opt/sendfable/.env | sed 's/\(SECRET\|PASSWORD\|KEY\)=.*/\1=***/'

echo "=== Early launch / signup ==="
curl -sI -H 'Host: sendfable.com' http://127.0.0.1/signup | head -15
echo '---'
curl -sI -H 'Host: sendfable.com' http://127.0.0.1/early-access | head -12
echo '---'
curl -s -o /tmp/signup-post.json -w '%{http_code}' -H 'Host: sendfable.com' -H 'Content-Type: application/json' \
  -d '{"email":"probe@example.com","password":"password12345678","name":"Probe"}' \
  http://127.0.0.1/api/auth/signup
echo
cat /tmp/signup-post.json; echo

echo "=== Brand requires auth ==="
curl -sI -H 'Host: sendfable.com' http://127.0.0.1/brand | head -12

echo "=== Other sites still redirect HTTPS ==="
curl -sI -H 'Host: gravyblock.com' http://127.0.0.1/ | head -6
curl -sI -H 'Host: rentalnoodle.com' http://127.0.0.1/ | head -6
curl -sI -H 'Host: plausible.rentalnoodle.com' http://127.0.0.1/ | head -6

echo "=== Worker redis ==="
docker logs sendfable-worker --tail 5 2>&1

echo "=== Ports published ==="
docker port sendfable-app
docker port sendfable-postgres || echo 'postgres: no published ports (ok)'
docker port sendfable-redis || echo 'redis: no published ports (ok)'

echo "=== DNS ==="
dig +short sendfable.com A
dig +short www.sendfable.com CNAME
dig +short www.sendfable.com A

echo "=== External via public IP Host ==="
curl -sI -H 'Host: sendfable.com' http://177.7.38.145/ | head -12
