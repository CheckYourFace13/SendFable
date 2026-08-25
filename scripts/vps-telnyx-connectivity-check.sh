#!/usr/bin/env bash
# Read-only Telnyx connectivity check on VPS. Never prints secrets.
set -euo pipefail
cd /opt/sendfable
set -a
# shellcheck disable=SC1091
source .env
set +a

redact() { sed -E 's/Bearer [^ ]+/Bearer [redacted]/g; s/KEY[A-Za-z0-9_]{8,}/[redacted]/g'; }

fail() { echo "ERROR: $1"; exit 1; }

[[ -n "${TELNYX_API_KEY:-}" ]] || fail "TELNYX_API_KEY missing"
[[ -n "${TELNYX_PUBLIC_KEY:-}" ]] || fail "TELNYX_PUBLIC_KEY missing"
[[ -n "${TELNYX_MESSAGING_PROFILE_ID:-}" ]] || fail "TELNYX_MESSAGING_PROFILE_ID missing"

# Public key loadable (python3 available on Ubuntu)
python3 - <<'PY' || fail "TELNYX_PUBLIC_KEY not loadable as Ed25519/SPKI"
import os, base64, sys
raw = base64.b64decode(os.environ["TELNYX_PUBLIC_KEY"].strip())
# 32-byte raw Ed25519 or SPKI DER both accepted by app; just ensure decodes
if len(raw) < 16:
    sys.exit(1)
print("PUBLIC KEY LOADABLE: PASS")
PY

PROFILE_URL="https://api.telnyx.com/v2/messaging_profiles/${TELNYX_MESSAGING_PROFILE_ID}"
NUMBERS_URL="https://api.telnyx.com/v2/messaging_profiles/${TELNYX_MESSAGING_PROFILE_ID}/phone_numbers?page%5Bsize%5D=1"

HTTP_CODE=$(curl -sS -o /tmp/sf_telnyx_profile.json -w '%{http_code}' \
  -H "Authorization: Bearer ${TELNYX_API_KEY}" \
  -H "Accept: application/json" \
  "$PROFILE_URL")

if [[ "$HTTP_CODE" == "401" || "$HTTP_CODE" == "403" ]]; then
  echo "TELNYX API AUTH: FAIL"
  exit 1
fi
if [[ "$HTTP_CODE" == "404" ]]; then
  echo "TELNYX API AUTH: PASS"
  echo "MESSAGING PROFILE FOUND: FAIL"
  exit 1
fi
if [[ "$HTTP_CODE" != "200" ]]; then
  echo "TELNYX API AUTH: FAIL"
  echo "HTTP $HTTP_CODE (body redacted)"
  redact < /tmp/sf_telnyx_profile.json | head -c 200; echo
  exit 1
fi

echo "TELNYX API AUTH: PASS"
echo "MESSAGING PROFILE FOUND: PASS"

python3 - <<'PY'
import json
d=json.load(open("/tmp/sf_telnyx_profile.json"))["data"]
name=d.get("name")
enabled=bool(d.get("enabled"))
dest=d.get("whitelisted_destinations") or []
print(f"PROFILE NAME: {name}")
print(f"PROFILE ACTIVE: {'YES' if enabled else 'NO'}")
print(f"WHITELISTED_DESTINATIONS: {json.dumps(dest)}")
us_only = dest == ["US"]
print(f"US-ONLY DESTINATIONS: {'YES' if us_only else 'NO'}")
open("/tmp/sf_telnyx_ok","w").write("1" if (name=="SendFable Production" and enabled and us_only) else "0")
PY

NUM_CODE=$(curl -sS -o /tmp/sf_telnyx_numbers.json -w '%{http_code}' \
  -H "Authorization: Bearer ${TELNYX_API_KEY}" \
  -H "Accept: application/json" \
  "$NUMBERS_URL")

if [[ "$NUM_CODE" != "200" ]]; then
  echo "ASSIGNED NUMBERS: UNKNOWN (HTTP $NUM_CODE)"
  exit 1
fi

python3 - <<'PY'
import json
j=json.load(open("/tmp/sf_telnyx_numbers.json"))
meta=j.get("meta") or {}
n=meta.get("total_results")
if n is None:
  n=len(j.get("data") or [])
print(f"ASSIGNED NUMBERS: {n}")
open("/tmp/sf_telnyx_num","w").write(str(n))
PY

# Flag checks from .env (presence only; defaults if unset)
python3 - <<'PY'
import os
flags=[
"SENDFABLE_SMS_PUBLIC_ENABLED",
"SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED",
"SENDFABLE_SMS_BILLING_ENABLED",
"SENDFABLE_SMS_ACTIVATION_PURCHASE_ENABLED",
"SENDFABLE_SMS_REGISTRATION_ENABLED",
"SENDFABLE_SMS_NUMBER_PURCHASE_ENABLED",
"SENDFABLE_SMS_LIVE_SENDING_ENABLED",
"SENDFABLE_SMS_INBOUND_ENABLED",
"SENDFABLE_SMS_REPLY_ENABLED",
]
def on(v):
  return str(v or "").strip().lower() in ("true","1","yes")
bad=[f for f in flags if on(os.environ.get(f))]
mock=on(os.environ.get("SENDFABLE_SMS_MOCK_PROVIDER_ENABLED","true"))
print("PUBLIC/LIVE SMS FLAGS: " + ("all false" if not bad else "UNEXPECTED ON: "+",".join(bad)))
print(f"MOCK PROVIDER: {'enabled' if mock else 'DISABLED'}")
open("/tmp/sf_telnyx_flags","w").write("1" if (not bad and mock) else "0")
PY

rm -f /tmp/sf_telnyx_profile.json /tmp/sf_telnyx_numbers.json
PROFILE_OK=$(cat /tmp/sf_telnyx_ok)
NUM=$(cat /tmp/sf_telnyx_num)
FLAGS_OK=$(cat /tmp/sf_telnyx_flags)
rm -f /tmp/sf_telnyx_ok /tmp/sf_telnyx_num /tmp/sf_telnyx_flags

if [[ "$PROFILE_OK" == "1" && "$NUM" == "0" && "$FLAGS_OK" == "1" ]]; then
  echo "OVERALL: PASS"
  exit 0
fi
echo "OVERALL: FAIL"
exit 1
