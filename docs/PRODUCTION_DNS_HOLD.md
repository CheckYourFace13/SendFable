# DNS — sendfable.com (GoDaddy)

**Status (2026-07-19):** Clean. Authoritative + public resolvers return only `177.7.38.145`. HTTPS issued.

## Current records (intent)

| Name | Type | Value |
|------|------|-------|
| `@` | A | `177.7.38.145` |
| `www` | CNAME | `sendfable.com` |

## Resolved issue

A second root A record labeled **Parked** (`15.197.148.33` / `3.33.130.190`) was still published by GoDaddy nameservers even when easy to miss in the UI. Deleting **A @ → Parked** cleared authoritative DNS. Do not re-enable Domain Forwarding or Parked.

## Do not change

- GoDaddy nameservers
- MX / SPF / DKIM / DMARC / other email authentication records
