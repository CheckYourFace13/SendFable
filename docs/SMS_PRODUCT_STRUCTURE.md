# SMS product structure

**Status:** Backend prepared on `feature/sms-product`. Invisible and inert while SMS public/live flags are off. Independent of the pending AWS SES production-access case.

## Product modes

SendFable supports:

1. **Email-only** customers (existing behavior, unchanged)
2. **Text-only** customers (SMS subscription, no email plan required)
3. **Combined** customers (email plan + SMS plan on the same workspace)

Every account still needs a login + billing email. That login email is separate from the marketing audience.

Shared across email and SMS:

- Contacts, tags, segments
- Signup forms
- Campaign workspace + scheduling
- Analytics shell
- Account access + billing account

Independent:

- Delivery (SES for email, Telnyx for SMS)
- Permission / consent / suppression
- Subscriptions and usage metering
- Quotas and ramp rules

## Plan catalog (fixed fees)

| Plan | Monthly | Outbound / segment | Included inbound / month | Inbound overage |
|------|---------|--------------------|--------------------------|-----------------|
| Text Entry | $19.99 | $0.05 | 100 | $0.025 |
| Text Essentials | $49.99 ($44.99 bundled) | $0.035 | 300 | $0.025 |
| Text Advantage | $99.99 ($89.99 bundled) | $0.025 | 750 | $0.025 |

Bundle discount: **10% off the fixed monthly SMS fee only**, when the workspace has an **active Growth, Pro or Pro Plus** email plan. Free and Starter do not qualify. Text Entry is never discounted. Usage, overage, activation and exceptional charges are never discounted.

## Activation

- **$99 one-time** Text Messaging Activation fee
- Covers ordinary onboarding, standard brand/campaign registration prep, dedicated-number setup
- Does **not** guarantee carrier approval
- Does **not** silently absorb enhanced vetting, toll-free verification, special number types, customer-caused rejections, resubmissions, penalties, expedited review, international registration, or other exceptional third-party charges
- Exceptional charges are owner/admin-created and require **customer approval** before invoicing

## Architecture layers

```
UI (flag-gated) ──► API routes (flag-gated) ──► SMS domain libs
                                              ├── pricing / bundle
                                              ├── segments (GSM-7 / UCS-2)
                                              ├── consent / STOP / HELP
                                              ├── usage ledger
                                              ├── margin report
                                              └── SmsProvider
                                                   ├── MockSmsProvider (default)
                                                   └── TelnyxSmsProvider (flag-locked)
```

Source of truth modules:

- `src/lib/sms/pricing.ts` — catalog + bundle engine (integer cents/micros)
- `src/lib/sms/flags.ts` — server-side feature flags
- `src/lib/sms/provider.ts` + `mock-provider.ts` + `telnyx-provider.ts`
- `src/lib/sms/usage.ts` — ledger + monthly rollups
- `src/lib/sms/stripe.ts` — SMS Stripe mapping + webhook handlers
- Prisma models under the SMS section of `prisma/schema.prisma`

## Contacts

A contact may have email only, phone only, or both. At least one is required (DB check constraint). Email permission (`Contact.status`) and SMS permission (`Contact.smsStatus`) are independent. A phone number on file never implies SMS consent.

## Campaigns

One primary action: **Create Campaign**, with channel `EMAIL` | `SMS` | `BOTH`. Existing email campaigns continue to work unchanged. SMS content lives in `sms*` fields; the SES pipeline is untouched.

## Inbox

Incoming replies appear in `/inbox` (flag-gated). The business replies from SendFable. Replies are outbound SMS billed at the plan's outbound rate. No default forwarding of inbound SMS to the owner's personal phone.

## Related docs

- [SMS_PRICING_AND_MARGIN.md](./SMS_PRICING_AND_MARGIN.md)
- [SMS_BILLING_ARCHITECTURE.md](./SMS_BILLING_ARCHITECTURE.md)
- [SMS_FEATURE_FLAGS.md](./SMS_FEATURE_FLAGS.md)
- [SMS_OWNER_ACTIONS.md](./SMS_OWNER_ACTIONS.md)
