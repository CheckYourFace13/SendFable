# Stripe activation readiness

**Status:** Not activated. `STRIPE_SECRET_KEY` and price IDs are blank in production.

## Before enabling billing

1. Create Stripe account (start in **test** mode).
2. Run `npm run stripe:setup` against test keys; record price IDs.
3. Add webhook endpoint `https://sendfable.com/api/webhooks/stripe` for subscription events.
4. Set env vars in `/opt/sendfable/.env` (`STRIPE_*`).
5. Recreate `sendfable-app`.
6. Verify `/billing` checkout in test mode with a Stripe test card.
7. Only then switch to live keys — never mix test prices with live keys.

## Do not

- Create live charges during early launch without a clear plan
- Store raw card data
- Enable public signup solely to drive unpaid trials without SES readiness
