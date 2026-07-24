# Analytics decision

Decided 2026-07-24 (Phase 10 of the production-readiness pass).

## Decision: no third-party analytics at launch

- No analytics vendor is approved for Sendfable.
- The Plausible instance running on the shared VPS belongs to
  **RentalNoodle** (`plausible.rentalnoodle.com`) and must not be reused.
- Consequently the site sets **only strictly-necessary first-party cookies**
  (session + CSRF), which is what the Privacy Policy cookie section states,
  and no cookie-consent banner is required.

## What exists instead

`src/lib/analytics.ts` — a typed, first-party event interface
(`trackEvent(event, props)`) covering the launch funnel (pricing viewed,
signup, auth, workspace created, sender verified, CSV import counts, campaign
created, test email, checkout, subscription lifecycle, first campaign sent).

It is **disabled by default** (`ANALYTICS_ENABLED` unset) and its delivery is
a stub. Privacy rules are enforced by the type contract: event names and
numeric counts only — never email addresses, contact lists, campaign content,
Stripe IDs, or per-recipient open/click data.

## To enable later

1. Owner approves a provider (self-hosted Plausible instance for Sendfable, or
   a first-party events table).
2. Implement delivery inside `trackEvent`, wire call sites, set
   `ANALYTICS_ENABLED=true`.
3. Update the Privacy Policy cookie section **before** deploying if the
   provider sets cookies.
