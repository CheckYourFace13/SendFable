# SMS billing architecture

## Independence from email Plan

SMS is **not** folded into the existing `Plan` enum. Models:

- `SmsSubscription` — plan, status, base/applied monthly cents, bundle fields, Stripe ids
- `SmsActivation` — $99 one-time fee lifecycle
- `SmsUsageLedger` — append-only per-event charges (idempotent)
- `SmsMonthlyUsage` — UTC calendar-month rollup (`YYYY-MM`)
- `SmsExceptionalCharge` — approval-gated passthrough charges

Email billing (`User.plan`, existing Checkout / Portal / webhooks) is unchanged. The shared Stripe webhook route dispatches SMS events when an SMS price id is present; otherwise it keeps the existing email path.

## When outbound is billed

**Bill on provider acceptance.**

Rationale: Telnyx bills messages it accepts. An accepted-but-undelivered outbound message is therefore billable to the customer. A failure before acceptance is not. Delivery webhooks update status / reconcile actual provider cost but do not invent a second customer charge. Idempotency keys (`out:<key>` on the ledger) collapse retries.

## When inbound is billed

Incoming segments are counted toward the plan's included allowance for the UTC calendar month. Charge = `max(0, monthlyInbound − included) × $0.025`. STOP and HELP count toward provider cost and the allowance; compliance handling is never blocked because the customer exceeded the allowance.

## Metering model (Stripe)

Uses the **current Billing Meters** model supported by `stripe@16` / API `2024-06-20`:

- Meter `sms_outbound_segments`
- Meter `sms_inbound_overage_segments` (overage only — included allowance is never reported)
- Per-plan metered prices bound via `price.recurring.meter`

**Not** the deprecated per-subscription-item usage-record API.

Setup script: `npx tsx scripts/stripe-sms-setup.ts` (dry-run by default; live requires `--confirm-live-sms-setup` **and** `SENDFABLE_SMS_BILLING_ENABLED=true`).

## Bundle recalculation

`recalcSmsBundle(workspaceId)` runs after any email-plan change (upgrade, downgrade, cancellation, payment failure, webhook replay). DB state always updates. The live Stripe price swap with `proration_behavior: create_prorations` only runs when SMS billing is enabled. SMS service is never cancelled by an email-plan change.

## Wallet / prepaid

**Not used.** No stored messaging balance. Customers are billed the fixed fee + metered usage + approved exceptional charges.

## Public disclosure surfaces (when public flag is on)

- Pre-purchase disclosure component
- Checkout summary
- Billing settings + `/billing/sms` usage dashboard
- Terms / activation agreement (drafts — see legal doc)
- Allowance alerts at 75% / 90% / 100% of included inbound
