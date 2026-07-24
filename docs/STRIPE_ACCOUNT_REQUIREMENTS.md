# Stripe account requirements (Sendfable live)

Inspect via Stripe Account API with the Sendfable **live** secret key only (never Rental Noodle).

## Status fields to record

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
- Support: use the address configured in Stripe business profile / Sendfable support channel
- Refund policy: document on Terms (or linked policy page) before broad public Checkout

## Ops note

Re-check `requirements.currently_due` after any Stripe Dashboard verification prompts. Do not clear requirements by editing unrelated Stripe accounts.
