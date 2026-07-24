# Stripe live rollback (Sendfable)

## Immediate kill switches (preferred)

In `/opt/sendfable/.env` (mode `600`):

```bash
STRIPE_BILLING_ENABLED=false
STRIPE_OWNER_TEST_ENABLED=false
```

Then recreate **only** the app (and worker if it reads the same env for billing — usually app is enough):

```bash
cd /opt/sendfable
docker compose -p sendfable -f docker-compose.prod.yml up -d --build --no-deps app
```

Checkout returns **“Billing is not activated yet.”** Portal may still work for existing customers with a Stripe Customer ID.

## Disable webhook reception

In Stripe Dashboard (Sendfable live account only): disable or delete the endpoint  
`https://sendfable.com/api/webhooks/stripe`  
— or rotate/remove `STRIPE_WEBHOOK_SECRET` and recreate the app so signatures fail closed.

## Remove live keys (last resort)

1. Clear `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, price IDs, and webhook secret from `/opt/sendfable/.env`
2. Recreate app
3. Do **not** point Sendfable at another Stripe account (especially not Rental Noodle)

## Data safety

- Free-plan fallback must **not** delete Stripe Customer IDs or historical invoice data in Stripe
- App may clear `stripeSubscriptionId` / set `plan=FREE` on `customer.subscription.deleted` while keeping `stripeCustomerId`

## Do not

- Restart Postgres, Redis, Nginx, or unrelated VPS projects for Stripe rollback
- Force-push or wipe volumes
- Use Stripe MCP authenticated to a different business account
