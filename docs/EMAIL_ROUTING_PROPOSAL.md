# Sendfable domain email routing — proposal (DO NOT PUBLISH YET)

Prepared: 2026-07-24  
**Status:** Proposal only. No DNS changes have been published in this pass.

## DNS backup

Taken on the VPS before any proposal work:

- `/root/sendfable-dns-backups/sendfable.com-<stamp>.txt`
- `/root/sendfable-dns-backups/www.sendfable.com-<stamp>.txt`
- `/root/sendfable-dns-backups/send.sendfable.com-<stamp>.txt`
- `/root/sendfable-dns-backups/bounce.send.sendfable.com-<stamp>.txt`
- `/root/sendfable-dns-backups/_dmarc.sendfable.com-<stamp>.txt`
- `/root/sendfable-dns-backups/_dmarc.send.sendfable.com-<stamp>.txt`

## Current live state (verified)

| Record | Current value | Notes |
|---|---|---|
| NS | `ns05.domaincontrol.com` / `ns06.domaincontrol.com` | GoDaddy DNS |
| Apex A | `177.7.38.145` | Website — do not change |
| www CNAME | `sendfable.com` | Do not change |
| Apex MX | `5 mx1.hostinger.com` / `10 mx2.hostinger.com` | **Already Hostinger inbound** |
| Apex SPF | `v=spf1 include:_spf.mail.hostinger.com ~all` | Matches Hostinger MX |
| Apex DMARC | `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;` | Present |
| send.sendfable.com DKIM | 3 CNAMEs → `*.dkim.amazonses.com` | SES SUCCESS — do not touch |
| bounce.send.sendfable.com MX | `10 feedback-smtp.us-east-1.amazonses.com` | Custom MAIL FROM — do not touch |
| bounce.send.sendfable.com SPF | `v=spf1 include:amazonses.com ~all` | Do not touch |

**Important:** Apex mail and SES sending are already separated:

- **Inbound customer/support mail** → apex `sendfable.com` via Hostinger MX
- **Outbound campaign/transactional mail** → `send.sendfable.com` (+ MAIL FROM `bounce.send.sendfable.com`) via SES

This is the safest arrangement. Do **not** point apex MX at SES, and do **not** put Hostinger SPF on the SES sending subdomain.

## Recommended approach (no new DNS if Hostinger mailboxes already work)

Because MX and SPF already point at Hostinger, the lowest-risk path is **Hostinger mailbox / alias creation only** — not a DNS redesign.

### Addresses to create in Hostinger Email (hPanel)

Create **aliases or forwarders** (preferred initially) OR full mailboxes:

| Address | Action |
|---|---|
| `support@sendfable.com` | Forward to owner inbox |
| `legal@sendfable.com` | Forward to same owner inbox |
| `privacy@sendfable.com` | Forward to same owner inbox |
| `abuse@sendfable.com` | Forward to same owner inbox |
| `security@sendfable.com` | Forward to same owner inbox |

Suggested destination for all five initially: the owner-controlled inbox you already use for ops (for example the Hostinger or iscreamstudio mailbox you control). Each alias must still receive mail independently (distinct To: addresses) so Stripe and public pages can use the right address.

### DNS changes required for this approach

**None**, if Hostinger already accepts mail for `sendfable.com` under the existing MX.

Confirm in Hostinger hPanel:

1. Domain `sendfable.com` is added under Email
2. Mailboxes/aliases above exist
3. Forwarding target is verified

### DNS changes that would be UNSAFE

| Change | Why unsafe |
|---|---|
| Changing apex A / www | Breaks the website |
| Changing or removing SES DKIM CNAMEs under `send.sendfable.com` | Breaks sending authentication |
| Changing `bounce.send.sendfable.com` MX/TXT | Breaks custom MAIL FROM |
| Replacing apex MX with SES or another provider without Hostinger cutover | Drops inbound mail |
| Adding `include:amazonses.com` to apex SPF without a need | Unnecessary; campaigns send from `send.sendfable.com`, not apex |
| Changing apex DMARC `p=` aggressively during cutover | Can quarantine legitimate Hostinger mail |

### Optional later hardening (not required to open mailboxes)

Only after inbound mail is proven:

1. Keep apex SPF as Hostinger-only while Hostinger is the only apex sender.
2. If you later send mail *from* `@sendfable.com` via SES (not recommended; keep using `send.sendfable.com`), then carefully merge SPF — not needed now.
3. Optionally set apex DMARC `rua=` to `dmarc@sendfable.com` once that alias exists (replacing GoDaddy’s `onsecureserver.net` rua).

## Proposed public-page updates (after mailboxes are proven)

Update contact/legal copy to show:

- Support: `support@sendfable.com` (+ keep `/contact` form)
- Abuse: `abuse@sendfable.com`
- Privacy: `privacy@sendfable.com`
- Legal: `legal@sendfable.com`
- Security: `security@sendfable.com`

Then set Stripe Dashboard → Business details:

- Support email: `support@sendfable.com`
- Support URL: `https://sendfable.com/contact`

## Test plan (after owner confirms Hostinger aliases exist)

1. Send a unique test message to each of the five addresses from an external mailbox.
2. Confirm each arrives in the owner inbox (To: header shows the alias).
3. Reply from the owner inbox and confirm outbound delivery (Hostinger SMTP).
4. Re-check SES identity still SUCCESS (DKIM + MAIL FROM) — no DNS change expected.
5. Re-check website A/AAAA/HTTPS unchanged.
6. Only then update public pages and Stripe fields.

## Owner action required before implementation

1. Confirm you have Hostinger hPanel access for `sendfable.com` email.
2. Confirm the single owner inbox that should receive all five aliases.
3. Explicitly approve: “Create Hostinger aliases/forwarders; no DNS publish.”
4. After aliases exist, reply so inbound tests and public-page updates can proceed.

If Hostinger email is **not** actually provisioned for this domain (MX exists but no email product), say so — the fallback is to enable Hostinger Email for the domain or choose another inbound provider, still without touching SES records.
