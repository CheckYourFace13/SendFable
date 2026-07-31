# SF-017 — Customer registration requirements

Customer-specific 10DLC (or toll-free) onboarding fields for SendFable workspaces.  
Aligned with Telnyx brand/campaign APIs and hosted in `SmsComplianceProfile` (SF-017).

## Required fields (standard US business)

| Field | Notes |
|-------|--------|
| Workspace ID | Tenant scope |
| Legal entity name | Exact IRS / formation match |
| DBA / brand display name | Shown to consumers / carriers |
| EIN or BRN | Encrypted at rest (`einBrnCiphertext`) |
| Entity type | `PRIVATE_PROFIT`, `PUBLIC_PROFIT`, `NON_PROFIT`, `GOVERNMENT`, `SOLE_PROPRIETOR` |
| Registration country | Usually `US` |
| Business address | street, city, state, postal, country |
| Website | Live site matching brand |
| Support email / phone | For HELP |
| Industry vertical | Telnyx vertical enum |
| SMS use case | e.g. Marketing / Mixed / Customer Care |
| Estimated monthly volume | Throughput / use-case honesty |
| Opt-in description | How **end users** consent |
| Opt-in form URL | Public form |
| Opt-in evidence | Screenshot / attestation URL |
| Privacy Policy URL | Separate link |
| SMS Terms URL | Separate link |
| Sample messages (2+) | Real traffic samples |
| HELP response | Brand-specific |
| STOP response | Brand-specific |

## Provider linkage (after approval — future)

| Field | Notes |
|-------|--------|
| Brand ID | TCR / Telnyx |
| Campaign ID | |
| Number ID | Dedicated number |
| Status / rejection reason / dates | |
| Provider account relationship | upstream / downstream / native |
| Fee records | brand / vetting / campaign / number micros |

## Sole proprietor differences

- No EIN; OTP identity verification
- Limits: 1 campaign, 1 number, low throughput
- Collect personal name + mobile for OTP

## Nonprofit differences

- `NON_PROFIT` + EIN; legal name must match IRS exempt org records

## Security / retention

- EIN encrypted with `SMS_SENSITIVE_DATA_KEY`; never log full EIN (`redactEin`)
- Workspace isolation; owners/admins + SendFable compliance only
- Audit via `AuditLog` on submit/approve/reject (when UI ships)
- `retentionHoldUntil` for legally required retention after cancellation
- **Never** store Telnyx API keys in DB

## Consent form requirements (product)

- SMS consent **optional**, separate from email, **never prechecked**
- End-business brand named in disclosure
- Frequency, message/data rates, STOP, HELP, Privacy + SMS Terms links
- Mobile info not sold for third-party marketing
- Imports never imply consent (`smsConsentMode=none` default)

Hosted forms inject the SMS checkbox when a phone field is present (SF-017 fix).
