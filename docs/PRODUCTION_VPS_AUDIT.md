# Production host audit — Sendfable

**Date:** 2026-07-19  
**Method:** SSH read-only inspection from the Cursor session (no installs, no DNS changes, no service restarts).  
**Secrets:** None recorded in this document.

---

## Executive verdict

**Safe Docker deployment to `/opt/sendfable` is not possible on the host currently reachable via SSH.**

The only working SSH target is Hostinger **shared / CloudLinux** hosting (`us-bos-web1914.main-hosting.eu`), not a root-capable VPS with Docker. Deployment of Postgres, Redis, a dedicated worker, and an isolated Compose project as specified would require a different machine (or an explicitly approved alternative architecture).

**Deployment is stopped at Phase 1 / Phase 5 (DNS hold).** No containers were created. No reverse proxy was changed. No other websites were interrupted.

---

## SSH target inspected

| Field | Value |
|-------|--------|
| Host | `145.223.122.174` |
| SSH port | `65002` |
| Hostname | `us-bos-web1914.main-hosting.eu` |
| User | `u703718100` (non-root) |
| Auth used | Existing deploy key (`outbreakthreat_deploy`) already authorized for this account |
| Public IPv4 observed | `145.223.122.174` |

Alternate IP in local `known_hosts` (`145.223.77.38:65002`) rejected this key (`Permission denied`).

---

## System profile

| Check | Result |
|-------|--------|
| Kernel | Linux 5.14.0-…el9_7.x86_64 (RHEL/CloudLinux 9 family) |
| `/etc/os-release` | Not readable in cageFS environment |
| Privilege | Unprivileged user; **no sudo** |
| `/opt` | **Read-only** — cannot create `/opt/sendfable` |
| Docker | **Not installed** / not available to this user |
| Docker Compose | **Not available** |
| Node (login shell PATH) | Not on PATH for non-interactive shell (Hostinger Node apps use selector / app-specific runtimes) |
| Existing Node processes | Multiple `next-server` instances for other domains (do not touch) |

Host memory/disk numbers reported by `free`/`df` reflect the **shared physical host**, not a dedicated VPS allocation. Treat this as multi-tenant Hostinger hosting.

---

## Existing websites / projects (do not interrupt)

Under `~/domains/` (observed):

- `outbreakthreat.com`
- `micstage.com`
- `leaguepour.com`
- `boatingchicago.com`
- `iscreamstudio.com`
- `plg.iscreamstudio.com`
- `seestew.com`
- Hostinger staging hostnames (`*.hostingersite.com`)

**No `sendfable.com` domain folder exists yet** on this account.

---

## Reverse proxy / ports

| Check | Result |
|-------|--------|
| User-controlled Caddy / Nginx / Traefik | Not present as a user-managed reverse proxy |
| Ports 80 / 443 | Owned by Hostinger’s shared web stack (not controlled by this Unix user) |
| Ports 3000 / 5432 / 6379 | Not exposed as user-owned listeners in a way compatible with Docker Compose |
| Firewall management | Not available to this user (`iptables` not present) |

Hostinger terminates HTTPS for domains attached in hPanel. A competing Caddy container binding `:80`/`:443` is **not** an option on this account.

---

## Current public DNS for `sendfable.com` (external lookup)

Queried from the operator workstation (no DNS changes made):

| Name | Type | Value | Notes |
|------|------|-------|-------|
| `sendfable.com` | A | `15.197.148.33` | GoDaddy parking / forwarding anycast-style target |
| `sendfable.com` | A | `3.33.130.190` | Same |
| `www.sendfable.com` | CNAME | `sendfable.com` | Already present |
| SOA | — | GoDaddy (`dns.jomax.net`) | Nameservers appear to remain at GoDaddy |

These A records do **not** point at `145.223.122.174`. Pointing them there prematurely would not produce a working Docker deployment on shared hosting.

---

## Conflict with requested deployment model

Requested model:

- Isolated directory `/opt/sendfable`
- Docker Compose project `sendfable` with app, worker, Postgres, Redis
- Dedicated network/volumes; Redis required for worker
- Respect existing reverse proxy on 80/443 or add Caddy

Actual host:

- Cannot write `/opt`
- No Docker
- Shared reverse proxy / Node hosting model (same class as OutbreakThreat deploy)
- Existing customer sites must remain untouched

**Therefore:** continuing Phase 2–7 as written would either fail or risk unsafe workarounds. Per instructions, stop and escalate.

---

## Safe paths forward (choose one)

### Option A — Dedicated VPS with Docker (matches the written plan)

Provide SSH access to a root (or docker-capable) VPS where:

- Docker Engine + Compose are installed (or installable)
- `/opt/sendfable` is writable
- Ports 80/443 are free **or** an existing proxy can add a vhost without breaking other sites

Then:

1. Re-run this audit on that VPS
2. Add GoDaddy **A** `@` → that VPS IPv4 (keep MX/SPF/DKIM/DMARC untouched)
3. Keep/adjust **CNAME** `www` → `sendfable.com`
4. Proceed with Compose + Caddy/proxy, Redis worker, SES/Stripe still blank

### Option B — Hostinger shared Node (different architecture; needs approval)

Only if you explicitly accept a non-Docker design:

1. Add `sendfable.com` in Hostinger hPanel to this account
2. Use Hostinger Node.js app + **managed** Postgres + **managed** Redis (or external providers)
3. Run worker as a second long-running process if Hostinger allows it
4. Point DNS only after the Node app is attached

This is **not** the Compose layout in the request and needs a revised ops doc before implementation.

---

## DNS hold — do not change yet for Docker

Until Option A’s VPS IP is confirmed (or Option B is approved and the Hostinger domain is attached):

- **Do not** change GoDaddy nameservers
- **Do not** delete MX / SPF / DKIM / DMARC / email records
- **Do not** point `@` at `145.223.122.174` expecting Docker Compose to work

See the final response for the **provisional** GoDaddy records to use once the correct target IP is known.

---

## Actions taken during this audit

- SSH connect (read-only commands)
- External DNS lookup for `sendfable.com` / `www`
- Wrote this document

## Actions **not** taken

- No package installs
- No Docker pull/build
- No DNS edits
- No reverse-proxy edits
- No stops/restarts of existing Node apps
- No secrets created on the server
- No real email / SES / Stripe activity
