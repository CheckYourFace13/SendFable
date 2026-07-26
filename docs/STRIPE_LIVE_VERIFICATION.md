# Stripe live verification checklist

## Pre-charge checkpoint (required)

- [x] Stripe account name is **SendFable** (not Rental Noodle)
- [x] Live secret key (`sk_live_`) on production only
- [x] Eight live prices including Pro Plus; Starter monthly = **$12** (1200 cents)
- [x] Webhook endpoint enabled for `https://sendfable.com/api/webhooks/stripe`
- [x] Customer Portal configuration active
- [x] `STRIPE_BILLING_ENABLED=false`
- [x] `STRIPE_OWNER_TEST_ENABLED=true`
- [x] `CAMPAIGN_SEND_ENABLED=false`

## Controlled Starter $12 lifecycle — COMPLETED 2026-07-26

Evidence summary (no complete object IDs / Checkout URLs):  
`docs/STRIPE_STARTER12_LIFECYCLE_2026-07-26.md`

Result: **PASS** — paid $12, webhook FREE→STARTER, immediate cancel, full refund succeeded, FREE via `customer.subscription.deleted`, no duplicates, flags unchanged, other VPS apps untouched.

## Automated checks

```bash
npx prisma validate
npm run typecheck
npm test
npm run build
curl -sf http://127.0.0.1:3010/api/health
curl -s -o /dev/null -w "%{http_code}" -X POST https://sendfable.com/api/webhooks/stripe
```

## Wrong-account / wrong-mode

Production webhook rejects `livemode=false` events. Connect events with a foreign `event.account` are ignored when `STRIPE_EXPECTED_ACCOUNT_ID` is set.
