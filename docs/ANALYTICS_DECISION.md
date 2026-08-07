# Analytics decision

Decided 2026-07-24 (Phase 10 of the production-readiness pass).  
Updated 2026-07-29 (SF-007): first-party persistence path approved.  
Updated 2026-08-07 (CRO completion): usage thresholds start at 80%; feedback free-text is first-party only.

## Architecture

1. **First-party** (`ANALYTICS_ENABLED=true`) — `ProductAnalyticsEvent` + `/admin/funnel`.
2. **Optional GA4** — loads only when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set (`G-…`).
3. Site works with neither configured.

Client events go through `src/lib/track.ts` (deduped) → first-party beacon + optional GA4 mirror.  
Server events use `trackEvent` in `src/lib/analytics.ts` (first-party only).

No PII (emails, phones, subjects, bodies, tokens, free-text feedback notes) is sent to GA4.
`feedback_note_text` and prop keys matching note/body/content/html/sms are blocked from GA4.

## Events mirrored to GA4 (when configured)

Marketing: `pricing_view`, `signup_cta_clicked`, `plan_cta_clicked`, `login_clicked`, industry/template page views.  
Activation: `signup_completed`, `onboarding_*`, `sender_verified`, `contacts_*`, `first_campaign_*`, `campaign_*`.  
Monetization: `usage_*`, `upgrade_prompt_*`, `checkout_*`, `subscription_*`, `plan_*`.  
Feedback: `feedback_submitted` with `rating` only (not free-text).

## Still optional / not auto-enabled

- Google Ads conversion ID (`NEXT_PUBLIC_GOOGLE_ADS_ID`) — stub env only
- Meta Pixel (`NEXT_PUBLIC_META_PIXEL_ID`) — stub env only
- GTM — not required; add later if Ads+Meta+GA need one container

## To enable

1. Set `ANALYTICS_ENABLED=true` for first-party funnel persistence.
2. Set `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-…` for GA4 (rebuild required for Next public env).
3. Update Privacy / Cookies copy if GA4 is turned on in production.
4. Use `/admin/funnel` for Organic → Paid monitoring.

