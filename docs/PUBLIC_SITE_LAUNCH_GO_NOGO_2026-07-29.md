# Public site launch cleanup — GO / NO-GO — 2026-07-29

**Branch:** `launch/public-site-cleanup-2026-07-29` (merged to `main`)  
**Commits:** `603d1aa` (stale copy + force-dynamic + Docker build args), `f8c3aa5` (contiguous `$12` HTML + canonical fix)  
**Production commit:** `f8c3aa5b5ac1651f4881ef6dfc91f6cb2101f391`  
**Pre-deploy commit:** `2412ad2`  
**Backup:** `/root/sendfable-backups/sendfable-20260729-161302.sql.gz`  
**Deploy window:** ~2026-07-29T16:13Z (first) → ~2026-07-29T16:51Z (follow-up rebuild)

## Root cause

Marketing HTML was baked at Docker **build** time without `ALLOW_PUBLIC_SIGNUP=true`, so the announcement bar advertised waitlist even though runtime `.env` had signup open.

## Fixes shipped

- Live announcement CTA: “start writing free” → `/signup`
- Marketing layout `force-dynamic`
- Docker build args `EARLY_LAUNCH=false`, `ALLOW_PUBLIC_SIGNUP=true`
- Features copy without BullMQ/SES jargon as primary message
- `/early-access` redirects to `/signup` when public signup is allowed
- Legal / signup / billing early-launch wording cleaned
- Contiguous price tokens in HTML (`$12` not `$<!-- -->12`)
- Removed global homepage-only canonical; `/`, `/pricing`, `/features` set correctly
- `public-launch-wording` tests + `scripts/crawl-public-launch.ts`

## Live verification

- Public crawl **27/27 PASS** (stale phrases absent; pricing `$12/$29/$69/$99` + Pro Plus; SMS dark on `/pricing`)
- SEO check **PASS** (35 pages)
- Unit/integration tests **257 pass / 0 fail**
- Typecheck **PASS**
- Health: app + database + redis **ok**
- Stripe live catalog matches `plans.ts`: Starter 1200/12000, Growth 2900/29000, Pro 6900/69000, Pro Plus 9900/99000 (no SMS products)
- SMS flags all live=false (mock provider true only)

## Verdicts

| Gate | Verdict |
|------|---------|
| 1. Public promotion | **GO** |
| 2. New customer signup | **GO** |
| 3. Free-plan onboarding | **GO** (prior controlled customer-flow verify) |
| 4. Paid checkout | **GO** (billing enabled; catalog verified) |
| 5. Email campaign sending | **GO** (prior SES production launch) |
| 6. Desktop application use | **GO** (Chromium viewport matrix clean; Edge≈Chromium) |
| 7. Mobile web application use | **GO** for public surfaces at 320–430 widths (Chromium) |
| 8. Tablet web application use | **GO** for public surfaces at 768–1024 (Chromium) |

## Residual / deferred

- Full Playwright Firefox/WebKit browsers may need local install on the agent machine
- Full interactive authenticated journey across every breakpoint not re-run in this pass (prior customer-flow verify stands)
- PWA: manifest + icons + theme-color present; **no service worker** (intentional post-launch; do not cache auth/dashboard)
- Admin early-access lead tools remain for historical leads (not public CTA)
- SMS remains dark by design

## Rollback

```bash
cd /opt/sendfable
git checkout 2412ad2
docker compose -p sendfable -f docker-compose.prod.yml up -d --build
# DB restore only if needed:
# gunzip -c /root/sendfable-backups/sendfable-20260729-161302.sql.gz | docker exec -i sendfable-postgres psql -U sendfable -d sendfable
```
