# SendFable change reference index

Permanent numbered work references for major SendFable production tasks.
Git commit hashes remain the source of truth for code history; reference numbers
are for human tracking across audits, deployments, and owner communication.

**Current production app commit (verified 2026-07-29):** `193d3b0d7b9f06be8fef962ebc031a7e6e44a0a0`  
**Deploy timestamp:** `2026-07-29T17:35:42Z` → `2026-07-29T17:39:00Z`  
**Backup:** `/root/sendfable-backups/sendfable-20260729-173542.sql.gz`  
**Rollback point:** `f8c3aa5b5ac1651f4881ef6dfc91f6cb2101f391`

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
| [SF-006](./SF-006_DEPLOYMENT.md) | 2026-07-29 | Final production QA and deployment | Done | same | `193d3b0` (+ hotfix if any) | TBD after hotfix |

Future major tasks continue: **SF-007**, **SF-008**, **SF-009**, …

---

## Entry template

Each numbered entry document must record:

- Reference number, Date, Title, Purpose, Branch
- Starting commit, Final commit, Production commit
- Files changed, Database migrations, Tests
- Deployment timestamp, Rollback point, Live verification, Remaining actions
