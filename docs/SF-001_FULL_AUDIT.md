# SF-001 — Full product, SEO and competitor audit

| Field | Value |
|-------|-------|
| Reference | SF-001 |
| Date | 2026-07-29 |
| Title | Full product, SEO and competitor audit |
| Purpose | Baseline live site + app quality before comparison/AEO expansion |
| Branch | `sf/001-006-seo-compare-aeo` |
| Starting commit | `1d7c94db7d2ed0f335a18e4e560d2d02c8f63e16` |
| Final commit | (see SF-006) |
| Production commit (at audit start) | `f8c3aa5b5ac1651f4881ef6dfc91f6cb2101f391` |
| Database migrations | None |
| Tests | Existing public-launch crawl PASS (27 routes); suite expanded in SF-002+ |
| Deployment | Deferred to SF-006 |
| Rollback point | `f8c3aa5` (pre-SF deploy) |

## Live verification at audit start

- Public launch crawl: PASS (no early-access/coming-soon/BullMQ; pricing $12/$29/$69/$99 + Pro Plus)
- SMS dark on `/pricing`
- `/early-access` → `/signup`
- Sitemap URL count before expansion: **40**
- Robots: auth/app routes disallowed; marketing allowed

## Findings summary

| Area | Finding | Action |
|------|---------|--------|
| Positioning | Clear SMB focus on home/pricing | Reinforce via `sendfable-facts` + about/how pages |
| Comparisons | Only 6 compare pages; thin vs required set | SF-002/003 centralized catalog + full hub |
| Canonicals | Fixed on prior pass for home/pricing/features | Extend via `marketingPageMeta` on new pages |
| AEO | FAQs exist on some pages; no central facts module | SF-004 `sendfable-facts.ts` |
| Mailchimp hub | `/compare`, `/vs`, `/alternatives`, `/migrate` overlap | Distinct intent pages + calculator |
| Industry pages | Solutions exist; SEO “email marketing for X” thin | Add distinct intent pages |
| About / how-it-works | Missing | Add |
| Competitor freshness | Hard-coded pricing file, no review queue | Freshness report + admin page |
| Internal linking | Footer compare list incomplete | Expand footer/resources |
| App quality | Prior customer-flow verify PASS | No blocking app defects for this SEO pass |
| SMS | Dark — keep | Confirm in SF-006 |
| Search Console | Owner credentials required | Document owner steps in SF-005 |

## Route inventory notes

Public marketing routes (pre-expansion) matched `SITEMAP_PATHS` (~40). Authenticated app routes remain noindex via robots disallow. Admin SMS routes exist but are owner-gated and not in sitemap.

Live HTML spot checks: no stale launch wording; no public SMS pricing; Features without BullMQ.

## Recommended → implemented (later SF items)

| Recommendation | Implemented in |
|----------------|----------------|
| Competitor data system | SF-002 |
| Full compare pages + calculator | SF-003 |
| About, how-it-works, facts, FAQs | SF-004 |
| Marketing automation prep (no live outbound) | SF-005 |
| Deploy + live crawl | SF-006 |

## Remaining after SF-001 alone

- Expand comparisons and entity pages (SF-002–004)
- Owner Search Console submission
- Full authenticated multi-viewport re-test optional (prior verify stands)
