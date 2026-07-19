# DNS hold — sendfable.com (GoDaddy)

**Status:** Hold. Do not change DNS for a Docker deploy until a Docker-capable VPS IP is confirmed.

See `PRODUCTION_VPS_AUDIT.md`.

## Current public DNS (observed 2026-07-19)

| Name | Type | Value |
|------|------|-------|
| `@` / `sendfable.com` | A | `15.197.148.33` |
| `@` / `sendfable.com` | A | `3.33.130.190` |
| `www` | CNAME | `sendfable.com` |

These look like GoDaddy parking/forwarding targets, **not** the Hostinger shared host (`145.223.122.174`).

## Do not change

- GoDaddy nameservers
- MX records
- SPF / DKIM / DMARC / other email-related TXT/CNAME records
- Any existing Hostinger or third-party email authentication records

## When you have a Docker VPS IPv4 (`VPS_IPV4`)

In GoDaddy → sendfable.com → DNS:

### 1. Root A record

- **Type:** A  
- **Name:** `@`  
- **Value:** `VPS_IPV4` (exact address from the VPS provider)  
- **TTL:** default / 1 hour  

If two parking A records exist (`15.197…` and `3.33…`), **edit/replace them** so only the VPS A record remains for `@`. Do not leave parking A records alongside the VPS IP.

### 2. WWW

- **Type:** CNAME  
- **Name:** `www`  
- **Value:** `sendfable.com`  
- **TTL:** default  

(Already present — keep it.)

### 3. Optional later (not now)

- `send.sendfable.com` SES / DKIM records — only when Amazon SES is approved  
- Stripe / other vendor CNAMEs — only when billing is enabled  

## Verification after you change DNS

From your PC:

```powershell
Resolve-DnsName sendfable.com -Type A
Resolve-DnsName www.sendfable.com
```

Expect `@` → your VPS IPv4 only. Then tell the agent to continue Phase 6+.

## If staying on Hostinger shared hosting instead

Do **not** use the Docker A-record plan above until the domain is added in Hostinger hPanel and Hostinger shows the correct target (often the same shared IP or their panel instructions). Architecture must be approved first (`PRODUCTION_VPS_AUDIT.md` Option B).
