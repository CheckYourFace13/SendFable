# SMS consent and compliance

**DRAFT — requires owner and legal review before publication. Not attorney-approved.**

## Independent channels

- Email permission (`Contact.status`, email suppressions) is independent of SMS permission (`Contact.smsStatus`, `SmsSuppression`).
- A phone number on file never grants SMS marketing permission.
- Email consent never grants SMS consent.
- STOP suppression is keyed by workspace + number and **survives contact deletion and reimport**.

## SMS statuses

`NOT_PROVIDED` · `PENDING_CONSENT` · `SUBSCRIBED` · `OPTED_OUT` · `INVALID` · `BLOCKED`

## Forms

- Presets: Email Signup · Text Signup · Email and Text Signup
- SMS consent checkbox is **never prechecked**
- Exact disclosure text + version (`sms-consent-2026-07-26`) stored with the opt-in event
- A user entering both email and phone may grant email only, text only, or both

## Imports

Phones are never auto-subscribed. Batch modes:

- `none` — store phone without SMS permission
- `explicit-fields` — honor row-level consent columns
- `documented-source` — batch-level source + date
- `owner-attestation` — stored attestation text

An import can never override STOP suppression. Only a documented **new** opt-in restores permission.

## STOP / HELP

Opt-out (case-insensitive, trimmed): `STOP`, `STOPALL`, `UNSUBSCRIBE`, `CANCEL`, `END`, `QUIT`.

HELP / INFO returns the workspace's configured support information when live handling is enabled.

Compliance responses are never blocked by consent state or inbound-allowance overage. Segments still count toward provider cost and the allowance.

## Topics the published legal updates must cover (drafts)

Prepare (do **not** publish until owner/legal review):

- Separate SMS consent; customer responsibility for permission
- No purchased or scraped phone lists
- STOP and HELP
- Carrier registration; rejection or delay; no guarantee of activation approval
- Per-segment billing; multi-segment / Unicode behavior
- Included incoming allowance + $0.025 overage
- $99 standard activation fee vs. exceptional third-party charges (customer approval required)
- Dedicated number ownership and release
- Prohibited content; carrier penalties
- Data retention / privacy; SMS inbox; email notifications for replies
- Usage monitoring; suspension rights
- No guarantee of delivery

Draft location suggestion for the later legal pass: `docs/legal-drafts/` (not created in this phase to avoid implying publication). Reference this document from the Terms/Refund update PR when SMS goes public.
