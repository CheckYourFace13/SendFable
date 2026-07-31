# SendFable change reference index

Permanent numbered work references for major SendFable production tasks.

**Current production app commit:** see latest SF row below  
**Backup:** env `/root/sendfable-backups/sendfable-env-sf016-20260731-152652.bak`; DB `/root/sendfable-backups/sendfable-20260729-202150.sql.gz`  
**Rollback:** prior app `b04db30` / `c880c31`  

---

## Sequence

| Ref | Date | Title | Status | Branch | Final | Production |
|-----|------|-------|--------|--------|-------|------------|
| SF-001–006 | 2026-07-29 | SEO / compare / AEO / deploy | Done | `sf/001-006-seo-compare-aeo` | `07a7eb6` | `07a7eb6` |
| SF-007–011 | 2026-07-29 | Growth foundation (inactive) | Done | `sf/007-011-growth-system` | `81dea78` | `81dea78` |
| [SF-012](./SF-012_ANALYTICS_ACTIVATION.md) | 2026-07-29 | Analytics + IndexNow activation | Done | `sf/012-015-activation` | `c880c31` | `c880c31` |
| [SF-013](./SF-013_FIRST_CONTENT_PUBLICATION.md) | 2026-07-29 | First content publication (2) | Done | same | `c880c31` | `c880c31` |
| [SF-014](./SF-014_GROWTH_AUTOMATION_TEST.md) | 2026-07-29 | Growth automation controlled testing | Done | same | `c880c31` | `c880c31` |
| [SF-015](./SF-015_OWNER_DECISIONS.md) | 2026-07-29 | External account + SMS launch package | Done | same | `c880c31` | `c880c31` |
| [SF-016](./SF-016_LIVE_STRIPE_SMS_CATALOG.md) | 2026-07-31 | Live Stripe SMS catalog preparation | Done | `sf/016-live-sms-catalog` | `b04db30` | `b04db30` |
| [SF-017](./SF-017_TELNYX_ISV_ARCHITECTURE.md) | 2026-07-31 | Telnyx ISV architecture + account readiness | Done | `sf/017-telnyx-isv-readiness` | TBD | TBD |

## SF-016 record

| Field | Value |
|-------|-------|
| Doc | `docs/SF-016_LIVE_STRIPE_SMS_CATALOG.md` |
| Stripe mode | **live**; inactive SMS products; flags false |
| Charges / customers / meter events | **0** |

## SF-017 record

| Field | Value |
|-------|-------|
| Docs | `SF-017_TELNYX_ISV_ARCHITECTURE.md`, owner setup, support request, registration requirements, revised margin |
| Telnyx credentials on VPS | **MISSING** |
| Recommended architecture | Option D (owner test) → Option B isolated ISV (scale) |
| External charges / numbers / registrations / SMS | **all 0** |
| SMS flags enabled | **0** |

## SF-012 record

| Field | Value |
|-------|-------|
| Starting commit | `24eaf5e` / prod was `81dea78` |
| Final / production | `c880c31` |
| Env | `ANALYTICS_ENABLED=true`, `INDEXNOW_KEY` set (secret), `NURTURE_GENERAL_ENABLED=false` |
| IndexNow | Root `/{key}.txt` **200**; submit **HTTP 202** for 8 URLs |
| Messages / charges | 0 / $0 |
| Rollback | `81dea78` / `f8c3aa5` |
| Owner actions | GSC + Bing verify (`docs/SEARCH_ENGINE_OWNER_ACTIONS.md`) |

## SF-013 record

| Field | Value |
|-------|-------|
| Articles published | **2** |
| URLs | `/guides/best-mailchimp-alternative-for-small-businesses`, `/guides/how-to-switch-from-mailchimp` |
| Sitemap | 79 URLs |
| Remaining drafts | 10 (not falsely approved) |

## SF-014 record

| Field | Value |
|-------|-------|
| Controlled nurture emails | **12** to `ch***@iscreamstudio.com` |
| Sequences | all 5 sampled; negatives blocked |
| Referral credits issued | **0** |
| Partner outreach | **0**; 1 QA application declined |
| Left inactive | general nurture, social, credits, SMS |

## SF-015 record

| Field | Value |
|-------|-------|
| Doc | `docs/SF-015_OWNER_DECISIONS.md` |
| Approval phrases | Telnyx / nurture / social / credits / partner |
| Stripe sk_test / Telnyx | Owner actions only — **no charges** |
