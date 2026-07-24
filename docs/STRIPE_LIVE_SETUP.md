# Stripe live setup (Sendfable)

**Account:** SendFable (`acct_1Two8SGnw9fPSfu4`) — live mode only.  
**Do not** use the Rental Noodle Stripe account or the global Stripe MCP/plugin for this work.

## Live products & prices

| Plan | Monthly | Annual | Lookup keys |
|------|---------|--------|-------------|
| Starter | $9 | $90 | `sendfable_starter_monthly` / `sendfable_starter_annual` |
| Growth | $19 | $190 | `sendfable_growth_monthly` / `sendfable_growth_annual` |
| Pro | $49 | $490 | `sendfable_pro_monthly` / `sendfable_pro_annual` |

Free plan has no Stripe product. Quantity is always `1` (licensed recurring).

Env (production only, `/opt/sendfable/.env` mode `600`):

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_live_…`)
- `STRIPE_SECRET_KEY` (`sk_live_…`)
- `STRIPE_PRICE_*_MONTHLY` / `STRIPE_PRICE_*_ANNUAL` (and `*_YEARLY` alias)
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_EXPECTED_ACCOUNT_ID=acct_1Two8SGnw9fPSfu4`
- `STRIPE_BILLING_ENABLED=false` (public Checkout off)
- `STRIPE_OWNER_TEST_ENABLED=true` (owner-only controlled Checkout)

## Webhook

- URL: `https://sendfable.com/api/webhooks/stripe`
- Signature verification on raw body
- Idempotent via `WebhookEvent` + Stripe event ID
- Plan upgrades only from verified webhook handlers — never from `/billing?success=1`

## Customer Portal

- Return URL: `https://sendfable.com/billing`
- Payment method update, invoice history/download
- Cancel at period end
- Switch among Starter / Growth / Pro and monthly / annual
- Proration: `create_prorations` on plan changes

## Checkout gates

1. `STRIPE_BILLING_ENABLED` defaults **false** when missing.
2. Server returns **“Billing is not activated yet.”** when Checkout is blocked.
3. With `STRIPE_OWNER_TEST_ENABLED=true`, only `chris@iscreamstudio.com` may create Checkout while public billing is off.
4. Existing subscribers with an active subscription are sent to the Customer Portal (no duplicate Checkout subscriptions).

## Idempotent setup script

```bash
cd /opt/sendfable
# .env must already contain live STRIPE_SECRET_KEY
npm run stripe:setup
# merges prices + webhook secret into .env via ops merge step
```

## Related gates (unchanged)

- `EARLY_LAUNCH=true`
- `ALLOW_PUBLIC_SIGNUP=false`
- `CAMPAIGN_SEND_ENABLED=false`
- `SES_CONTROLLED_TEST_ENABLED=false`
