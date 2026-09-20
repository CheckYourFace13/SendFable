# Phase O — Rebuild certification report

**Date:** 2026-09-20  
**Local workspace HEAD (pre-commit):** `72624a0` (production baseline) + uncommitted rebuild changes on `main`  
**Casey:** kept  
**Public SMS:** still **OFF** (`SENDFABLE_SMS_PUBLIC_ENABLED` default false)

## Readiness scores (honest)

| Area | Score | Notes |
|------|------:|-------|
| Customer readiness (email) | ~94% | Templates gallery + goal→template + signup resume wired |
| Customer readiness (public SMS) | ~70% dark / ~95% only after Phase N | Number claim UI + legal sections + ladder docs; PUBLIC not flipped |
| Sales / design conversion | ~90% | Warm-confidence tokens; hero answers WHAT/WHY/COST/FREE; ChannelTrio gated |
| Search / growth | ~88% | Pricing hub + matrix mobile; Mailchimp 301s; compare analytics |
| “100% done” claim | **No** | Needs Phase M green matrix on CI/VPS, attorney SMS sign-off, owner SMS public approval, HEAD sync deploy |

## Phase completion

| Phase | Status |
|-------|--------|
| A Broken product paths | Done (prior + this branch) |
| B SMS customer readiness dark | Done (claim_number UI, legal SMS sections, ladder + second-tenant docs) |
| C Design tokens | Done |
| D Homepage conversion | Done (gated Email/Text/Both) |
| E Public templates + resume | Done |
| F Guided goal→channel→template | Done |
| G Reporting Email/Text/Both | Done (prior) |
| H Pricing comparison hub | Done |
| I Compare sales structure | Done |
| J Mailchimp 301s | Done |
| K TEXT20 | Dark prepared (`docs/PROMO_TEXT20.md`, gated `/promo/text20`, checkout promo hooks) |
| L Copy scrub | Homepage + scrub test; broader marketing tree still has residual em dashes |
| M Full QA matrix | Checklist in `docs/REBUILD_QA_MATRIX.md` — run before deploy |
| N Public SMS launch | **Blocked on owner approval** — `docs/SMS_PUBLIC_LAUNCH.md` |
| O This report | Done |

## HEAD sync (GitHub / VPS / app / worker)

Not deployed in this session. After commit + push + VPS deploy, verify:

1. App and worker commit SHAs match  
2. `SENDFABLE_SMS_PUBLIC_ENABLED=false` still  
3. Casey From identity unchanged  
4. Smoke: homepage, `/templates`, `/email-marketing-pricing-comparison`, email send path

## Explicit non-actions

- Did not set public SMS flags  
- Did not market TEXT20  
- Did not invent competitor prices  
- Did not remove Casey
