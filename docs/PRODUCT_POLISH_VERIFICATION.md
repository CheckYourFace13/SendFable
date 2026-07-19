# Product polish verification

**Date:** 2026-07-19  
**Branch:** `main` (post Phase 1–5 implementation)

## Local / CI checks

Run before deploy:

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
npx prisma validate
docker compose -f docker-compose.prod.yml config
```

## Production checks (after deploy)

| Check | Expected |
|-------|----------|
| `https://sendfable.com/api/health` | app+database+redis ok |
| Worker logs | listening on `campaign-send` |
| `/early-access` | form submits → `/early-access/thanks` |
| `/admin` (owner) | overview loads |
| `/admin` (non-owner) | Forbidden |
| `/contacts/[id]` | detail/edit page |
| Dashboard checklist | visible for first-run |
| Favicon `/favicon.ico` | 200 |
| gravyblock / rentalnoodle / plausible | still healthy |
| AWS / Stripe keys | still blank |
| Real email | none sent |

## Screenshots

Store under `docs/screenshots/product-polish/` at:

- 390×844
- 768×1024
- 1440×900
- 1920×1080

## Known deferred items

See `KNOWN_LIMITATIONS.md` — builder drag polish, structured data, full permission matrix with MEMBER role.
