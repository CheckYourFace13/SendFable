# SMS feature flags

Every SMS surface checks these **server-side**. Hiding a button is not a sufficient safety control.

| Flag | Default | Effect when false |
|------|---------|-------------------|
| `SENDFABLE_SMS_CODE_ENABLED` | `true` | SMS code paths treated as unavailable |
| `SENDFABLE_SMS_PUBLIC_ENABLED` | `false` | Public pricing/marketing components render nothing |
| `SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED` | `false` | No text plan selection, no text-only signup path, customer SMS pages 404, text forms/campaigns 403 |
| `SENDFABLE_SMS_BILLING_ENABLED` | `false` | No Stripe SMS subscription writes; setup script refuses live mode |
| `SENDFABLE_SMS_ACTIVATION_PURCHASE_ENABLED` | `false` | No $99 activation charge |
| `SENDFABLE_SMS_REGISTRATION_ENABLED` | `false` | No carrier registration submission |
| `SENDFABLE_SMS_NUMBER_PURCHASE_ENABLED` | `false` | No phone-number purchase / release via provider |
| `SENDFABLE_SMS_LIVE_SENDING_ENABLED` | `false` | No live Telnyx send calls |
| `SENDFABLE_SMS_INBOUND_ENABLED` | `false` | Telnyx webhook returns 404; no conversation activation |
| `SENDFABLE_SMS_REPLY_ENABLED` | `false` | Inbox replies cannot send |
| `SENDFABLE_SMS_ADMIN_ENABLED` | `true` | Owner SMS admin area available (still platform-owner gated) |
| `SENDFABLE_SMS_MOCK_PROVIDER_ENABLED` | `true` | Mock provider is the default |

Module: `src/lib/sms/flags.ts`. Snapshot available from `GET /api/admin/sms`.

## With public + live flags at defaults

- Existing users cannot see SMS pricing
- New users cannot select a text plan
- No text-only public signup path appears
- No Stripe SMS subscription can be started
- No activation fee can be charged
- No registration can be submitted
- No phone number can be purchased
- No external SMS provider request can be made
- No real inbound webhook can activate a conversation
- Existing email behavior remains unchanged
