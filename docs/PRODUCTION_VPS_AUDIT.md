# Production VPS audit — Sendfable

**Date:** 2026-07-19  
**Host:** `root@177.7.38.145` (`srv1624156`)  
**OS:** Ubuntu 24.04.4 LTS (Noble)  
**Method:** Read-only SSH via deploy key `sendfable_vps` + `/tmp/vps-full-audit.sh` / `/tmp/vps-audit-nginx.sh`  
**Secrets:** None recorded.

---

## Verdict

**Safe to proceed with an isolated `/opt/sendfable` Docker Compose deploy**, integrated into the **existing Nginx + Certbot** stack.

Constraints that must be respected:

- Do **not** publish host port **3000** (already used by Gravyblock Next.js).
- Do **not** start Caddy or a second public proxy on 80/443.
- Do **not** publish Postgres/Redis publicly.
- Add a new Nginx site only after DNS points here; obtain cert with Certbot (same pattern as other sites).
- Do not modify existing Nginx sites for gravyblock / rentalnoodle / plausible / ticketgravy except a validated `nginx -t` + reload when adding Sendfable.

**Deployed 2026-07-19** to `/opt/sendfable` (Compose project `sendfable`, Nginx site added after backup). See `PRODUCTION_DEPLOYMENT.md` and `PRODUCTION_VERIFICATION.md`. HTTPS pending clean DNS (parking A records).

---

## Resources

| Resource | Value |
|----------|--------|
| CPU | 2 vCPU |
| RAM | 7.8 GiB total; ~2.4 GiB used; ~5.3 GiB available |
| Swap | none |
| Disk `/` | 96G total; 17G used; **80G avail** (17%) |
| Public IPv4 | `177.7.38.145` |
| Tailscale | Present (`100.114.110.36`, `tailscale0` firewall chains) |

---

## Docker

| Item | Value |
|------|--------|
| Docker Engine | `29.1.3` |
| Docker Compose | `v2.40.3` (plugin) |
| Compose ready | **Yes** |

### Running / existing containers

| Name | Image | Status | Published ports |
|------|-------|--------|-----------------|
| `plausible-plausible-1` | plausible CE v3.2.1 | Up | `127.0.0.1:8000->8000` |
| `plausible-plausible_db-1` | postgres:16-alpine | Up (healthy) | internal 5432 only |
| `plausible-plausible_events_db-1` | clickhouse | Up (healthy) | internal |
| `jesus-orchestrator` | python:3.11-slim | **Exited** | — |

### Compose projects

| Project | Status | Path |
|---------|--------|------|
| `plausible` | running (3) | `/home/deploy/plausible/compose.yml` (+ override) |

### Networks

- `bridge`, `host`, `none`
- `plausible_default`
- `jesus-agent_jesus-network`

### Volumes

- `plausible_db-data`, `plausible_event-data`, `plausible_event-logs`, `plausible_plausible-data`

### Sendfable name conflicts

- **No** containers, networks, or volumes named `sendfable*`
- **`/opt/sendfable` does not exist** (available)

---

## Reverse proxy

| Proxy | Status |
|-------|--------|
| **Nginx** | **Active** — owns `0.0.0.0:80` and `0.0.0.0:443` |
| Caddy | Not active / not the edge proxy |
| Traefik | Not present |

SSL: **Certbot** (Let’s Encrypt) for existing sites. `nginx -t` succeeds.

### Enabled sites (`/etc/nginx/sites-enabled`)

| Site | Domains | Upstream |
|------|---------|----------|
| `default` | `_` | static `/var/www/html` (HTTP default) |
| `gravyblock` | gravyblock.com, www | `http://localhost:3000` + LE cert |
| `rentalnoodle` | rentalnoodle.com, www | `http://localhost:3001` + LE cert |
| `plausible` | plausible.rentalnoodle.com | `http://127.0.0.1:8000` + LE cert |
| `ticketgravy` | ticketgravy.com, www | `http://127.0.0.1:3005` (HTTP vhost present) |

**`sendfable.com` is not configured in Nginx.**

---

## Ports

| Port | Listener | Conflict for Sendfable plan? |
|------|----------|------------------------------|
| 80 / 443 | Nginx (public) | Reuse via **new server block** — do not bind another proxy |
| 3000 | `next-server` cwd `/home/deploy/gravyblock` (public `*:3000`) | **Conflict if Sendfable publishes 3000** — use another host bind, e.g. `127.0.0.1:3010` |
| 3001 | (used by rentalnoodle per nginx) | Avoid |
| 3005 | (used by ticketgravy per nginx) | Avoid |
| 5432 | Host Postgres on **127.0.0.1 only** | OK if Compose Postgres has **no** host publish |
| 6379 | Not listening | OK for private Compose Redis |
| 8000 | Plausible on 127.0.0.1 | Avoid |

---

## Project directories (do not disturb)

- `/opt/ticketgravy`, `/opt/jesus`, `/opt/jesus-agent`, `/opt/containerd`
- `/home/deploy/gravyblock`, `/home/deploy/rentalnoodle`, `/home/deploy/plausible`
- `/home/ubuntu`

---

## Firewall

- `ufw`: **inactive**
- `iptables`: Docker + Tailscale chains; default INPUT ACCEPT / FORWARD DROP (Docker-managed)

---

## Public DNS (external; unchanged by this audit)

| Name | Type | Value |
|------|------|-------|
| sendfable.com | A | `15.197.148.33` (parking) |
| sendfable.com | A | `3.33.130.190` (parking) |
| www.sendfable.com | CNAME | sendfable.com |

Not yet pointing at this VPS.

---

## Recommended Sendfable edge pattern (for later deploy)

1. Compose project `sendfable` in `/opt/sendfable`
2. Publish app only as `127.0.0.1:3010:3000` (or similar unused localhost port)
3. Postgres/Redis: no host ports
4. Worker + Redis on private Docker network
5. New Nginx site `sendfable` → `proxy_pass http://127.0.0.1:3010`
6. After DNS: `certbot --nginx -d sendfable.com -d www.sendfable.com`
7. Backup `/etc/nginx` before edit; `nginx -t` then `systemctl reload nginx`

---

## Actions taken

- Key-based SSH audit only
- Wrote this document

## Actions not taken

- No Compose up, no Nginx edits, no Certbot for sendfable, no DNS changes, no other site restarts
