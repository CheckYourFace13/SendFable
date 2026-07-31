# Telnyx setup (prepared, not live) — SF-017

**Do not purchase a number, submit a registration, or send a live message until the owner checklist authorizes it.**

Architecture decision: see `docs/SF-017_TELNYX_ISV_ARCHITECTURE.md`.  
Owner credential steps: `docs/SF-017_TELNYX_OWNER_SETUP.md`.

## Credentials

Dedicated Telnyx credentials (never reuse AWS SES keys; never store in the database):

```
TELNYX_API_KEY=
TELNYX_PUBLIC_KEY=
TELNYX_WEBHOOK_SECRET=
TELNYX_MESSAGING_PROFILE_ID=
TELNYX_CONNECTION_ID=
SMS_SENSITIVE_DATA_KEY=
```

Placeholders live in `.env.example`. Real values stay on the VPS only.

## Provider selection

`getSmsProvider()` returns `MockSmsProvider` unless **both** are true:

- `SENDFABLE_SMS_MOCK_PROVIDER_ENABLED=false`
- `SENDFABLE_SMS_LIVE_SENDING_ENABLED=true`

A single mis-set flag cannot reach Telnyx.

## Phase 1 scope

- Plain SMS only (no MMS)
- US destinations only
- Registered US local 10DLC numbers only (toll-free as alternate path later)
- Customer-specific brand + campaign + dedicated number (ISV isolated pattern)
- No international messaging

## Webhook

`POST /api/webhooks/telnyx`

- Returns **404** while `SENDFABLE_SMS_INBOUND_ENABLED=false` (default)
- Signature verification when processing is enabled:
  - **Primary:** Ed25519 (`telnyx-signature-ed25519` + `telnyx-timestamp`) via `TELNYX_PUBLIC_KEY`
  - **Fallback (controlled tests):** HMAC via `TELNYX_WEBHOOK_SECRET`
  - Replay window: 300 seconds
- Handles `message.received` (inbound → inbox / STOP / HELP / usage) and delivery events
- Idempotent via `WebhookEvent` + unique `SmsMessage.providerMessageId`

## Methods locked behind flags

| Method | Flag |
|--------|------|
| `sendMessage` | `SENDFABLE_SMS_LIVE_SENDING_ENABLED` |
| `requestNumber` / `releaseNumber` | `SENDFABLE_SMS_NUMBER_PURCHASE_ENABLED` |
| `submitRegistration` / `getRegistrationStatus` | `SENDFABLE_SMS_REGISTRATION_ENABLED` |

Number purchase and registration currently throw an explicit “prepared but not implemented until authorized” error even when the flag is on, so a flag flip alone cannot buy a number or file a 10DLC registration without a further code change.

## Mock outbox

With the mock provider, outbound messages are written as JSON under `SMS_OUTBOX_DIR` (default: OS temp `sms-outbox/`). Phone numbers in the outbox are redacted.
