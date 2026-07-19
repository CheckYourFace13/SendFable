# DNS records for `send.sendfable.com` (example)

Replace with your real `PLATFORM_SEND_DOMAIN`. Exact DKIM names/values come from the SES console after you create the domain identity.

## DKIM (required)

Three CNAMEs, typically like:

- `xxxxxxxx._domainkey.send.sendfable.com` → `xxxxxxxx.dkim.amazonses.com`
- (×3 tokens from SES)

## SPF

On the sending subdomain TXT (or include in existing SPF carefully):

```
v=spf1 include:amazonses.com -all
```

## Custom MAIL FROM (recommended)

If you configure a MAIL FROM domain in SES (e.g. `mail.send.sendfable.com`), publish the MX/TXT records SES shows so SPF can align.

## DMARC

On `_dmarc.send.sendfable.com` or the parent org domain (choose intentionally):

```
v=DMARC1; p=quarantine; rua=mailto:dmarc@YOUR_ORG_DOMAIN; fo=1
```

Start with `p=none` for monitoring if you are unsure, then tighten.

## Customer custom domains

Growth+ users add their own domain in **Settings → Senders**. They paste three DKIM CNAMEs SES returns; Sendfable polls verification via Check DNS.
