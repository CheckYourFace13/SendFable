# Production launch status — 2026-07-29

## Overall verdict

**GO — public email launch activated** `2026-07-29T15:09:41Z`.

See `docs/EMAIL_LAUNCH_GO_NOGO_2026-07-29.md` for the full report.

Supersedes `docs/PRE_APPROVAL_READINESS_2026-07-26.md` on SES pending status.

## AWS SES

See `docs/SES_PRODUCTION_APPROVAL_2026-07-29.md`.

- Case `178491867800933` **APPROVED** 2026-07-29
- Region `us-east-1`, quota **50,000**/day, rate **14**/sec
- Live API: `ProductionAccessEnabled=true`, `GRANTED`, `HEALTHY`
- App launch rate ceiling: **5 msg/s** (`PLATFORM_SEND_RATE_PER_SEC`)

## SMS branch decision

**DEFERRED — do not merge `feature/sms-product` into this email launch.**

`feature/sms-product` remains intact for a **post-email-launch** merge with explicit migration + rebuild + flag audit.

## Launch flags (LIVE)

```
EARLY_LAUNCH=false
ALLOW_PUBLIC_SIGNUP=true
STRIPE_BILLING_ENABLED=true
STRIPE_OWNER_TEST_ENABLED=false
CAMPAIGN_SEND_ENABLED=true
SES_CONTROLLED_TEST_ENABLED=false
PLATFORM_SEND_RATE_PER_SEC=5
```

SMS: no `SENDFABLE_SMS_*` keys on production.

## Audit snapshot (2026-07-29)

| Item | Value |
|---|---|
| Launch branch | `launch/email-production-2026-07-29` |
| Production / `main` commit | `e23ec72` |
| `feature/sms-product` | `a1e1d54` (deferred) |
| Production services | app/worker/postgres/redis healthy |
| Production migrations applied | through `20260725180000_plan_pro_plus` only |
| Backups | local + off-host success markers `2026-07-29` |
| SNS | confirmed; bounce/complaint → GlobalSuppression proven |
| Public SMS | absent (404) |
| `/signup` | HTTP 200 (public) |
