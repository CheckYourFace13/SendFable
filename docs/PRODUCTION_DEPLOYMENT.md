# Production deployment — Sendfable

**Host:** `root@177.7.38.145` (Hostinger KVM, Ubuntu 24.04)  
**Path:** `/opt/sendfable`  
**Edge:** existing Nginx + Certbot (not Caddy)  
**App bind:** `127.0.0.1:3010` → Docker `sendfable-app:3000`  
**Git:** `https://github.com/CheckYourFace13/SendFable` (`main`)

## Architecture

```
Internet → Nginx :80/:443 → 127.0.0.1:3010 → sendfable-app
                                              ↳ sendfable-postgres (internal)
                                              ↳ sendfable-redis (internal)
                                              ↳ sendfable-worker (BullMQ)
```

- Compose project: `sendfable` (`docker-compose.prod.yml`)
- Postgres/Redis: **no host ports**
- Other VPS sites (gravyblock, rentalnoodle, ticketgravy, plausible) unchanged except shared `nginx -t` + reload

## Deploy / update

```bash
cd /opt/sendfable
git pull --ff-only origin main
docker compose -p sendfable -f docker-compose.prod.yml up -d --build
docker compose -p sendfable -f docker-compose.prod.yml ps
curl -sf http://127.0.0.1:3010/api/health
```

Migrations run on app start (`prisma migrate deploy`).

## Env

- File: `/opt/sendfable/.env` (mode `600`, never commit)
- Launch flags: see `docs/EMAIL_LAUNCH_STATUS_2026-07-29.md` and `docs/FINAL_LAUNCH_ACTIVATION_CHECKLIST.md`
- SES production access **approved** 2026-07-29 (case `178491867800933`) — record in `docs/SES_PRODUCTION_APPROVAL_2026-07-29.md`
- Keep `PLATFORM_SEND_RATE_PER_SEC=5` at launch (AWS account max is 14/sec)
- Do **not** enable SMS env flags on email launch
- Owner bootstrap password: `/root/sendfable-secrets/owner-password.txt` (root-only)

## Nginx

- Site: `/etc/nginx/sites-available/sendfable` (from `deploy/nginx-sendfable.conf`)
- Backups: `/root/nginx-backups/nginx-*.tar.gz`
- Certbot (after DNS is clean — **only** `177.7.38.145` for `@`):

```bash
certbot --nginx -d sendfable.com -d www.sendfable.com --non-interactive --agree-tos --email chris@sendfable.com --redirect
```

## Early launch behavior

- `/signup` → `/early-access`
- Signup API returns 403
- Campaign launch blocked without SES credentials
- `/brand` requires login
