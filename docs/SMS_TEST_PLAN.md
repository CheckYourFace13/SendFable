# SMS test plan

## Automated (this branch)

Run: `npm test` · `npm run typecheck` · `npx prisma validate` · `npm run build`

Coverage added under `src/lib/__tests__/`:

- `sms-pricing.test.ts` — catalog, every bundle matrix cell, inbound allowance, integer math
- `sms-segments.test.ts` — GSM-7, extended GSM, concat, UCS-2, emoji, merge-field per-recipient totals
- `sms-core.test.ts` — STOP/HELP, consent transitions, phone normalize/redact, inbound split, convert, mock provider, margin warnings, flag defaults, USD→micros

Existing email/auth/billing/legal regression suites remain and must stay green.

## Manual / later (not run in this phase)

### Contacts

- Existing email-only contacts migrate successfully
- Phone-only / email-only / both / neither-rejected
- Duplicate email, duplicate phone, split-identity conflict
- SMS opt-out persistence across delete + reimport; documented re-opt-in

### Campaigns

- Email only / Text only / Both
- Mixed audience; phone-only vs email-only recipients
- Existing email campaign regression
- Converted drafts never auto-send

### Incoming

- Included allowance boundary + first overage segment
- Multi-segment inbound
- STOP / HELP / ordinary reply / unknown number
- Duplicate webhook
- Excessive inbound warning

### Billing

- Every SMS plan + outbound rate
- Activation + exceptional charge approval flow
- Bundle eligibility changes (upgrade / downgrade / failure / cancel)
- No duplicate usage on webhook replay
- Stripe dry-run script output review

### Safety

- Public flag false hides all SMS customer-facing pages
- Signup / billing / registration / number / live / inbound / reply flags block their surfaces
- Mock provider works; zero real provider / Stripe / SES SMS side effects

## Explicitly NOT executed in this phase

- Live Stripe product creation
- Telnyx registration or number purchase
- Any real SMS send
- Any real email send beyond local outbox paths already used by the app
- Production deploy or merge to `main`
