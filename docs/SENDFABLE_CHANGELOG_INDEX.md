# SendFable change reference index

Permanent numbered work references for major SendFable production tasks.
Git commit hashes remain the source of truth for code history; reference numbers
are for human tracking across audits, deployments, and owner communication.

**Current production app commit (verified 2026-07-29):** `81dea78f0fed193095cf7ab6a5615f98458fd4e5`  
**Deploy timestamp:** `2026-07-29T19:46:10Z` (backup) → `2026-07-29T19:51:08Z` (containers up)  
**Backup:** `/root/sendfable-backups/sendfable-20260729-194610.sql.gz`  
**Rollback point:** `f8c3aa5b5ac1651f4881ef6dfc91f6cb2101f391` (safe prior public-site baseline) / app prior `07a7eb6`

---

## Pre-sequence history (verified commits)

| Ref | Date | Title | Commit | Notes |
|-----|------|-------|--------|-------|
| PRE-001 | 2026-07-29 | AWS SES production approval + email launch prep | `70eddfa` … `e931d5f` | SES sandbox removed; production launch GO recorded |
| PRE-002 | 2026-07-29 | Email production launch | `e931d5f` / deploy era | Campaign send enabled; controlled SES tests |
| PRE-003 | 2026-07-29 | SMS dark-backend integration | `2412ad2` | All live SMS flags false |
| PRE-004 | 2026-07-29 | SMS dark deploy record | `04d028d` | Production dark SMS confirmation |
| PRE-005 | 2026-07-29 | Public-site cleanup (stale early-access copy) | `603d1aa` + `f8c3aa5` | Live crawl PASS |
| PRE-006 | 2026-07-29 | Public-site GO/NO-GO doc | `1d7c94d` | Docs only ahead of prod at the time |

---

## Sequence

| Ref | Date | Title | Status | Branch | Final commit | Production commit |
|-----|------|-------|--------|--------|--------------|-------------------|
| [SF-001](./SF-001_FULL_AUDIT.md) | 2026-07-29 | Full product, SEO and competitor audit | Done | `sf/001-006-seo-compare-aeo` | `193d3b0` | `193d3b0` |
| SF-002 | 2026-07-29 | Comparison content architecture | Done | same | `193d3b0` | `193d3b0` |
| SF-003 | 2026-07-29 | Comparison pages and pricing engine | Done | same | `193d3b0` | `193d3b0` |
| SF-004 | 2026-07-29 | AEO/GEO knowledge content | Done | same | `193d3b0` | `193d3b0` |
| [SF-005](./SF-005_AUTOMATED_MARKETING_PLAN.md) | 2026-07-29 | Automated marketing system | Done (drafts only) | same | `193d3b0` | `193d3b0` |
| [SF-006](./SF-006_DEPLOYMENT.md) | 2026-07-29 | Final production QA and deployment | Done | same | `07a7eb6` | `07a7eb6` |
| [SF-007](./SF-007_SEARCH_BASELINE.md) | 2026-07-29 | Search Console, Bing, analytics baseline | Done (safe code) | `sf/007-011-growth-system` | `81dea78` | `81dea78` |
| [SF-008](./SF-008_SOCIAL_CALENDAR.md) | 2026-07-29 | Content, social, email marketing activation | Done (drafts only) | same | `81dea78` | `81dea78` |
| [SF-009](./SF-009_REFERRAL_ECONOMICS.md) | 2026-07-29 | Referral, partner, migration acquisition | Done (inactive rewards) | same | `81dea78` | `81dea78` |
| [SF-010](./SF-010_SMS_AUTHORIZATION.md) | 2026-07-29 | SMS production setup (dark) | Done (prep only) | same | `81dea78` | `81dea78` |
| [SF-011](./SF-011_GROWTH_QA.md) | 2026-07-29 | Final growth-system QA and deployment | Done | same | `81dea78` | `81dea78` |

---

## SF-007 record

| Field | Value |
|-------|-------|
| Reference | SF-007 |
| Date | 2026-07-29 |
| Starting commit | `baaf576` |
| Branch | `sf/007-011-growth-system` |
| Final commit | `81dea78` |
| Production commit | `81dea78` |
| Files changed | analytics, IndexNow, verification meta, funnel admin, docs |
| Migrations | `20260729193000_growth_analytics_partners` (analytics table) |
| Tests | Included in 282 suite |
| Deployment time | `2026-07-29T19:46:10Z`–`19:51:08Z` |
| External accounts changed | None (GSC/Bing owner verification pending) |
| Messages sent | 0 |
| Rollback point | `f8c3aa5` / `07a7eb6` |
| Owner actions | Verify GSC + Bing; optional `ANALYTICS_ENABLED`, verification meta, `INDEXNOW_KEY` |
| GO/NO-GO | Sitemap GO; GSC live metrics NO-GO until owner verifies |

## SF-008 record

| Field | Value |
|-------|-------|
| Reference | SF-008 |
| Date | 2026-07-29 |
| Starting commit | `baaf576` |
| Branch | `sf/007-011-growth-system` |
| Final commit | `81dea78` |
| Production commit | `81dea78` |
| Files changed | editorial drafts ×12, admin editorial, social calendar doc, nurture DRAFT specs |
| Migrations | None beyond shared growth migration |
| Tests | Editorial/nurture gate tests |
| Deployment time | `2026-07-29T19:46:10Z`–`19:51:08Z` |
| External accounts changed | None |
| Messages sent | 0 |
| Rollback point | `f8c3aa5` / `07a7eb6` |
| Owner actions | Approve first 2 articles; do not mass-publish |
| GO/NO-GO | Drafts GO; publish/nurture/social NO-GO without approval |

## SF-009 record

| Field | Value |
|-------|-------|
| Reference | SF-009 |
| Date | 2026-07-29 |
| Starting commit | `baaf576` |
| Branch | `sf/007-011-growth-system` |
| Final commit | `81dea78` |
| Production commit | `81dea78` |
| Files changed | referral economics + credit gate, `/partners`, partner API/admin, migration offer copy, outreach drafts |
| Migrations | `PartnerApplication` table |
| Tests | Referral credit gate |
| Deployment time | `2026-07-29T19:46:10Z`–`19:51:08Z` |
| External accounts changed | None |
| Messages sent | 0 |
| Rollback point | `f8c3aa5` / `07a7eb6` |
| Owner actions | Approve reward economics before `REFERRAL_CREDITS_ENABLED` |
| GO/NO-GO | Pages GO; credits/outreach NO-GO |

## SF-010 record

| Field | Value |
|-------|-------|
| Reference | SF-010 |
| Date | 2026-07-29 |
| Starting commit | `baaf576` |
| Branch | `sf/007-011-growth-system` |
| Final commit | `81dea78` |
| Production commit | `81dea78` |
| Files changed | `docs/SF-010_SMS_AUTHORIZATION.md` (fees from Telnyx docs); no public SMS enable |
| Migrations | None |
| Tests | Existing SMS suite still PASS |
| Deployment time | `2026-07-29T19:46:10Z`–`19:51:08Z` |
| External accounts changed | None |
| Messages sent | 0 |
| Rollback point | `f8c3aa5` / `07a7eb6` |
| Owner actions | Provide Telnyx keys + approve fee block; provide Stripe `sk_test_` for catalog |
| GO/NO-GO | Dark backend GO; registration/number/public/live Stripe NO-GO |

## SF-011 record

| Field | Value |
|-------|-------|
| Reference | SF-011 |
| Date | 2026-07-29 |
| Starting commit | `baaf576` |
| Branch | `sf/007-011-growth-system` |
| Final commit | `81dea78` |
| Production commit | `81dea78` |
| Files changed | growth jobs script, QA doc, deploy |
| Migrations | deploy `20260729193000_growth_analytics_partners` |
| Tests | 282 PASS; typecheck PASS; build PASS; live crawl PASS (37 routes) |
| Deployment time | `2026-07-29T19:46:10Z`–`19:51:08Z` |
| External accounts changed | None |
| Messages sent | 0 |
| Rollback point | `f8c3aa5` / `07a7eb6` |
| Owner actions | See GO/NO-GO list in final report |
| GO/NO-GO | Safe inactive growth system GO for deploy |

---

## Entry template

Each numbered entry document must record:

- Reference number, Date, Title, Purpose, Branch
- Starting commit, Final commit, Production commit
- Files changed, Database migrations, Tests
- Deployment timestamp, Rollback point, Live verification, Remaining actions
