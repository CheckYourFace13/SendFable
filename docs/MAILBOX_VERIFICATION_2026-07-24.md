# Mailbox verification results — 2026-07-24

No DNS changes were made. Owner reported five aliases forwarding successfully;
this pass independently verified DNS/SES/SMTP acceptance.

## DNS / auth (unchanged)

| Check | Result |
|---|---|
| Apex MX | `5 mx1.hostinger.com` / `10 mx2.hostinger.com` |
| Apex SPF | `v=spf1 include:_spf.mail.hostinger.com ~all` |
| Hostinger DKIM | `hostingermail-a/b/c._domainkey.sendfable.com` present (CNAME/TXT to Hostinger) |
| Apex DMARC | `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;` |
| SES domain | `send.sendfable.com` Verified=true, DKIM=SUCCESS |
| SES MAIL FROM | `bounce.send.sendfable.com` SUCCESS |
| SES DKIM CNAMEs | All three tokens still resolve to `*.dkim.amazonses.com` |
| SES production | Still `ProductionAccessEnabled=false` |

## Inbound acceptance (SMTP RCPT)

Against `mx1.hostinger.com` with a valid MAIL FROM:

| Address | RCPT |
|---|---|
| support@sendfable.com | **250** Ok |
| legal@sendfable.com | **250** Ok |
| privacy@sendfable.com | **250** Ok |
| abuse@sendfable.com | **250** Ok |
| security@sendfable.com | **250** Ok |
| random `no-such-…@sendfable.com` | **550** Recipient rejected |

**Catch-all:** not enabled (arbitrary local-parts rejected).

## SES → mailbox probe

Sending from the SES-verified `chris@iscreamstudio.com` identity **to** the five
`@sendfable.com` addresses failed with `MessageRejected` (sandbox: recipients
must be verified). That is expected and does **not** mean Hostinger inbound is
broken — Hostinger SMTP accepts the addresses, and the owner confirmed end-to-end
forwarding from external senders.

## Outbound replies from support@

Not automated (requires Hostinger SMTP credentials, which we do not store).
Owner confirmed replies from `support@sendfable.com` work. SPF/DKIM for Hostinger
outbound remain Hostinger’s responsibility under the existing apex SPF/DKIM.

## Forwarding auth note

Inbound to the aliases + forward to the primary inbox is a Hostinger-side forward.
We did not observe DNS changes that would break SES. SPF/DKIM/DMARC for
**campaign** mail continues to use `send.sendfable.com` / `bounce.send.sendfable.com`
and remains SUCCESS.
