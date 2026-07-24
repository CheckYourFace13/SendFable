# Content-Security-Policy — report-only path

Prepared: 2026-07-24  
**Status:** Documented security task. **No enforcing CSP is deployed.**

## Why CSP is deferred

Sendfable is a Next.js App Router app with Auth.js, Stripe Checkout/Portal redirects, marketing pages, an email builder, image uploads, and tracking endpoints. An enforcing CSP that is wrong will break:

- Next.js inline scripts / hydration
- Auth.js CSRF and session cookies flows
- Stripe-hosted redirects and any future Stripe.js
- Builder preview iframes / `blob:` / `data:` image previews
- Open/click tracking pixel and redirect endpoints (first-party, but easy to over-block)
- Google Fonts or other CDN assets if introduced

## Proposed report-only policy (draft)

Serve via Nginx on the apex server only as:

```
Content-Security-Policy-Report-Only:
  default-src 'self';
  base-uri 'self';
  object-src 'none';
  frame-ancestors 'self';
  form-action 'self' https://checkout.stripe.com https://billing.stripe.com;
  img-src 'self' data: blob: https:;
  font-src 'self' data:;
  style-src 'self' 'unsafe-inline';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  connect-src 'self' https://api.stripe.com https://checkout.stripe.com;
  frame-src 'self' https://checkout.stripe.com https://js.stripe.com;
  worker-src 'self' blob:;
  report-uri /api/csp-report;
```

Notes on the draft:

- `'unsafe-inline'` / `'unsafe-eval'` are intentionally present for a **first** report-only pass so we observe real Next.js / builder needs before tightening.
- `report-uri` should point at a new first-party endpoint that logs **violated-directive + blocked-uri only** (no cookies, no contact PII).
- Prefer migrating to `report-to` + Reporting API after the endpoint exists.
- Do **not** add third-party analytics hosts until an analytics vendor is approved.

## Safe rollout path

1. Add `POST /api/csp-report` (rate-limited, no auth, discards bodies over a small size, stores directive + URI only).
2. Deploy **Report-Only** header in Nginx for `sendfable.com` (not other VPS sites).
3. Browse marketing, login, dashboard, builder, billing portal redirect, tracking pixel, unsubscribe for 48–72 hours.
4. Collect violations; classify:
   - Expected Next.js → move toward nonces/`strict-dynamic`
   - Unexpected third-party → investigate
   - Builder/`blob:`/`data:` → keep deliberate carve-outs
5. Tighten script-src with nonces (Next.js experimental or middleware nonce injection).
6. Flip to enforcing CSP only after zero unexpected violations for a full week and a manual regression pass.
7. Keep a one-line Nginx rollback (remove the header) documented in `docs/PRODUCTION_ROLLBACK.md`.

## Violations observed

**None yet** — report-only header has not been deployed. This section will be filled after step 2–4.

## Decision for launch

CSP remains a **documented post-gate security task**. Launch readiness does not depend on enforcing CSP. Security headers already live (HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy).
