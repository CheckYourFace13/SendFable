# Production verification — 2026-07-19

## Stack

| Check | Result |
|-------|--------|
| `sendfable-app` healthy on `127.0.0.1:3010` | Pass |
| `/api/health` → database + redis ok | Pass |
| `sendfable-worker` listening on BullMQ `campaign-send` | Pass |
| Postgres/Redis not published on host | Pass |
| Plausible / other containers still up | Pass |

## App gates

| Check | Result |
|-------|--------|
| `EARLY_LAUNCH=true` | Pass |
| Signup API 403 | Pass |
| `/signup` → `/early-access` | Pass |
| `/brand` → login | Pass |
| AWS / Stripe keys blank | Pass |
| Owner `chris@sendfable.com` created + 12 platform templates | Pass |

## Nginx

| Check | Result |
|-------|--------|
| Backup under `/root/nginx-backups/` before change | Pass |
| `sendfable` site enabled; gravyblock/rentalnoodle/plausible/ticketgravy still present | Pass |
| `nginx -t` + reload | Pass |
| Host `sendfable.com` → Next.js homepage | Pass |
| Other Host headers still redirect to their HTTPS sites | Pass |

## DNS / TLS (blocker)

| Check | Result |
|-------|--------|
| A record includes `177.7.38.145` | Pass |
| Parking A records `15.197.148.33` + `3.33.130.190` still present | **Fail — must remove** |
| Certbot HTTP-01 for sendfable.com + www | **Failed** (LE secondary validation hit parking IP → 403) |
| Public `https://sendfable.com` | **Blocked until parking A records removed + certbot rerun** |

HTTP works when the request hits this VPS (`Host: sendfable.com` → `177.7.38.145`). Auth cookies are `Secure`, so browser login expects HTTPS after cert issuance.

## Screenshots

Full browser screenshots of the public HTTPS site are deferred until TLS is issued. Smoke HTML confirmed titles:

- Homepage serves Next.js Sendfable marketing
- `/early-access` title: `Early access · Sendfable`
