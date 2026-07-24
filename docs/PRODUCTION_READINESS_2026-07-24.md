# Production readiness report — 2026-07-24 (post-fix pass)

Follow-up to `PRODUCTION_LAUNCH_AUDIT_2026-07-24.md` (NO-GO earlier that day).
This pass fixed the non-AWS blockers and re-verified them against the deployed
production stack. Launch flags stayed locked throughout.

## Verdict

**CONDITIONAL GO** — all verified non-AWS launch gates passed; public launch
remains blocked only by Amazon SES production approval (current request
**DENIED**, case 178491867800933 — see `SES_PRODUCTION_ACCESS_FINAL.md`) and
the final controlled production-send test, plus the owner items listed below.

## Launch flags (unchanged before/after)

```
EARLY_LAUNCH=true
ALLOW_PUBLIC_SIGNUP=false
STRIPE_BILLING_ENABLED=false
STRIPE_OWNER_TEST_ENABLED=true
CAMPAIGN_SEND_ENABLED=false
SES_CONTROLLED_TEST_ENABLED=false
```

## AWS SES status (checked 2026-07-24, live API)

| Field | Value |
|---|---|
| Account / region | 911167908678 / us-east-1 |
| ProductionAccessEnabled | **false** |
| ReviewDetails.Status | **DENIED** (case 178491867800933) |
| SendingEnabled / Enforcement | true / HEALTHY |
| Quota | 200/24 h, 1 msg/s, 2 sent last 24 h |
| Suppression | BOUNCE + COMPLAINT |
| Identity | send.sendfable.com verified; DKIM SUCCESS; MAIL FROM bounce.send.sendfable.com SUCCESS |
| Config set events | BOUNCE, COMPLAINT, DELIVERY, REJECT, RENDERING_FAILURE, DELIVERY_DELAY → SNS sendfable-ses-events (extended this pass) |

Phase 12 (controlled production send) was **not run** — requires production access.

## Fixed and verified this pass

| Item | Evidence |
|---|---|
| Login-callback open redirect | `src/lib/safe-redirect.ts` used in login page + Auth.js `redirect` callback; 11 unit tests incl. encoded/double-encoded/backslash/scheme cases |
| Tracked-link click safety | `src/lib/click-redirect.ts` re-validates at click time; unsafe → branded `/link-unavailable` (noindex); 8 unit tests |
| Real 404 | Live: `/zzz-does-not-exist` → HTTP 404, branded, `noindex`; `/api/zzz` → 404; app paths still login-redirect with encoded callback |
| Auth/proxy | Nginx overwrites Host/X-Forwarded-*; only sendfable server_names reach the upstream; cookies `__Host-`/`__Secure-`, HttpOnly, Secure, SameSite=Lax (verified live) |
| Security headers | HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy served (added to Nginx; CSP deferred) |
| Authorization contract | `api-authz-contract.test.ts` — every API route authenticates or is explicitly public-by-design (caught and classified `identities/verify`) |
| Import suppression gap | `resolveImportStatus`: suppressed emails can no longer import as SUBSCRIBED; 9 unit tests incl. cross-workspace/global reasons |
| Auth recovery policy | Hybrid password + magic-link; magic link is the recovery path (`docs/AUTH_POLICY.md`); login copy updated |
| Backups | Daily 03:15 cron, gzip+sha256 integrity, 14/60/365-day tiers, root-only perms, SES failure alerts. First real backup 2026-07-24 20:39 (12,510 B) |
| Restore drill | Isolated `sendfable_restore_drill` DB: 28/28 tables, all key row counts matched (User incl. Stripe fields, Workspace, Contact, Campaign, WebhookEvent, suppressions), queryable, dropped after |
| Monitoring | 5-min cron: app health, 4 containers, nginx, disk, TLS expiry, backup freshness, queue failed/backlog, stuck/late campaigns; de-duplicated SES owner alerts — alert delivery proven live (3 real alert emails received during setup) |
| Support channel | `/contact` DB-backed form live-tested (message stored); topics incl. abuse, privacy, security, billing |
| Legal | `/acceptable-use`, `/refund-policy` new; Terms + Privacy expanded (cookies, data requests, liability, IP, eligibility, changes); signup now shows Terms/AUP/Privacy agreement; all marked as needing legal review (`docs/LEGAL_STATUS.md`) |
| SEO | New pages in sitemap; robots.txt correct; 404 + `/link-unavailable` noindex |
| Analytics | Decision documented: none at launch; disabled first-party interface (`docs/ANALYTICS_DECISION.md`) |
| Docs | `KNOWN_LIMITATIONS.md` dated update; SES denial documented with appeal guidance |

Tests: **141 passing** (`npm test`), typecheck clean, production build clean.

## Still open (owner input required)

1. **AWS SES production access** — appeal the denial (case 178491867800933).
2. **Support mailbox** — `sendfable.com` has no MX; no `support@`/`legal@`
   mailbox can receive mail. Add email routing/hosting, then set Stripe
   Dashboard → Business details → support email + support URL
   (`https://sendfable.com/contact`). The API cannot set these on own account.
3. **Qualified legal review** of Terms/Privacy/AUP/Refund policy.
4. **Off-host backup copies** — backups currently live on the VPS only.
5. **Cross-role live E2E** — deferred until a second real user/workspace exists
   (static contract tests in place).
6. Early-access wording inventory (Phase 13) collected — replacements to be
   proposed at flag-flip time; wording intentionally kept while gates are locked.

## Data/objects created during this pass

- 2 daily backup files + checksums on the VPS (root-only).
- 1 `SupportMessage` row (form verification, from owner email; safe to resolve).
- 3 SES ops-alert emails to the owner (alert-channel verification).
- SES config-set event destination extended (REJECT/RENDERING_FAILURE/DELIVERY_DELAY added).
- Stripe: **no** objects, charges, or profile changes (support-URL update was
  attempted, rejected by API for own-account, left for Dashboard).
- RentalNoodle, GravyBlock, other VPS sites: untouched (verified 200 after nginx reload).

## Rollback

- Code: `git revert e251e05` (+ the docs commit), redeploy per `PRODUCTION_DEPLOYMENT.md`.
- DB: migration `20260724000000_support_message` is additive (one new table).
- Nginx: header block removal or restore `/root/nginx-backups/sendfable.<ts>.bak`, `nginx -t && systemctl reload nginx`.
- Cron: `crontab -e` — remove the two sendfable lines.
