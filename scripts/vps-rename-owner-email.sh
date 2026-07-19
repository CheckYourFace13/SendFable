#!/usr/bin/env bash
set -euo pipefail

OLD_EMAIL="chris@sendfable.com"
NEW_EMAIL="chris@iscreamstudio.com"

echo "=== Pre-check ==="
docker exec sendfable-postgres psql -U sendfable -d sendfable -v ON_ERROR_STOP=1 -c \
  "SELECT id, email, \"emailVerified\" IS NOT NULL AS verified, plan FROM \"User\" WHERE email IN ('$OLD_EMAIL','$NEW_EMAIL');"

EXISTS_NEW="$(docker exec sendfable-postgres psql -U sendfable -d sendfable -tAc \
  "SELECT count(*) FROM \"User\" WHERE email='$NEW_EMAIL';" | tr -d '[:space:]')"
EXISTS_OLD="$(docker exec sendfable-postgres psql -U sendfable -d sendfable -tAc \
  "SELECT count(*) FROM \"User\" WHERE email='$OLD_EMAIL';" | tr -d '[:space:]')"

if [[ "$EXISTS_NEW" == "1" && "$EXISTS_OLD" == "0" ]]; then
  echo "Already renamed to $NEW_EMAIL — skipping UPDATE"
  USER_ID="$(docker exec sendfable-postgres psql -U sendfable -d sendfable -tAc \
    "SELECT id FROM \"User\" WHERE email='$NEW_EMAIL';" | tr -d '[:space:]')"
else
  if [[ "$EXISTS_NEW" != "0" ]]; then
    echo "ERROR: $NEW_EMAIL already exists alongside other state — aborting"
    exit 1
  fi
  if [[ "$EXISTS_OLD" != "1" ]]; then
    echo "ERROR: expected exactly one user with $OLD_EMAIL, found '$EXISTS_OLD'"
    exit 1
  fi

  USER_ID="$(docker exec sendfable-postgres psql -U sendfable -d sendfable -tAc \
    "SELECT id FROM \"User\" WHERE email='$OLD_EMAIL';" | tr -d '[:space:]')"
  HASH_BEFORE="$(docker exec sendfable-postgres psql -U sendfable -d sendfable -tAc \
    "SELECT \"passwordHash\" FROM \"User\" WHERE id='$USER_ID';" | tr -d '[:space:]')"
  echo "user_id=$USER_ID"

  echo "=== UPDATE ==="
  docker exec -i sendfable-postgres psql -U sendfable -d sendfable -v ON_ERROR_STOP=1 <<SQL
BEGIN;
UPDATE "User"
SET email = '${NEW_EMAIL}',
    "emailVerified" = NOW(),
    "updatedAt" = NOW()
WHERE id = '${USER_ID}'
  AND email = '${OLD_EMAIL}';
DELETE FROM "Session" WHERE "userId" = '${USER_ID}';
DELETE FROM "VerificationToken" WHERE identifier IN ('${OLD_EMAIL}', '${NEW_EMAIL}');
COMMIT;
SELECT id, email, "emailVerified" IS NOT NULL AS verified FROM "User" WHERE id = '${USER_ID}';
SQL

  HASH_AFTER="$(docker exec sendfable-postgres psql -U sendfable -d sendfable -tAc \
    "SELECT \"passwordHash\" FROM \"User\" WHERE id='$USER_ID';" | tr -d '[:space:]')"
  if [[ "$HASH_BEFORE" != "$HASH_AFTER" ]]; then
    echo "ERROR: passwordHash changed unexpectedly"
    exit 1
  fi
  echo "passwordHash_preserved=true"
fi

# Ensure JWT invalidation if not already rotated in prior attempt — only rotate if old email still logged in risk
# Secret was already rotated once; skip second rotation unless NEXTAUTH_ROTATED flag missing
if [[ ! -f /root/sendfable-secrets/nextauth-rotated-for-email-rename ]]; then
  echo "=== Rotate NEXTAUTH_SECRET (app only) ==="
  NEW_SECRET="$(openssl rand -base64 32)"
  NEW_SECRET="$NEW_SECRET" python3 - <<'PY'
import os
from pathlib import Path
secret = os.environ["NEW_SECRET"]
p = Path("/opt/sendfable/.env")
lines = p.read_text().splitlines()
out, found = [], False
for line in lines:
    if line.startswith("NEXTAUTH_SECRET="):
        out.append(f"NEXTAUTH_SECRET={secret}")
        found = True
    else:
        out.append(line)
if not found:
    out.append(f"NEXTAUTH_SECRET={secret}")
p.write_text("\n".join(out) + "\n")
print("NEXTAUTH_SECRET rotated")
PY
  cd /opt/sendfable
  docker compose -p sendfable -f docker-compose.prod.yml up -d --no-deps --force-recreate app
  touch /root/sendfable-secrets/nextauth-rotated-for-email-rename
else
  echo "NEXTAUTH_SECRET already rotated for this rename — ensuring app healthy"
fi

echo "Waiting for app health..."
for i in $(seq 1 40); do
  if curl -sf http://127.0.0.1:3010/api/health >/dev/null; then
    echo "app_healthy try=$i"
    break
  fi
  sleep 3
done
curl -sf http://127.0.0.1:3010/api/health; echo

echo "=== Post-update ==="
docker exec sendfable-postgres psql -U sendfable -d sendfable -v ON_ERROR_STOP=1 -c \
  "SELECT u.id, u.email, u.\"emailVerified\" IS NOT NULL AS verified,
          m.role, w.id AS workspace_id, w.name AS workspace_name
   FROM \"User\" u
   JOIN \"Membership\" m ON m.\"userId\" = u.id
   JOIN \"Workspace\" w ON w.id = m.\"workspaceId\"
   WHERE u.id = '$USER_ID';"

docker exec sendfable-postgres psql -U sendfable -d sendfable -c \
  "SELECT count(*) AS old_email_users FROM \"User\" WHERE email='$OLD_EMAIL';
   SELECT count(*) AS new_email_users FROM \"User\" WHERE email='$NEW_EMAIL';"

if [[ -f /opt/sendfable/scripts/create-owner.ts ]]; then
  sed -i "s/chris@sendfable.com/chris@iscreamstudio.com/g" /opt/sendfable/scripts/create-owner.ts || true
fi

echo "RENAME_DB_OK"
