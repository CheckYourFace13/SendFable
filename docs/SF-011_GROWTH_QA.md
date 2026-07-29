# SF-011 — Final growth-system QA and deployment

| Field | Value |
|-------|-------|
| Reference | SF-011 |
| Date | 2026-07-29 |
| Branch | `sf/007-011-growth-system` |
| Starting commit | `baaf576` |
| Final commit | `81dea78` |
| Production commit | `81dea78` |
| Rollback | `f8c3aa5` / prior app `07a7eb6` |
| Migrations | `20260729193000_growth_analytics_partners` |

## QA executed

| Check | Result |
|-------|--------|
| Full tests | PASS (282) |
| Typecheck | PASS |
| Prisma validate | PASS |
| Production build | PASS |
| SEO / sitemap | Live sitemap 200; **77** URLs |
| Live crawl | PASS (37 routes) |
| Analytics event tests | PASS |
| Editorial / nurture gates | PASS |
| Referral credit gate | PASS |
| SMS dark / mock tests | PASS (existing suite) |
| Stripe SMS test catalog | SKIPPED — no `sk_test_` |
| Telnyx live | SKIPPED — no credentials / no paid auth |

## Deploy

| Field | Value |
|-------|-------|
| Backup | `/root/sendfable-backups/sendfable-20260729-194610.sql.gz` |
| Deploy window | `2026-07-29T19:46:10Z` → `19:51:08Z` |
| Health | `{"status":"ok"}` on `:3010` |
| `/partners` | 200 |
| IndexNow key URL | 404 expected (`INDEXNOW_KEY` unset) |

## Kept inactive

- General marketing nurture
- Automated social posting
- Partner outreach
- Referral monetary credits
- Live SMS / public SMS pricing / SMS checkout / number purchase / registration

## Explicit counts (expected)

| Metric | Count |
|--------|------:|
| Articles published (SF-008 batch) | 0 |
| Social posts published | 0 |
| Marketing emails sent | 0 |
| Nurture recipients | 0 |
| Partner outreach sent | 0 |
| Referral credits issued (monetary) | 0 |
| SMS messages sent | 0 |
| SMS numbers purchased | 0 |
| SMS registrations submitted | 0 |
| Live SMS Stripe products created | 0 |
