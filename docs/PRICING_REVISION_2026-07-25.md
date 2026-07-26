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

## Campaign-footer badge (boolean — not a seat count)

| Plan | `badge` | Public / footer meaning |
|---|---|---|
| Free | `true` | “Sent with SendFable” required |
| Starter | `false` | No platform badge |
| Growth | `false` | No platform badge |
| Pro | `false` | No platform badge |
| Pro Plus | `false` | No platform badge |

**Post-pricing note (2026-07-25):** an earlier readiness report row “Pro Plus — Badge: Up to 10” was a **report-column typo** (seat allowance mislabeled as badge). Authoritative catalog `PLANS.PRO_PLUS.badge === false`; seats remain internal (`seats: 10`). “Up to 10” must never appear as a badge, footer label, pricing badge, or campaign-email string.

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
