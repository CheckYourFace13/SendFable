#!/usr/bin/env bash
set -euo pipefail

EMAIL="chris@iscreamstudio.com"
PASSWORD="$(cat /root/sendfable-secrets/owner-password.txt)"
JAR="$(mktemp)"
OUT="/tmp/live-audit-results.txt"
: > "$OUT"

log() { echo "$1" | tee -a "$OUT"; }

check_public() {
  local path="$1"
  local code
  code="$(curl -sS -o /tmp/body.html -w '%{http_code}' --max-time 25 "https://sendfable.com${path}")"
  local title bytes flags
  title="$(python3 -c "import re; html=open('/tmp/body.html','rb').read().decode('utf-8','ignore'); m=re.search(r'<title[^>]*>(.*?)</title>', html, re.I|re.S); print((m.group(1).strip() if m else '')[:120])")"
  bytes="$(wc -c </tmp/body.html | tr -d ' ')"
  flags=""
  grep -qiE 'lorem ipsum|TODO|coming soon|\$XX' /tmp/body.html && flags="${flags}PLACEHOLDER "
  log "PUBLIC ${code} ${bytes}b ${path} :: ${title} :: ${flags}"
}

login() {
  local csrf
  csrf="$(curl -sS -c "$JAR" -b "$JAR" https://sendfable.com/api/auth/csrf | python3 -c 'import sys,json; print(json.load(sys.stdin)["csrfToken"])')"
  curl -sS -o /dev/null -c "$JAR" -b "$JAR" \
    -X POST 'https://sendfable.com/api/auth/callback/credentials' \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "csrfToken=$csrf" \
    --data-urlencode "email=$EMAIL" \
    --data-urlencode "password=$PASSWORD" \
    --data-urlencode 'callbackUrl=https://sendfable.com/dashboard' \
    --data-urlencode 'json=true'
  log "SESSION $(curl -sS -b "$JAR" https://sendfable.com/api/auth/session)"
}

check_auth() {
  local path="$1"
  local code loc title bytes
  code="$(curl -sS -o /tmp/abody.html -D /tmp/ahdr.txt -w '%{http_code}' --max-time 25 -b "$JAR" "https://sendfable.com${path}")"
  loc="$(grep -i '^location:' /tmp/ahdr.txt | tr -d '\r' | awk '{print $2}' | head -1)"
  title="$(python3 -c "import re; html=open('/tmp/abody.html','rb').read().decode('utf-8','ignore'); m=re.search(r'<title[^>]*>(.*?)</title>', html, re.I|re.S); print((m.group(1).strip() if m else '')[:120])")"
  bytes="$(wc -c </tmp/abody.html | tr -d ' ')"
  log "AUTH ${code} ${bytes}b ${path} loc=${loc:-none} :: ${title}"
}

log "=== PUBLIC ==="
for p in \
  / /pricing /features /templates /deliverability /migrate \
  /compare/mailchimp /compare/constant-contact /compare/brevo /compare/mailerlite /compare/kit /compare/beehiiv \
  /solutions/restaurants /solutions/breweries /solutions/real-estate /solutions/retail /solutions/nonprofits /solutions/local-events \
  /solutions/contractors /solutions/professional-services /solutions/salons \
  /login /signup /early-access /alternatives/mailchimp /vs/mailchimp \
  /resources /email-marketing-guide /cheap-email-marketing /email-marketing-without-gmail \
  /security /status /integrations /changelog /privacy /terms \
  /robots.txt /sitemap.xml /manifest.webmanifest /icon.svg /apple-icon.png /favicon.ico \
  /this-route-should-404
 do
  check_public "$p" || log "PUBLIC ERR $p"
done

log "=== AUTH ==="
login
for p in \
  /dashboard /onboarding /contacts /contacts/import /contacts/migrate \
  /tags /segments /forms /library /campaigns /campaigns/new \
  /settings /settings/senders /settings/ses /billing /brand \
  /api/health /api/billing/status /api/admin/ses-readiness
 do
  check_auth "$p" || log "AUTH ERR $p"
done

log "=== DATA ==="
docker exec sendfable-postgres psql -U sendfable -d sendfable -Atc \
  "SELECT 'users='||count(*) FROM \"User\";
   SELECT 'workspaces='||count(*) FROM \"Workspace\";
   SELECT 'contacts='||count(*) FROM \"Contact\";
   SELECT 'campaigns='||count(*) FROM \"Campaign\";
   SELECT 'templates='||count(*) FROM \"Template\";
   SELECT 'forms='||count(*) FROM \"Form\";" | tee -a "$OUT"

CONTACT_ID="$(docker exec sendfable-postgres psql -U sendfable -d sendfable -tAc "SELECT id FROM \"Contact\" LIMIT 1" | tr -d '[:space:]')"
CAMPAIGN_ID="$(docker exec sendfable-postgres psql -U sendfable -d sendfable -tAc "SELECT id FROM \"Campaign\" LIMIT 1" | tr -d '[:space:]')"
FORM_ID="$(docker exec sendfable-postgres psql -U sendfable -d sendfable -tAc "SELECT id FROM \"Form\" LIMIT 1" | tr -d '[:space:]')"
SEGMENT_ID="$(docker exec sendfable-postgres psql -U sendfable -d sendfable -tAc "SELECT id FROM \"Segment\" LIMIT 1" | tr -d '[:space:]')"

[[ -n "$CONTACT_ID" ]] && check_auth "/contacts/${CONTACT_ID}" || log "AUTH SKIP /contacts/[id]"
[[ -n "$CAMPAIGN_ID" ]] && check_auth "/campaigns/${CAMPAIGN_ID}" && check_auth "/campaigns/${CAMPAIGN_ID}/report" || log "AUTH SKIP /campaigns/[id]"
[[ -n "$FORM_ID" ]] && check_auth "/forms/${FORM_ID}" || log "AUTH SKIP /forms/[id]"
[[ -n "$SEGMENT_ID" ]] && check_auth "/segments/${SEGMENT_ID}" || log "AUTH SKIP /segments/[id]"

log "=== META HOMEPAGE ==="
curl -sS https://sendfable.com/ | python3 -c "
import sys,re
html=sys.stdin.read()
for pat in ['og:title','og:description','og:image','twitter:card','application/ld+json','rel=\"canonical\"']:
    print(pat, 'YES' if re.search(re.escape(pat) if pat!='application/ld+json' else pat, html, re.I) else 'NO')
" | tee -a "$OUT"

log "AUDIT_RAW_DONE"
