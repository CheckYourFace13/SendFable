# External services remaining — Sendfable production

Deployed with **no real SES sends** and **no live Stripe billing**.

## DNS (blocking HTTPS)

1. In GoDaddy DNS for `sendfable.com`, **delete** parking A records:
   - `15.197.148.33`
   - `3.33.130.190`
2. Keep a single `@` A → `177.7.38.145`
3. Keep `www` CNAME → `sendfable.com`
4. Do **not** change nameservers or email DNS (MX/SPF/DKIM/DMARC)
5. Verify: `dig +short sendfable.com A` returns **only** `177.7.38.145`
6. On VPS: rerun Certbot (see `PRODUCTION_DEPLOYMENT.md`)

## Amazon SES (later)

- Create IAM user / keys, configuration set, SNS bounce/complaint topic
- Verify sending domain (`send.sendfable.com` or chosen domain)
- Request production access if still in sandbox
- Set `AWS_*` in `/opt/sendfable/.env`, recreate app+worker
- Follow `docs/SES_*.md`

## Stripe (later)

- Create products/prices (`npm run stripe:setup` against live/test as appropriate)
- Set `STRIPE_*` env vars + webhook endpoint `https://sendfable.com/api/webhooks/stripe`
- Recreate app container

## Exit early launch

When ready for public signup:

```env
EARLY_LAUNCH=false
ALLOW_PUBLIC_SIGNUP=true
```

Recreate app (and confirm SES before allowing real campaign launches).
