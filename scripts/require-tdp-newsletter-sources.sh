#!/usr/bin/env sh
# Canonical source check for TheDrinkPlace newsletter automation.
set -eu

fail() {
  echo "CANONICAL_SOURCE_FAIL: $*" >&2
  exit 3
}

test -f scripts/assert-tdp-newsletter.sh || fail "missing scripts/assert-tdp-newsletter.sh"
test -f src/lib/newsletter/welcome-html.ts || fail "missing welcome-html.ts"
test -f src/lib/newsletter/tdp-weekly.ts || fail "missing tdp-weekly.ts"
test -f src/lib/newsletter/auto-welcome.ts || fail "missing auto-welcome.ts"
test -f src/lib/newsletter/auto-weekly.ts || fail "missing auto-weekly.ts"
test -f src/lib/newsletter/ledger.ts || fail "missing ledger.ts"
test -f src/lib/newsletter/process.ts || fail "missing process.ts"

grep -q 'Explore drinks' src/lib/newsletter/welcome-html.ts || fail "welcome-html missing Explore drinks CTA"
! grep -q 'Chicago drink guide' src/lib/newsletter/welcome-html.ts || fail "welcome-html has Chicago default"
grep -q 'welcomeIdempotencyKey' src/lib/newsletter/ledger.ts || fail "ledger missing welcomeIdempotencyKey"
grep -q 'maybeEnqueueAutoWelcome' src/lib/forms/accept.ts || fail "accept.ts not wired to auto-welcome"
grep -q 'enqueueAutopilotAutoSend' src/lib/autopilot/tick.ts || fail "tick.ts not wired to auto-weekly"
grep -q 'processDueAutomationSends' src/worker/index.ts || fail "worker not processing automation ledger"
grep -q 'autoSendEnabled' prisma/schema.prisma || fail "schema missing autoSendEnabled"
grep -q 'autoWelcomeEnabled' prisma/schema.prisma || fail "schema missing autoWelcomeEnabled"
grep -q 'buildTheDrinkPlaceWeeklyEdition' src/lib/autopilot/tick.ts || fail "tick missing TDP weekly builder"

HEAD="$(git rev-parse HEAD 2>/dev/null || true)"
case "$HEAD" in
  1a48ede682ee00c0dfaa64a5afd4a76bc8e94ac8|\
  bcb8d19aa6b066c6555c74652351b82c4a086891|\
  2fa821b442de361c81b138f7140ed021443cdbf1|\
  718ec0641c945d21faa4a8f47a7605b277e73bbe|\
  5a908c8dc9074b08114620255df175041848b9c4|\
  b202e32544cb2b4b87a145158153f184440b056f|\
  10fdacd47ab64233ac5361cdebe18ca5d47b9fd6|\
  5a7db0dc8548a597f5ad255ee86473b2e3997de3|\
  1b8b5475a7d9986392a16c88515e35097e110d0c|\
  cdfc6ff19127abf99ac0a279184bb6bf19dc9ac8|\
  e041a49e8c803847f88b20b0b9ba023d87c09257|\
  a34e8a90905a91f82ba53a74937a23a22b1cf281|
  22ad27c73bc3b54f9a271233bc6acf2be486bccf)
    fail "HEAD $HEAD is a known newsletter-wipe revision"
    ;;
esac

if grep -q 'REFUSING_DEPLOY: newsletter auto-send files are present' scripts/deploy-production.sh 2>/dev/null; then
  fail "deploy-production.sh is an inverted wipe deploy"
fi

if grep -R --include='*.ts' --include='*.tsx' -l 'clearWelcomeLedgerOnUnsubscribe' src 2>/dev/null \
  | grep -v 'src/lib/newsletter/ledger.ts' | grep -q .; then
  fail "clearWelcomeLedgerOnUnsubscribe is wired outside ledger.ts"
fi

sh scripts/assert-tdp-newsletter.sh
echo "require-tdp-newsletter-sources: OK"
