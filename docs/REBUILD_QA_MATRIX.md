# Rebuild QA matrix (Phase M)

Run locally or on CI after Phases A–L. Record date/operator and unexplained failures.

## Automated

- [ ] `npx tsc --noEmit`
- [ ] `npm run lint` (or project lint script)
- [ ] Unit: `npm test` (or node:test suite) including `legal-policies`, `marketing-copy-scrub`, SMS readiness
- [ ] Prisma validate
- [ ] Production build

## Playwright / manual public

- [ ] Homepage CTAs → `/signup`, `/pricing`
- [ ] `/templates` lists platform templates; detail Use → signup with `?template=`
- [ ] Auth Use → `/campaigns/new?template=` creates campaign
- [ ] Pricing comparison desktop table + mobile accordion (375px)
- [ ] `/compare/mailchimp` structure + calculator tracking
- [ ] Mailchimp 301s: `/vs/mailchimp` → `/compare/mailchimp` (and cluster list)
- [ ] `/promo/text20` returns 404 while SMS/promo public flags off

## Authenticated

- [ ] Goal → channel → template → campaign
- [ ] Library platform templates list
- [ ] Send Confidence email path
- [ ] Report EMAIL fixtures OK; SMS/BOTH when pilot

## SMS (pilot or staging — PUBLIC still false)

- [ ] Second-tenant checklist `docs/SMS_SECOND_TENANT_E2E.md`
- [ ] Flag ladder `docs/SMS_PUBLIC_FLAG_LADDER.md` reviewed
- [ ] SMS compliance self-certification signed PASS (`docs/SMS_COMPLIANCE_SELF_CERTIFICATION.md`); outside counsel optional

## Stripe

- [ ] Email Checkout regression
- [ ] Promo path dark: `allow_promotion_codes` env or `promotionCode` id
- [ ] Do not enable marketing TEXT20 until public SMS

## Pass rule

0 unexplained failures; 0 required skips for email GA paths.
