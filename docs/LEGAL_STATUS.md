# Legal & policy status

Updated 2026-07-24.

## Public documents (live)

| Document | Route | Covers |
|---|---|---|
| Terms of Service | `/terms` | eligibility, acceptable use summary, suspension/termination, service disclaimer, billing summary, customer content/data, IP, limitation of liability, change notification, contact |
| Privacy Policy | `/privacy` | data collected, use, cookies (first-party only), recipient rights, subprocessors (AWS SES, Stripe, host), retention, export/deletion/access requests, security, changes |
| Acceptable Use & Anti-Spam | `/acceptable-use` | permission-based sending, purchased/scraped list prohibition, required footer address + unsubscribe, bounce/complaint thresholds, prohibited content, enforcement, abuse reporting |
| Billing, Renewal, Cancellation & Refund | `/refund-policy` | auto-renewal, monthly/annual, prorated upgrades, downgrades, cancellation vs refund, failed payments, refund eligibility + non-refundable cases, refund timing, data after cancellation |
| Contact & support | `/contact` | working DB-backed support form (topics: general, billing, privacy, abuse, security, legal) |

Signup and checkout link to Terms/Privacy; footer links to all documents.

## Honesty constraints followed

No guarantees are made about inbox placement, uninterrupted uptime, legal
compliance on the customer's behalf, or perfect security.

## ⚠️ Requires qualified legal review

These documents were completed **technically**, not by a lawyer. Before
removing early-access language and promoting publicly, have counsel review:
governing law/venue (currently unspecified), the operator identity wording
("iScream Studio"), refund terms enforceability, GDPR/CASL applicability, and
the limitation-of-liability clause.

## Open owner items

- `sendfable.com` has **no MX records** — no support/legal/privacy mailbox
  exists. The contact form works (DB-backed), but Stripe's support-email field
  and email-based legal notices need a real mailbox (e.g. add email routing
  for `sendfable.com`).
- Acceptance recording: signup requires agreeing to Terms; Stripe Checkout
  displays terms via the business profile. Explicit timestamped
  acceptance records are a post-launch improvement.
