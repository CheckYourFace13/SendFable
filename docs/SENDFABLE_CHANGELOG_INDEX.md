# SendFable change reference index

Permanent numbered work references for major SendFable production tasks.

**Current production app commit (verified 2026-07-29):** `c880c31eb5bd4b77edc2b2b7917211791c4e7af1`  
**Deploy:** SF-012–015 activation + IndexNow root-key fix  
**Backup:** `/root/sendfable-backups/sendfable-20260729-202150.sql.gz`  
**Rollback:** `f8c3aa5` / prior app `81dea78`  

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
