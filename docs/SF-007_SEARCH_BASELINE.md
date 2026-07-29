# SF-007 — Search Console, Bing and analytics baseline

| Field | Value |
|-------|-------|
| Reference | SF-007 |
| Date | 2026-07-29 |
| Starting commit | `baaf576` |
| Branch | `sf/007-011-growth-system` |
| Final commit | `81dea78` |
| Production commit | `81dea78` |
| Migrations | `20260729193000_growth_analytics_partners` |
| Tests | See SF-011 — 282 PASS |
| Rollback point | `f8c3aa5` / prior prod `07a7eb6` |

## Audit summary (production + repository)

| System | State | Evidence |
|--------|-------|----------|
| Google Search Console | **Not verified in app config** | No `GOOGLE_SITE_VERIFICATION` in production env sample; no HTML verification file in repo |
| Google Analytics 4 | **Not installed** (intentional) | `docs/ANALYTICS_DECISION.md` — no third-party; first-party events instead |
| Bing Webmaster Tools | **Not verified in app config** | No `BING_SITE_VERIFICATION` set |
| IndexNow | **Implemented, inactive** | Requires `INDEXNOW_KEY`; key URL `/indexnow/key.txt`; admin POST `/api/admin/indexnow` |
| Sitemap | **Live** | `https://sendfable.com/sitemap.xml` → HTTP 200, `Content-Type: application/xml` (verified 2026-07-29) |
| Robots | **Live** | `/robots.txt` allows marketing paths; sitemap URL present |
| Canonicals / structured data | **Present** on marketing pages via `metadata` + JsonLd helpers |
| Conversion events | **Defined**; persistence gated by `ANALYTICS_ENABLED` | `src/lib/analytics.ts` |
| Referral / comparison attribution | **UTM first/last touch** in client beacon | `MarketingAnalytics` |

### Search metrics (GSC / Bing)

**No Search Console or Bing API credentials are available in this environment.**  
Therefore **impressions, clicks, CTR, average position, indexed/excluded counts, soft 404s, CWV, and structured-data error counts are not retrieved and are not invented.**

Owner must complete browser verification (below). After API or export access exists, paste real numbers into this section.

| Metric | Value |
|--------|-------|
| Indexed | *not retrieved* |
| Discovered / not indexed | *not retrieved* |
| Crawled / not indexed | *not retrieved* |
| Excluded / errors | *not retrieved* |
| Impressions / clicks / CTR / position | *not retrieved* |
| Top queries / pages / devices / countries | *not retrieved* |
| Soft 404s / duplicate canonicals / CWV | *not retrieved* |

## Sitemap & priority URLs

Sitemap discovery is the indexing strategy (no mass URL Inspection spam).

Priority landing URLs (internal links + sitemap):

- `/`, `/pricing`, `/features`, `/compare`, `/compare/mailchimp`
- `/mailchimp-alternative`, `/best-email-marketing-software`
- `/best-email-marketing-for-small-business`, `/simple-email-marketing-software`
- `/how-sendfable-works`, `/deliverability`, `/about`

## Owner actions (minimal)

### Google Search Console

1. Open [Google Search Console](https://search.google.com/search-console) → Add property `https://sendfable.com`.
2. Prefer **DNS TXT** verification, or HTML tag: paste token into production env as `GOOGLE_SITE_VERIFICATION` (public meta only — not a secret) and redeploy.
3. Submit sitemap: `https://sendfable.com/sitemap.xml`.
4. Export Coverage + Performance (28d) CSV → attach to this doc or store under `docs/exports/` (do not commit secrets).

### Bing Webmaster Tools

1. Import from GSC if offered, or verify with `BING_SITE_VERIFICATION` meta / DNS.
2. Submit the same sitemap URL.
3. Optional: set `INDEXNOW_KEY` (random 8–128 char key), redeploy, confirm `https://sendfable.com/indexnow/key.txt` returns the key, then use Admin → IndexNow only for **new/changed** URLs after publish (rate-limited).

### Analytics

1. Review Privacy/Cookies (still first-party only; session beacon uses `localStorage`, not third-party cookies).
2. Set `ANALYTICS_ENABLED=true` in production when ready to collect funnel events.
3. Open `/admin/funnel` for Organic → Paid funnel stages.

## External accounts changed

None by Cursor (no GSC/Bing credentials).

## Messages sent

0

## GO / NO-GO

| Gate | Status |
|------|--------|
| Sitemap healthy | **GO** |
| First-party analytics code | **GO** (enable flag separately) |
| IndexNow code | **GO** (key required) |
| GSC monitoring with live metrics | **NO-GO** until owner verifies property |
| Bing/IndexNow live submission | **NO-GO** until verification + key |
