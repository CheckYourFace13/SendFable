# Production launch audit — 2026-07-24

**Verdict:** NO-GO for public promotion / GA activation.  
**Score:** 58 / 100  
**Git HEAD at audit:** `19b0b5e5f694194ccb61113b26deabdb08b0d4f7`

This document records evidence from production (`/opt/sendfable`, `https://sendfable.com`) and the repository. Launch env flags were **not** flipped.

## Stripe controlled-test result (blocking)

Checkout Session `cs_live_a1…OoIZ` on SendFable account `acct_1Two8SGnw9fPSfu4`:

| Check | Result |
|-------|--------|
| Session live + paid | **FAIL** — `status=open`, `payment_status=unpaid` |
| Correct account | PASS |
| Exactly one Customer | PASS — one `cus_…` for owner email |
| Exactly one active Starter-monthly Subscription | **FAIL** — zero subscriptions, charges, invoices, payment intents |
| No duplicates | PASS (only open unpaid session + one customer) |
| Webhook signature verified / plan → STARTER | **FAIL** — no Stripe billing events; `WebhookEvent` rows empty; DB user still `plan=PRO` with no `stripeSubscriptionId` |
| Billing page / portal fulfillment | **NOT VERIFIED** (no paid subscription) |
| Success URL cannot grant access | CODE-PASS (handlers ignore redirect-only) — not live-proven |
| App/worker/DB/Redis/Nginx/other sites healthy | PASS after test attempt |

**Conclusion:** Payment was not completed in Stripe. Do not treat Checkout as successful. Re-run the controlled test only after the owner completes payment on a live Session URL, then re-verify this checklist before any launch activation.

## Production flags (unchanged)

| Flag | Value |
|------|-------|
| EARLY_LAUNCH | true |
| ALLOW_PUBLIC_SIGNUP | false |
| STRIPE_BILLING_ENABLED | false |
| STRIPE_OWNER_TEST_ENABLED | true |
| CAMPAIGN_SEND_ENABLED | false |
| SES_CONTROLLED_TEST_ENABLED | false |

`.env` mode `600`. Live Stripe prefixes present (`sk_live` / `pk_live` / `whsec_`). No `sk_test_` / Rental Noodle account id in Sendfable env.

## SES / DNS snapshot

- `ProductionAccessEnabled=false` (sandbox), quota 200/day, 1/sec, HEALTHY, SentLast24Hours=2
- Domain `send.sendfable.com` verified; DKIM SUCCESS; MAIL FROM `bounce.send.sendfable.com` SUCCESS
- Config set `sendfable-events` → SNS BOUNCE/COMPLAINT/DELIVERY enabled
- Apex A → `177.7.38.145`; DMARC on `sendfable.com` present (`p=quarantine`)
- Campaign send remains gated off in app

## Kill switches / rollback (do not flip yet)

Keep current flags. App-only recreate:

```bash
cd /opt/sendfable
docker compose -p sendfable -f docker-compose.prod.yml up -d --build --no-deps app
```

See also `docs/PRODUCTION_ROLLBACK.md`, `docs/STRIPE_ROLLBACK.md`.
