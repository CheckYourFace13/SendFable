# SF-006 — Final production QA and deployment

| Field | Value |
|-------|-------|
| Reference | SF-006 |
| Date | 2026-07-29 |
| Title | Final production QA and deployment |
| Purpose | Ship SF-001–005 marketing/SEO/AEO work safely |
| Branch | `sf/001-006-seo-compare-aeo` |
| Starting commit | `1d7c94d` |
| Rollback point | `f8c3aa5` (production app before this deploy) |

## Pre-deploy checks

- [x] Unit/integration tests
- [x] Typecheck
- [x] Prisma validate
- [x] SEO check
- [ ] Production Docker build (on VPS)
- [ ] Live crawl after deploy
- [ ] SMS dark confirmation
- [ ] Signup/login smoke
- [ ] No customer marketing emails / outreach / SMS

## Deploy steps

1. Backup: `bash scripts/vps-backup-sendfable.sh`
2. `git pull --ff-only origin main`
3. `docker compose -p sendfable -f docker-compose.prod.yml up -d --build`
4. Health: `curl -sf http://127.0.0.1:3010/api/health`
5. Crawl: `npx tsx scripts/crawl-public-launch.ts https://sendfable.com`

## Rollback

```bash
cd /opt/sendfable
git checkout f8c3aa5
docker compose -p sendfable -f docker-compose.prod.yml up -d --build
```

DB restore only if migrations applied (none expected this pass).
