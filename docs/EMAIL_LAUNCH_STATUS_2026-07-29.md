# Production launch status — 2026-07-29

## Overall verdict (pre-deploy)

**GO for controlled SES testing and email launch activation**, pending successful controlled-send evidence and deploy smoke tests in this session.

Supersedes `docs/PRE_APPROVAL_READINESS_2026-07-26.md` on SES pending status.

## AWS SES

See `docs/SES_PRODUCTION_APPROVAL_2026-07-29.md`.

- Case `178491867800933` **APPROVED** 2026-07-29
- Region `us-east-1`, quota **50,000**/day, rate **14**/sec
- Live API: `ProductionAccessEnabled=true`, `GRANTED`, `HEALTHY`
- App launch rate ceiling: **5 msg/s** (`PLATFORM_SEND_RATE_PER_SEC`)

## SMS branch decision

**DEFERRED — do not merge `feature/sms-product` into this email launch.**

Reasons verified 2026-07-29:

1. Production git HEAD had been advanced to `a1e1d54` (SMS), but the **running Docker image** still uses a Prisma client **without** SMS models — SMS migration `20260726160000_sms_product` is **not** applied.
2. Applying the SMS migration (nullable `Contact.email`, new SMS tables) during the same window as first public email sending adds avoidable risk.
3. SMS public/live flags default off, but email launch priority requires the cleanest possible production schema.

`feature/sms-product` remains intact for a **post-email-launch** merge with explicit migration + rebuild + flag audit.

## Launch flags (target after verification)

```
EARLY_LAUNCH=false
ALLOW_PUBLIC_SIGNUP=true
STRIPE_BILLING_ENABLED=true
STRIPE_OWNER_TEST_ENABLED=false
CAMPAIGN_SEND_ENABLED=true
SES_CONTROLLED_TEST_ENABLED=false
PLATFORM_SEND_RATE_PER_SEC=5
```

SMS: leave all `SENDFABLE_SMS_*` unset or false (no SMS env keys required on this branch).

## Audit snapshot (2026-07-29)

| Item | Value |
|---|---|
| Local launch branch | `launch/email-production-2026-07-29` (from `main` @ `13931de`) |
| `origin/main` | `13931de` |
| `feature/sms-product` | `a1e1d54` (deferred) |
| Production services | app/worker/postgres/redis healthy |
| Production migrations applied | through `20260725180000_plan_pro_plus` only |
| Backups | local + off-host success markers `2026-07-29 03:15` |
| SNS | 1 confirmed subscription on `sendfable-ses-events` |
| Public SMS pricing | absent |
| `/signup` while locked | redirects to `/early-access` (307) |
