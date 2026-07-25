# Pricing revision — 2026-07-25 (five-plan)

Internal record. Not attorney approval. Launch flags unchanged.

## Approved catalog

| Plan | Monthly | Annual | Contacts | Emails/mo |
|---|---|---|---|---|
| Free | $0 | — | Up to 500 | Up to 1,000 |
| Starter | $12 | $120 | Up to 2,500 | Up to 10,000 |
| Growth | $29 | $290 | Up to 10,000 | Up to 40,000 |
| Pro | $69 | $690 | Up to 20,000 | Up to 80,000 |
| Pro Plus | $99 | $990 | Up to 40,000 | Up to 200,000 |

Annual = two months free. Allowances reset each **calendar month** (UTC).

## Seats (code only; not advertised publicly)

| Plan | Seats |
|---|---|
| Free / Starter / Growth | 1 |
| Pro | 5 |
| Pro Plus | 10 |

Team invites remain early-launch / SES constrained — public pricing does not advertise seats.

## Stripe

Use `scripts/stripe-reprice-2026-07.ts` on the live SendFable account only.
Archives legacy $9/$19/$49 prices; creates eight new prices + Pro Plus product.
No payments created.
