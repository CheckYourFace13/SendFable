# SMS production GO / NO-GO — 2026-07-29

## Branch

`launch/sms-production-prep-2026-07-29` — merges `a1e1d54` (`feature/sms-product`) onto post-email-launch `main` (`ca7cb6c`+).

## Automated results

| Check | Result |
|---|---|
| Merge | Success (no conflicts) |
| `npm test` | **255 pass** |
| `npm run typecheck` | PASS |
| `npx prisma validate` | PASS |
| `npm run build` | PASS |
| SMS public pricing gated | PASS (`SmsPricingSection` returns null when `SENDFABLE_SMS_PUBLIC_ENABLED=false`) |
| Email audience filters `email: { not: null }` | PASS |
| Stripe SMS dry-run plan | PASS (idempotent lookup keys documented) |
| Stripe SMS **test** catalog write | **BLOCKED** — no `sk_test_` key available in this environment (prod is live-only) |
| Stripe SMS **live** catalog write | **NOT RUN** — requires owner authorization |
| Telnyx credentials | Not present on production `.env` (names absent) |
| Dark backend deploy | Pending commit merge + migration apply |

## Feature flags (defaults — keep for dark deploy)

All customer/live flags **false** except code/admin/mock defaults:

- `SENDFABLE_SMS_PUBLIC_ENABLED=false`
- `SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED=false`
- `SENDFABLE_SMS_BILLING_ENABLED=false`
- `SENDFABLE_SMS_ACTIVATION_PURCHASE_ENABLED=false`
- `SENDFABLE_SMS_REGISTRATION_ENABLED=false`
- `SENDFABLE_SMS_NUMBER_PURCHASE_ENABLED=false`
- `SENDFABLE_SMS_LIVE_SENDING_ENABLED=false`
- `SENDFABLE_SMS_INBOUND_ENABLED=false`
- `SENDFABLE_SMS_REPLY_ENABLED=false`
- Mock provider default **true**

## Counts (this session)

| Metric | Count |
|---|---|
| Telnyx API calls | **0** |
| SMS messages sent | **0** |
| Incoming SMS received | **0** |
| Phone numbers purchased | **0** |
| Registrations submitted | **0** |
| Live SMS Stripe products created | **0** |

## GO / NO-GO matrix

| Gate | Verdict |
|---|---|
| 1. Email general availability | **GO** |
| 2. SMS dark backend deployment | **CONDITIONAL GO** — after merge to main + backup + migration |
| 3. Stripe SMS test-mode completion | **NO-GO** until owner provides / authorizes `sk_test_` run |
| 4. Telnyx registration | **NO-GO** — needs account + paid auth |
| 5. Number purchase | **NO-GO** — needs auth |
| 6. Controlled real-number testing | **NO-GO** — blocked on 4–5 |
| 7. Stripe SMS live creation | **NO-GO** — needs owner approval phrase after test mode |
| 8. Public SMS activation | **NO-GO** |

## Owner actions required

1. Provide Stripe **test** secret (or authorize running setup against a test account) for `--confirm-test-sms-setup`.
2. Create/verify Telnyx account; authorize least-privilege API key placement (never commit).
3. Authorize brand/campaign registration fees when quoted.
4. Authorize dedicated number purchase when quoted.
5. Explicit approval before any live SMS Stripe object creation.
6. Explicit approval before public SMS flags.
