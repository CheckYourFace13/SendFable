# Legal policy audit & rewrite — 2026-07-25

Internal record of the comprehensive legal-document pass. Not attorney approval.

See also `docs/LEGAL_STATUS.md`.

## Operator

- Treatment **B** (no verified DBA): “SendFable is a service operated by iScream Studio INC”
- DBA registration: **not verified** — do not claim d/b/a
- Governing-law state: **owner confirmation required** (flagged in Terms; no arbitration / class waiver added)

## Documents updated

Terms, Privacy, Acceptable Use, Billing/Refund, Security, Cookies (new), Contact legal-notice line, footer + sitemap links.

## Implementation

- `PolicyAcceptance` additive migration
- Signup checkbox + API recording
- Soft reacceptance banner (does not hard-block owner)
- Checkout `consent_collection` + auto-renewal custom text
- Billing page policy / renewal notice
- Transactional email footer policy links

## Flags

Unchanged: EARLY_LAUNCH=true, ALLOW_PUBLIC_SIGNUP=false, STRIPE_BILLING_ENABLED=false, STRIPE_OWNER_TEST_ENABLED=true, CAMPAIGN_SEND_ENABLED=false, SES_CONTROLLED_TEST_ENABLED=false.
