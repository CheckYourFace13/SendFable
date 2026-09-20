# SMS public flag ladder (customer readiness)

Do **not** set `SENDFABLE_SMS_PUBLIC_ENABLED=true` until every prior rung is green.
Defaults are safe (public off). Owner approval is required for the final flip.

## Ordered enablement

| Order | Flag | Purpose | Gate before enabling |
|------:|------|---------|----------------------|
| 1 | `SENDFABLE_SMS_CODE_ENABLED` | Compile/load SMS code | Always on in normal deploys |
| 2 | `SENDFABLE_SMS_ADMIN_ENABLED` | Admin/owner surfaces | Ops can review compliance |
| 3 | `SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED` | Customer Text setup UI | Setup wizard + claim_number work |
| 4 | `SENDFABLE_SMS_BILLING_ENABLED` | Stripe SMS subscription writes | Live SMS catalog + webhook regression |
| 5 | `SENDFABLE_SMS_ACTIVATION_PURCHASE_ENABLED` | Activation fee Checkout | Activation price ID live |
| 6 | `SENDFABLE_SMS_REGISTRATION_ENABLED` | Carrier/TCR submit | Legal + brand accuracy |
| 7 | `SENDFABLE_SMS_NUMBER_PURCHASE_ENABLED` | Customer number claim | choose_number E2E |
| 8 | `SENDFABLE_SMS_LIVE_SENDING_ENABLED` | Live provider send | Mock off intentional |
| 9 | `SENDFABLE_SMS_INBOUND_ENABLED` | Inbound webhooks | HELP/STOP verified |
| 10 | `SENDFABLE_SMS_REPLY_ENABLED` | Business replies | Reply billing understood |
| 11 | `SENDFABLE_SMS_MOCK_PROVIDER_ENABLED=false` | Real provider | Only with live sending |
| 12 | `SENDFABLE_SMS_PUBLIC_ENABLED` | Marketing + public pricing | All above + legal + second-tenant E2E |

## Customer number step

After approval (`choose_number`), the app calls `POST /api/sms/setup` with `action: "claim_number"` and optional `areaCode`. Requires `NUMBER_PURCHASE` **or** pilot `numberPurchaseUnlocked`.

## Kill switches

Set any live flag to `false` to halt that surface. Prefer turning off `LIVE_SENDING` / `PUBLIC` first during incidents.
