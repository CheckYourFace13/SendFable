# Production verification — 2026-07-19 (HTTPS live)

## DNS / TLS

| Check | Result |
|-------|--------|
| Authoritative ns05/ns06 A → only `177.7.38.145` | Pass |
| Public resolvers (`8.8.8.8`) → only VPS IP | Pass |
| Certbot LE cert for `sendfable.com` + `www` | Pass (expires 2026-10-17) |
| `https://sendfable.com/` → 200 Next.js | Pass |
| `http://` and `http://www` → `https://sendfable.com/` | Pass |
| `https://www.sendfable.com/` → `https://sendfable.com/` | Pass |

## Stack

| Check | Result |
|-------|--------|
| `sendfable-app` healthy on `127.0.0.1:3010` | Pass |
| `/api/health` app + database + redis ok | Pass |
| `sendfable-worker` listening on BullMQ `campaign-send` | Pass |
| Postgres/Redis not published on host | Pass |
| Plausible + other containers still up | Pass |

## Auth / gates

| Check | Result |
|-------|--------|
| Login `chris@sendfable.com` → session + `/dashboard` 200 | Pass |
| Demo `demo@sendfable.com` / `password123` → no session | Pass |
| Signup API 403 (early launch) | Pass |
| AWS keys empty / Stripe keys empty | Pass |
| App outbox empty; no SES send lines in recent logs | Pass |

## Other sites

| Site | Result |
|------|--------|
| gravyblock.com | HTTPS 200 |
| rentalnoodle.com | HTTPS 200 |
| plausible.rentalnoodle.com | HTTPS 200 |
| Nginx sites-enabled unchanged except sendfable | Pass |

## Notes

- Nginx backup before www→apex change: `/root/nginx-backups/nginx-pre-apex-*`
- Owner temp password remains in `/root/sendfable-secrets/owner-password.txt` — change after first browser login
