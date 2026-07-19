#!/usr/bin/env bash
set -euo pipefail

NEW_EMAIL="chris@iscreamstudio.com"
OLD_EMAIL="chris@sendfable.com"
PASSWORD="$(cat /root/sendfable-secrets/owner-password.txt)"

login_attempt() {
  local email="$1"
  local jar
  jar="$(mktemp)"
  local csrf
  csrf="$(curl -sS -c "$jar" -b "$jar" https://sendfable.com/api/auth/csrf | python3 -c 'import sys,json; print(json.load(sys.stdin)["csrfToken"])')"
  curl -sS -o /tmp/login-body.txt -D /tmp/login-headers.txt -w '%{http_code}' \
    -c "$jar" -b "$jar" \
    -X POST 'https://sendfable.com/api/auth/callback/credentials' \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "csrfToken=$csrf" \
    --data-urlencode "email=$email" \
    --data-urlencode "password=$PASSWORD" \
    --data-urlencode 'callbackUrl=https://sendfable.com/dashboard' \
    --data-urlencode 'json=true' >/tmp/login-code.txt
  local code
  code="$(cat /tmp/login-code.txt)"
  local loc
  loc="$(grep -i '^location:' /tmp/login-headers.txt | tr -d '\r' | awk '{print $2}')"
  local session
  session="$(curl -sS -c "$jar" -b "$jar" https://sendfable.com/api/auth/session)"
  local dash
  dash="$(curl -sS -o /dev/null -w '%{http_code}' -c "$jar" -b "$jar" https://sendfable.com/dashboard)"
  echo "email=$email http=$code location=${loc:-none}"
  echo "session=$session"
  echo "dashboard=$dash"
  rm -f "$jar"
}

echo "=== Login NEW ==="
login_attempt "$NEW_EMAIL"
echo
echo "=== Login OLD (must fail) ==="
login_attempt "$OLD_EMAIL"
echo
echo "=== Ownership ==="
docker exec sendfable-postgres psql -U sendfable -d sendfable -c \
  "SELECT u.email, m.role, w.name
   FROM \"User\" u
   JOIN \"Membership\" m ON m.\"userId\"=u.id
   JOIN \"Workspace\" w ON w.id=m.\"workspaceId\"
   WHERE u.email='$NEW_EMAIL';"
echo
echo "=== Health ==="
curl -sf http://127.0.0.1:3010/api/health; echo
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E 'NAMES|sendfable'
