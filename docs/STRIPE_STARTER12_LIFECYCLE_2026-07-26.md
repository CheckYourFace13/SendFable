# Starter $12 live billing lifecycle — completed 2026-07-26

Internal evidence only. **Not** a public changelog. Do not paste complete Stripe object IDs or Checkout URLs into public pages.

## Scope

Controlled **owner-only** live test on SendFable Stripe account (Dashboard display name **SendFable**).  
Public billing remained **off**. Launch flags unchanged throughout.

## Catalog under test

- Starter monthly price: **$12** (1200 USD cents), live, active, interval `month`
- Mapped via production `STRIPE_PRICE_STARTER_MONTHLY`

## Evidence (PASS)

| Step | Result |
|---|---|
| Existing Stripe customer reused | Yes (no duplicate customer) |
| Exactly one Checkout Session created | Yes |
| Checkout completed & paid | Yes — `status=complete`, `payment_status=paid`, `amount_total=1200` |
| Exactly one subscription / invoice / PaymentIntent / charge | Yes |
| Price on subscription | Starter monthly **1200** cents |
| Signed production webhooks | Processed `checkout.session.completed` and subscription events |
| Entitlement FREE → STARTER | Yes — **only** via verified webhook processing |
| Success redirect entitlement | **None** (architectural + observed) |
| Immediate cancel | Yes — `status=canceled`, `cancel_at_period_end=false`, `invoice_now=false`, `prorate=false` |
| Full refund | Yes — exactly **1200** cents; refund `status=succeeded`; exactly one refund |
| FREE fallback | Yes — via `customer.subscription.deleted`; `stripeSubscriptionId` and `billingInterval` cleared; customer retained |
| Duplicate objects | None observed for this test |
| Launch flags | Unchanged (all six locked) |
| Other VPS applications | Untouched |

## Card refund posting

Stripe marked the refund **succeeded**. Card issuers typically post refunds in about **5–10 business days**. That does not mean funds have already settled to the bank.

## Flags during and after test

```
EARLY_LAUNCH=true
ALLOW_PUBLIC_SIGNUP=false
STRIPE_BILLING_ENABLED=false
STRIPE_OWNER_TEST_ENABLED=true
CAMPAIGN_SEND_ENABLED=false
SES_CONTROLLED_TEST_ENABLED=false
```

## Related

- Checklist: `docs/STRIPE_LIVE_VERIFICATION.md`
- Rollback kill switches: `docs/STRIPE_ROLLBACK.md`
