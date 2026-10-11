# Coordination: TheDrinkPlace newsletter automation

## Competing session
- Cursor SendFable agent transcript: [Scribe/newsletter conflict](3b5cfd71-6f0b-4173-b526-9c3f99ef4cc9)
- Local wipe helpers (now blocked stubs): `_tmp-authoritative-deploy.sh` (pinned wipe SHA `5a908c8`), `_tmp-commit-removal.sh`, `_tmp-push-removal.sh`

## Rules
1. Production deploy: `scripts/deploy-production.sh` only (exclusive flock + `require-tdp-newsletter-sources.sh`).
2. Do not pin or `git reset --hard` to wipe SHAs: `1a48ede`, `bcb8d19`, `2fa821b`, `718ec06`, `5a908c8`.
3. Scribe marketing/SMS/legal fixes are welcome; remove newsletter modules only via an explicit coordinated decision with TheDrinkPlace ops.
4. Owner welcome QA may clear the ledger key once per controlled run (`tdp-global-nl-qa.ts --confirm-owner-qa`). Ordinary form retries must not.

## Preserve
- Unrelated Scribe public corrections (marketing pages, embed attribution, SMS flags).
- Other apps on the VPS (rentalnoodle, gravyblock, etc.).
