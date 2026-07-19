#!/usr/bin/env bash
set -euo pipefail
OWNER_PASSWORD="$(cat /root/sendfable-secrets/owner-password.txt)"
docker exec \
  -e OWNER_EMAIL=chris@iscreamstudio.com \
  -e OWNER_PASSWORD="$OWNER_PASSWORD" \
  -e OWNER_NAME=Chris \
  sendfable-worker npx tsx scripts/create-owner.ts
