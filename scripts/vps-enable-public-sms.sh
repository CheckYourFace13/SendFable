#!/bin/bash
# Enable the public SMS flag ladder. Does not touch unrelated env keys.
set -euo pipefail
cd /opt/sendfable
cp -a .env ".env.bak-sms-public-$(date -u +%Y%m%dT%H%M%SZ)"
python3 - <<'PY'
from pathlib import Path
p = Path("/opt/sendfable/.env")
text = p.read_text()
lines = text.splitlines()
order = [
    "SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED",
    "SENDFABLE_SMS_BILLING_ENABLED",
    "SENDFABLE_SMS_ACTIVATION_PURCHASE_ENABLED",
    "SENDFABLE_SMS_REGISTRATION_ENABLED",
    "SENDFABLE_SMS_NUMBER_PURCHASE_ENABLED",
    "SENDFABLE_SMS_LIVE_SENDING_ENABLED",
    "SENDFABLE_SMS_INBOUND_ENABLED",
    "SENDFABLE_SMS_REPLY_ENABLED",
    "SENDFABLE_SMS_MOCK_PROVIDER_ENABLED",
    "SENDFABLE_SMS_PUBLIC_ENABLED",
]
values = {k: "true" for k in order}
values["SENDFABLE_SMS_MOCK_PROVIDER_ENABLED"] = "false"
seen = set()
out = []
for line in lines:
    if not line or line.lstrip().startswith("#") or "=" not in line:
        out.append(line)
        continue
    key = line.split("=", 1)[0]
    if key in values:
        if key in seen:
            continue
        seen.add(key)
        out.append(f"{key}={values[key]}")
        continue
    out.append(line)
missing = [k for k in order if k not in seen]
if missing:
    out.append("")
    out.append("# Public SMS flag ladder")
    for k in missing:
        out.append(f"{k}={values[k]}")
p.write_text("\n".join(out) + "\n")
print("WROTE", len(missing), "new keys")
for k in order:
    print(f"{k}={values[k]}")
PY
# PUBLIC must be last in the file among the ladder so a partial read still sees it after the others.
grep -E '^SENDFABLE_SMS_(PUBLIC|ACCOUNT_SIGNUP|BILLING|ACTIVATION|REGISTRATION|NUMBER_PURCHASE|LIVE_SENDING|INBOUND|REPLY|MOCK)_' .env
echo "TEXT20=$(grep -c '^SENDFABLE_PROMO_TEXT20_PUBLIC=true' .env || true)"
