# Stripe live verification checklist

## Pre-charge checkpoint (required)

- [ ] Stripe account name is **SendFable** (not Rental Noodle)
- [ ] Account ID `acct_1Two8SGnw9fPSfu4`
- [ ] Live secret key (`sk_live_`)
- [ ] Charges enabled / payouts enabled as reported by Stripe
- [ ] Eight live prices stored in `/opt/sendfable/.env` (`STRIPE_PRICE_*` including `PRO_PLUS`)
- [ ] `STRIPE_PRICE_STARTER_MONTHLY` maps to **$12** (1200 cents) live price
- [ ] Webhook endpoint enabled for `https://sendfable.com/api/webhooks/stripe`
- [ ] `STRIPE_WEBHOOK_SECRET` present (never logged in full)
- [ ] Customer Portal configuration active
- [ ] App rebuilt with live keys; no `sk_test_` / `pk_test_` in production `.env`
- [ ] `STRIPE_BILLING_ENABLED=false`
- [ ] `STRIPE_OWNER_TEST_ENABLED=true`
- [ ] `CAMPAIGN_SEND_ENABLED=false`
- [ ] **No payment or charge has occurred for this new-price test yet**

## Controlled live subscription test — new Starter $12 (only after explicit approval)

**Do not run until the owner sends the exact authorization phrase below.**

Exact later authorization phrase:

```text
Authorize the controlled owner-only Starter $12 monthly billing test on SendFable Stripe acct_1Two8SGnw9fPSfu4. Create one Checkout Session only. After successful verification, immediately cancel the subscription and issue a full $12 refund. Do not flip launch flags.
```

Then verify (owner `chris@iscreamstudio.com`, flags still locked):

1. Confirm live Starter monthly price ID in `.env` is the post-reprice **$12** price (not archived $9).
2. Owner opens **one** Starter monthly Checkout Session; Checkout displays **$12**.
3. Reuse the existing Stripe customer where safe to prevent duplicates.
4. Pay with a real card (no test cards). Expect **exactly one** Checkout Session, Subscription, Invoice, Charge, and PaymentIntent.
5. Webhook signature verified; workspace plan → `STARTER` **only after** webhook (success redirect grants nothing).
6. Billing page and Customer Portal show Starter / $12.
7. Idempotency: repeat webhook / refresh does not duplicate objects or re-grant.
8. Immediate cancel of the subscription; issue a **full $12 refund**.
9. `customer.subscription.deleted` (or equivalent) returns workspace to **Free**.
10. No duplicate customers/subscriptions/invoices from the test.
11. Other VPS applications remain untouched.
12. Launch flags unchanged: `EARLY_LAUNCH=true`, `ALLOW_PUBLIC_SIGNUP=false`, `STRIPE_BILLING_ENABLED=false`, `STRIPE_OWNER_TEST_ENABLED=true`, `CAMPAIGN_SEND_ENABLED=false`, `SES_CONTROLLED_TEST_ENABLED=false`.

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
