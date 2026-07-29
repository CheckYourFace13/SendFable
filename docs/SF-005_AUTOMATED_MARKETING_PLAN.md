# SF-005 — Automated marketing plan

**Status:** Prepared drafts only. No live outbound marketing in this phase.  
**Date:** 2026-07-29  
**Branch:** `sf/001-006-seo-compare-aeo`

## Principles

- Permission-based only
- Reviewable before publish/send
- No fake urgency, fake logos, or invented metrics
- SMS remains dark
- Social and nurture stay **inactive** until owner approval

## 1. SEO content

- Clusters: Mailchimp switching, SMB email, deliverability, templates
- Pipeline statuses in `src/data/content-pipeline.ts`
- Human approval required before `PUBLISHED`

## 2. Search Console monitoring

Owner steps (credentials required):

1. Verify `sendfable.com` in Google Search Console
2. Submit `https://sendfable.com/sitemap.xml`
3. Monitor coverage, CWV, and query reports monthly
4. Bing Webmaster Tools: import GSC or verify DNS; enable IndexNow only if rate-limited carefully

## 3. Comparison freshness

- See `docs/COMPETITOR_REVIEW_PROCESS.md`
- Admin queue: `/admin/competitors`

## 4. Social content

- Drafts in `SOCIAL_DRAFTS` (exportable)
- Ratio target: 70% education / 20% use cases / 10% promotion
- **Do not connect live social accounts without approval**

## 5. Newsletter

- Use SendFable for SendFable only after sequence approval
- Unsubscribe + suppression required

## 6. Referral program

- Existing referral codes in settings/signup
- Propose sustainable reward after margin review — **do not activate paid rewards without approval**
- No multi-level structure

## 7. Partner outreach

- Draft audiences: web designers, consultants, chambers, restaurant/brewery advisors, bookkeepers, small agencies
- **Outreach sent this phase: 0**

## 8–10. Onboarding / nurture / PLG

- Sequences in `NURTURE_SEQUENCES` status `DRAFT`
- Activation gates: consent basis, triggers, unsub, suppression, frequency approval, test sends

## 11. Review generation

- Ask for reviews only after successful sends
- Never fabricate ratings or AggregateRating schema

## 12–13. Analytics / reporting

Recommended events (privacy-conscious): homepage CTA, pricing CTA, compare CTA, signup start/complete, sender verified, import, campaign drafted/test/sent, checkout started/completed.

Do not log email bodies or unnecessary PII.

## Expected counts this task

| Activity | Count |
|----------|-------|
| Customer marketing emails sent | 0 |
| Partner outreach sent | 0 |
| Social posts published | 0 |
| SMS messages sent | 0 |
| SMS registrations | 0 |
| Live SMS Stripe products | 0 |
