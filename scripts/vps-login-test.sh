#!/usr/bin/env bash
set -euo pipefail

EMAIL="chris@iscreamstudio.com"
PASSWORD="$(cat /root/sendfable-secrets/owner-password.txt)"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

echo "=== CSRF ==="
CSRF_JSON="$(curl -sS -c "$COOKIE_JAR" -b "$COOKIE_JAR" https://sendfable.com/api/auth/csrf)"
echo "$CSRF_JSON"
CSRF="$(printf '%s' "$CSRF_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin)["csrfToken"])')"

echo "=== Credentials sign-in ==="
# NextAuth v5 credentials callback
LOGIN_HEADERS="$(mktemp)"
HTTP_CODE="$(curl -sS -D "$LOGIN_HEADERS" -o /tmp/login-body.txt -w '%{http_code}' \
  -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -X POST 'https://sendfable.com/api/auth/callback/credentials' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "email=$EMAIL" \
  --data-urlencode "password=$PASSWORD" \
  --data-urlencode 'callbackUrl=https://sendfable.com/dashboard' \
  --data-urlencode 'json=true')"
echo "login_http=$HTTP_CODE"
head -30 "$LOGIN_HEADERS"
echo "body:"; head -c 500 /tmp/login-body.txt; echo

echo "=== Session ==="
curl -sS -c "$COOKIE_JAR" -b "$COOKIE_JAR" https://sendfable.com/api/auth/session
echo

echo "=== Dashboard (expect 200, not login redirect) ==="
curl -sSI -c "$COOKIE_JAR" -b "$COOKIE_JAR" https://sendfable.com/dashboard | head -20

echo "=== Demo login should fail ==="
CSRF2="$(curl -sS -c /tmp/demo.jar -b /tmp/demo.jar https://sendfable.com/api/auth/csrf | python3 -c 'import sys,json; print(json.load(sys.stdin)["csrfToken"])')"
DEMO_CODE="$(curl -sS -o /tmp/demo-body.txt -w '%{http_code}' \
  -c /tmp/demo.jar -b /tmp/demo.jar \
  -X POST 'https://sendfable.com/api/auth/callback/credentials' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode "csrfToken=$CSRF2" \
  --data-urlencode 'email=demo@sendfable.com' \
  --data-urlencode 'password=password123' \
  --data-urlencode 'callbackUrl=https://sendfable.com/dashboard' \
  --data-urlencode 'json=true')"
echo "demo_http=$DEMO_CODE"
head -c 300 /tmp/demo-body.txt; echo
curl -sS -b /tmp/demo.jar https://sendfable.com/api/auth/session; echo
