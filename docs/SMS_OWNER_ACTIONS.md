# SMS owner actions

Do not ask the owner to do anything Cursor can safely complete.

## 1. Completed automatically by Cursor (this branch)

- Feature branch `feature/sms-product`
- Non-destructive Prisma migration (unified contacts + SMS models)
- Pricing / bundle / margin engines (integer math)
- `SmsProvider` + Mock + flag-locked Telnyx skeleton
- GSM-7 / UCS-2 segment calculator
- Inbound processor (STOP / HELP / inbox / usage / alerts)
- Campaign channel extension + deterministic Email ⇄ Text conversion
- Signup-form presets + CSV import phone/consent handling
- Stripe SMS dry-run setup script + webhook handlers
- Hidden pricing / usage dashboard / inbox / admin UI (server-flag gated)
- `.env.example` placeholders (no real credentials)
- Ten documentation files under `docs/SMS_*.md`
- Comprehensive unit tests + typecheck / prisma validate / build

## 2. Required while waiting for AWS email approval

- Continue monitoring SES case `178491867800933` (owner already submitted additional info)
- Do **not** flip any SMS live / public flags
- Do **not** create live Stripe SMS products
- Do **not** buy a Telnyx number or file 10DLC registration
- Optional: review the SMS pricing and margin assumptions in `SMS_PRICING_AND_MARGIN.md`

## 3. Required after AWS email approval

- Complete the controlled SES production-send test (separate plan; email path)
- Keep SMS flags locked until the SMS-specific steps below are done
- Email launch and SMS launch are independent — SMS does not wait on SES beyond shared-ops caution

## 4. Required before Telnyx registration

- Create a Telnyx account and generate a dedicated API key
- Store `TELNYX_API_KEY` / `TELNYX_WEBHOOK_SECRET` / `TELNYX_PUBLIC_KEY` in the production secret store (not in git, not in the DB)
- Verify actual Telnyx + carrier price sheet against the assumptions in `SMS_PRICING_AND_MARGIN.md`
- Confirm US-local 10DLC is the intended first number type
- Legal review of SMS consent disclosure + Terms/AUP drafts

## 5. Required before Stripe live SMS setup

- Confirm `SENDFABLE_SMS_BILLING_ENABLED` will be set only for the setup window
- Run dry-run: `npm run stripe:sms-setup` and review printed lookup keys / env var names
- Explicitly authorize live creation, then run:
  `npx tsx scripts/stripe-sms-setup.ts --confirm-live-sms-setup`
- Persist the printed price IDs into production env
- Confirm webhook endpoint already covers the SMS events (shared `/api/webhooks/stripe`)

## 6. Required before controlled SMS testing

- Enable only the minimum flags for a mock-first pass (`SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED` etc. as needed for UI)
- Run mock end-to-end: form → contact → campaign estimate → mock send → inbox simulation
- Only then: purchase one owner-controlled US local number, submit registration, enable inbound webhook
- Use owner-controlled destinations only
- Keep `SENDFABLE_SMS_PUBLIC_ENABLED=false`

## 7. Required before public launch

- Carrier registration approved
- Controlled real-number test passed (delivery, STOP, HELP, inbound overage, unsubscribe persistence)
- Stripe SMS products live and webhook-verified
- Legal pages published with SMS sections
- Public pricing cards reviewed
- Monitoring / margin alerts configured
- Set launch flags deliberately:
  - `SENDFABLE_SMS_PUBLIC_ENABLED=true`
  - `SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED=true`
  - `SENDFABLE_SMS_BILLING_ENABLED=true`
  - `SENDFABLE_SMS_ACTIVATION_PURCHASE_ENABLED=true`
  - registration / number / live / inbound / reply as authorized
  - `SENDFABLE_SMS_MOCK_PROVIDER_ENABLED=false` only when live sending is intentional
- Keep emergency kill switches documented and tested
