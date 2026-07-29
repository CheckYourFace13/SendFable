# Final launch activation checklist

**Updated 2026-07-29:** SES production access is **APPROVED** (case `178491867800933`).
See `docs/SES_PRODUCTION_APPROVAL_2026-07-29.md` and `docs/EMAIL_LAUNCH_STATUS_2026-07-29.md`.

Ordered sequence for **public** email launch. Execute after controlled SES production-send evidence.

SMS remains dark — do **not** set any `SENDFABLE_SMS_*` live/public/billing flags.

## Exact launch flag changes

```
EARLY_LAUNCH=false
ALLOW_PUBLIC_SIGNUP=true
STRIPE_BILLING_ENABLED=true
STRIPE_OWNER_TEST_ENABLED=false
CAMPAIGN_SEND_ENABLED=true
SES_CONTROLLED_TEST_ENABLED=false
PLATFORM_SEND_RATE_PER_SEC=5
```

## Ordered activation sequence

1. Create rollback point (git tag + note of `/opt/sendfable` HEAD + `.env` flag snapshot — no secrets in git).
2. Confirm backups current (local `last-success` + off-host `last-offhost-success` within SLA).
3. Confirm SES healthy (production access, sending enabled, HEALTHY, DKIM/MAIL FROM SUCCESS, SNS confirmed).
4. Confirm Stripe healthy (live keys, webhook endpoint, products/prices, Portal, **0** active test subscriptions).
5. Confirm pricing + legal pages match catalog and policy bundle.
6. Confirm public identity is SendFable only (legal operator text allowed on legal pages).
7. Remove early-access wording from marketing surfaces.
8. Replace early-access CTAs with signup / pricing CTAs.
9. Enable public signup (`ALLOW_PUBLIC_SIGNUP=true`, `EARLY_LAUNCH=false`).
10. Enable public billing (`STRIPE_BILLING_ENABLED=true`, `STRIPE_OWNER_TEST_ENABLED=false`).
11. Enable campaign sending (`CAMPAIGN_SEND_ENABLED=true`; keep `SES_CONTROLLED_TEST_ENABLED=false`).
12. Keep emergency kill switches documented and reachable (`docs/STRIPE_ROLLBACK.md`, `docs/INCIDENT_RUNBOOK.md`).
13. Deploy app + worker (`git pull` + compose rebuild **sendfable only**).
14. Anonymous smoke: home, pricing, signup, login, legal pages, health.
15. Authenticated smoke: dashboard, contacts, campaign draft, billing page, portal link.
16. One Free signup (real allowlisted test mailbox).
17. One paid Checkout **start** without completing payment; abandon/cancel session.
18. Verify no accidental public send (flags, worker, no unexpected SES volume spike).
19. Verify monitoring cron + alert path.
20. Verify other VPS sites still healthy (nginx + existing stacks untouched).
21. Commit launch wording/flag-doc changes (never commit secrets).
22. Produce rollback commands (below).

## Rollback commands (prepared)

```bash
# Flags — set back to locked early-launch posture in /opt/sendfable/.env then recreate app+worker only:
# EARLY_LAUNCH=true
# ALLOW_PUBLIC_SIGNUP=false
# STRIPE_BILLING_ENABLED=false
# STRIPE_OWNER_TEST_ENABLED=true
# CAMPAIGN_SEND_ENABLED=false
# SES_CONTROLLED_TEST_ENABLED=false
cd /opt/sendfable
docker compose -p sendfable -f docker-compose.prod.yml up -d app worker
curl -sf http://127.0.0.1:3010/api/health

# Optional code rollback (example):
# git revert <launch-commit> --no-edit
# docker compose -p sendfable -f docker-compose.prod.yml up -d --build app worker
```

Do **not** modify other Compose projects or Nginx sites for unrelated apps during rollback.
