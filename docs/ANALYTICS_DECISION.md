# Analytics decision

Decided 2026-07-24 (Phase 10 of the production-readiness pass).  
Updated 2026-07-29 (SF-007): first-party persistence path approved; still **no third-party** analytics.

## Decision: no third-party analytics at launch

- No analytics vendor is approved for Sendfable.
- The Plausible instance running on the shared VPS belongs to
  **RentalNoodle** (`plausible.rentalnoodle.com`) and must not be reused.
- Consequently the site sets **only strictly-necessary first-party cookies**
  (session + CSRF). The marketing beacon may use `localStorage` for an anonymous
  session id and first/last UTM touch — not a third-party cookie.
- No cookie-consent banner is required for this first-party design.

## What exists

`src/lib/analytics.ts` — typed funnel events (public, activation, revenue).  
`src/lib/analytics-persist.ts` — optional `ProductAnalyticsEvent` rows when
`ANALYTICS_ENABLED=true`.  
`POST /api/analytics/event` — rate-limited beacon.  
`/admin/funnel` — stage report.

Privacy scrubber drops email/phone/subject/body/address/token-shaped props.

## To enable collection

1. Owner sets `ANALYTICS_ENABLED=true` in production.
2. Confirm Privacy/Cookies language still accurate (first-party only).
3. Use `/admin/funnel` for Organic → Paid monitoring.

## Still not approved

- GA4, Plausible (shared), Segment, or any third-party script without a new decision record.
