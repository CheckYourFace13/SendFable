# Coordination: TheDrinkPlace newsletter automation

## Competing session
- Cursor SendFable agent transcript: [Scribe/newsletter conflict](3b5cfd71-6f0b-4173-b526-9c3f99ef4cc9)
- Observed wipe paths: `/tmp/sf-auth-deploy.sh` (pkills `deploy-production`, pins wipe tip), inverted `deploy-production.sh` that refuses when newsletter is present, `_tmp-authoritative-deploy.sh`, `_tmp-scribe-safety-rebuild.sh`.

## Rules
1. Production deploy: **only** `/opt/sendfable/scripts/deploy-production.sh` (exclusive flock + `require-tdp-newsletter-sources.sh`). Newsletter sources **must** be present.
2. Do **not** `pkill` other `deploy-production.sh` / docker compose sendfable builds.
3. Do not pin wipe SHAs or reset to a tree without `src/lib/newsletter`.
4. Signup Tool / referral / Scribe marketing fixes must land **with** newsletter kept.
5. Owner welcome QA may clear the ledger key only with `--confirm-owner-qa`. Do not wire `clearWelcomeLedgerOnUnsubscribe` just to re-welcome.

## Preserve
- Unrelated Scribe public corrections, referral signup, embed attribution.
- Other apps on the VPS (rentalnoodle, gravyblock, etc.).
