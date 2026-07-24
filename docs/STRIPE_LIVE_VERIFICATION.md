# Stripe live verification checklist

## Pre-charge checkpoint (required)

- [ ] Stripe account name is **SendFable** (not Rental Noodle)
- [ ] Account ID `acct_1Two8SGnw9fPSfu4`
- [ ] Live secret key (`sk_live_`)
- [ ] Charges enabled / payouts enabled as reported by Stripe
- [ ] Six live prices stored in `/opt/sendfable/.env` (`STRIPE_PRICE_*`)
- [ ] Webhook endpoint enabled for `https://sendfable.com/api/webhooks/stripe`
- [ ] `STRIPE_WEBHOOK_SECRET` present (never logged in full)
- [ ] Customer Portal configuration active
- [ ] App rebuilt with live keys; no `sk_test_` / `pk_test_` in production `.env`
- [ ] `STRIPE_BILLING_ENABLED=false`
- [ ] `STRIPE_OWNER_TEST_ENABLED=true`
- [ ] `CAMPAIGN_SEND_ENABLED=false`
- [ ] **No payment or charge has occurred yet**

## Controlled live subscription test (only after explicit approval)

Exact approval phrase: `Run the controlled live Stripe subscription test.`

Then verify:

1. Owner `chris@iscreamstudio.com` opens one Starter monthly ($9) Checkout Session
2. Payment completed manually in Stripe Checkout (live card — no test cards)
3. Live Customer + one Subscription created (no duplicates)
4. Webhook signature verified; workspace/user plan → `STARTER` only after webhook
5. Billing page shows paid status; Customer Portal opens; invoice exists
6. App / worker / Postgres / Redis healthy
7. Do **not** auto-run upgrade, downgrade, failure, refund, or cancel with real money

## Automated checks

```bash
npx prisma validate
npm run typecheck
npm run lint
npm test
npm run build
docker compose -p sendfable -f docker-compose.prod.yml config
curl -sf http://127.0.0.1:3010/api/health
# Webhook smoke (expect 400 missing/invalid signature — do not forge):
curl -s -o /dev/null -w "%{http_code}" -X POST https://sendfable.com/api/webhooks/stripe
```

## Wrong-account / wrong-mode

Production webhook rejects `livemode=false` events. Connect events with a foreign `event.account` are ignored when `STRIPE_EXPECTED_ACCOUNT_ID` is set.
