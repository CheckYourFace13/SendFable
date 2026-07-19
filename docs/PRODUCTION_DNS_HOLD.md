# DNS — sendfable.com (GoDaddy)

**Status (2026-07-19):** Partial. VPS A record is live, but **GoDaddy parking A records remain** and block Let’s Encrypt.

## Observed resolution

| Name | Type | Values |
|------|------|--------|
| `@` / `sendfable.com` | A | `177.7.38.145` **and** `15.197.148.33`, `3.33.130.190` |
| `www` | CNAME | `sendfable.com` |

Certbot failed secondary validation against `3.33.130.190` (403 on ACME challenge).

## Required fix (you)

In GoDaddy → DNS:

1. **Delete** the parking A records (`15.197…` and `3.33…`).
2. Leave **only** `@` → `177.7.38.145`.
3. Keep `www` CNAME → `sendfable.com`.

## Do not change

- GoDaddy nameservers
- MX / SPF / DKIM / DMARC / other email authentication records

## After parking records are gone

```bash
dig +short sendfable.com A   # expect only 177.7.38.145
certbot --nginx -d sendfable.com -d www.sendfable.com --non-interactive --agree-tos --email chris@sendfable.com --redirect
```

Then `https://sendfable.com` and Secure auth cookies will work in the browser.
