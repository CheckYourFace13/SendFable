#!/usr/bin/env bash
set -euo pipefail

TARGET="177.7.38.145"
MAX_ATTEMPTS=40   # ~40 minutes
ATTEMPT=0

dns_clean() {
  local ns="$1"
  local out
  out="$(dig @"$ns" sendfable.com A +short | sort -u | tr '\n' ' ' | sed 's/[[:space:]]*$//')"
  echo "$out"
  [[ "$out" == "$TARGET" ]]
}

echo "Waiting for authoritative DNS to return only $TARGET ..."
while true; do
  ATTEMPT=$((ATTEMPT + 1))
  NS05="$(dns_clean ns05.domaincontrol.com || true)"
  # re-run properly for exit status
  OUT05="$(dig @ns05.domaincontrol.com sendfable.com A +short | sort -u)"
  OUT06="$(dig @ns06.domaincontrol.com sendfable.com A +short | sort -u)"
  echo "[$(date -u +%H:%M:%S)] attempt $ATTEMPT"
  echo "  ns05: $(echo "$OUT05" | tr '\n' ' ')"
  echo "  ns06: $(echo "$OUT06" | tr '\n' ' ')"

  if [[ "$OUT05" == "$TARGET" && "$OUT06" == "$TARGET" ]]; then
    echo "AUTHORITATIVE_DNS_CLEAN"
    break
  fi

  if [[ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]]; then
    echo "TIMEOUT waiting for authoritative DNS"
    exit 2
  fi
  sleep 60
done

echo "=== Wait for public resolvers (optional, up to 20 min) ==="
PUB_ATTEMPT=0
while true; do
  PUB_ATTEMPT=$((PUB_ATTEMPT + 1))
  CF="$(dig @1.1.1.1 sendfable.com A +short | sort -u)"
  GG="$(dig @8.8.8.8 sendfable.com A +short | sort -u)"
  echo "[$(date -u +%H:%M:%S)] public attempt $PUB_ATTEMPT  cf=($(echo "$CF" | tr '\n' ' ')) gg=($(echo "$GG" | tr '\n' ' '))"
  if [[ "$CF" == "$TARGET" && "$GG" == "$TARGET" ]]; then
    echo "PUBLIC_DNS_CLEAN"
    break
  fi
  if [[ "$PUB_ATTEMPT" -ge 20 ]]; then
    echo "PUBLIC_DNS_STILL_CACHED — proceeding with Certbot anyway (auth is clean)"
    break
  fi
  sleep 60
done

echo "=== Certbot ==="
set +e
certbot --nginx -d sendfable.com -d www.sendfable.com \
  --non-interactive --agree-tos --email chris@sendfable.com --redirect
CERT_RC=$?
set -e
echo "CERTBOT_EXIT=$CERT_RC"
nginx -t
systemctl reload nginx

if [[ "$CERT_RC" -ne 0 ]]; then
  echo "CERTBOT_FAILED"
  exit 3
fi

echo "=== HTTPS verify ==="
curl -sI --max-time 20 https://sendfable.com/ | head -20
echo '---'
curl -sI --max-time 20 http://sendfable.com/ | head -15
echo '---'
curl -sI --max-time 20 http://www.sendfable.com/ | head -15
echo '---'
curl -sI --max-time 20 https://www.sendfable.com/ | head -15

echo "=== Health / stack ==="
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
curl -sf http://127.0.0.1:3010/api/health; echo
docker logs sendfable-worker --tail 8 2>&1

echo "=== Env gates (no secrets) ==="
grep -E '^(EARLY_LAUNCH|ALLOW_PUBLIC_SIGNUP|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|APP_URL)=' /opt/sendfable/.env \
  | sed -E 's/(KEY|SECRET)=.+/\\1=‹set-or-blank›/'

echo "=== Other sites ==="
for h in gravyblock.com rentalnoodle.com plausible.rentalnoodle.com; do
  echo "-- $h --"
  curl -sI --max-time 15 "https://$h/" | head -6 || curl -sI --max-time 10 -H "Host: $h" http://127.0.0.1/ | head -6
done

echo "=== Early launch gates ==="
curl -s -o /tmp/signup.json -w 'signup_http=%{http_code}\n' -H 'Content-Type: application/json' \
  -d '{"email":"probe@example.com","password":"password12345678","name":"Probe"}' \
  https://sendfable.com/api/auth/signup
cat /tmp/signup.json; echo

echo "DONE_PRE_LOGIN"
