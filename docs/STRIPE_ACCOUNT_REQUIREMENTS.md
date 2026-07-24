# Stripe account requirements (Sendfable live)

Inspect via Stripe Account API with the Sendfable **live** secret key only (never Rental Noodle).

## Snapshot (2026-07-24)

| Field | Value |
|-------|-------|
| Account ID | `acct_1Two8SGnw9fPSfu4` |
| Display name | SendFable |
| Country / currency | US / usd |
| `charges_enabled` | true |
| `payouts_enabled` | true |
| `requirements.currently_due` | _(empty)_ |
| `requirements.eventually_due` | _(empty)_ |
| `requirements.past_due` | _(empty)_ |
| `requirements.disabled_reason` | null |
| Statement descriptor | `SENDFABLE` |
| Business URL | SendFable.com |
| Support email (Stripe profile) | _(not set in Stripe business profile yet)_ |
| Support URL (Stripe profile) | _(not set)_ |

Bank / payout destination: present enough for `payouts_enabled=true`; re-check in Dashboard if payouts ever fail.

## Status fields to record on each re-check

| Field | Meaning |
|-------|---------|
| `charges_enabled` | Can accept live charges |
| `payouts_enabled` | Can receive payouts |
| `requirements.currently_due` | Items blocking full activation |
| `requirements.eventually_due` | Future verification items |
| `requirements.past_due` | Overdue items |
| `requirements.disabled_reason` | Why charges/payouts might be disabled |
| External bank account | Payout destination on file |
| Business profile | Public name, support email, URL |
| Statement descriptor | Card statement text |

## Public / legal URLs

- Site: `https://sendfable.com`
- Terms: `https://sendfable.com/terms`
- Privacy: `https://sendfable.com/privacy`
- Refund policy: document on Terms (or linked policy page) before broad public Checkout
- Recommended: set Stripe business-profile support email (e.g. owner support address)

## Ops note

Re-check `requirements.currently_due` after any Stripe Dashboard verification prompts. Do not clear requirements by editing unrelated Stripe accounts.
