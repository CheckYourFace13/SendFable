#!/usr/bin/env bash
set -euo pipefail

echo "=== DNS ==="
echo -n "ns05: "; dig @ns05.domaincontrol.com sendfable.com A +short | tr '\n' ' '; echo
echo -n "ns06: "; dig @ns06.domaincontrol.com sendfable.com A +short | tr '\n' ' '; echo
echo -n "8.8.8.8: "; dig @8.8.8.8 sendfable.com A +short | tr '\n' ' '; echo

echo "=== Redirects (public + resolve) ==="
curl -sI --max-time 15 http://sendfable.com/ | grep -iE 'HTTP/|Location'
curl -sI --max-time 15 --resolve www.sendfable.com:80:177.7.38.145 http://www.sendfable.com/ | grep -iE 'HTTP/|Location'
curl -sI --max-time 15 --resolve www.sendfable.com:443:177.7.38.145 https://www.sendfable.com/ | grep -iE 'HTTP/|Location'
curl -sI --max-time 15 https://sendfable.com/ | grep -iE 'HTTP/|Server|Content-Type'

echo "=== TLS cert ==="
echo | openssl s_client -servername sendfable.com -connect sendfable.com:443 2>/dev/null | openssl x509 -noout -subject -dates -issuer | head -10

echo "=== Stack health ==="
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | head -20
curl -sf http://127.0.0.1:3010/api/health; echo
docker logs sendfable-worker --tail 5 2>&1
docker port sendfable-app
docker port sendfable-postgres 2>/dev/null || echo 'postgres: no host ports'
docker port sendfable-redis 2>/dev/null || echo 'redis: no host ports'

echo "=== SES / Stripe inactive ==="
python3 - <<'PY'
from pathlib import Path
env = Path('/opt/sendfable/.env').read_text()
keys = [
  'AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET',
  'EARLY_LAUNCH','ALLOW_PUBLIC_SIGNUP','APP_URL'
]
vals = {}
for line in env.splitlines():
  if '=' in line and not line.startswith('#'):
    k,v = line.split('=',1)
    vals[k]=v
for k in keys:
  v = vals.get(k,'‹missing›')
  if 'KEY' in k or 'SECRET' in k:
    print(f"{k}: empty={v==''} len={len(v)}")
  else:
    print(f"{k}={v}")
PY

echo "=== Outbox / no real SES evidence ==="
docker exec sendfable-app sh -c 'ls -la /tmp/outbox 2>/dev/null | head -20 || echo empty_or_missing'
docker logs sendfable-app --tail 100 2>&1 | grep -iE 'ses|MessageId|sendrawemail|smtp' | head -20 || echo 'no SES send lines in recent app logs'
docker logs sendfable-worker --tail 100 2>&1 | grep -iE 'ses|MessageId|sendrawemail|smtp|sent recipient' | head -20 || echo 'no SES send lines in recent worker logs'

echo "=== Other sites still up ==="
for h in gravyblock.com rentalnoodle.com plausible.rentalnoodle.com; do
  code=$(curl -sI --max-time 15 "https://$h/" -o /dev/null -w '%{http_code}')
  echo "$h => $code"
done

echo "=== Sites-enabled intact ==="
ls -la /etc/nginx/sites-enabled/

echo "FINAL_VERIFY_OK"
