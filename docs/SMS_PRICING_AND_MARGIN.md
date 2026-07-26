# SMS pricing and margin

**Source of truth in code:** `src/lib/sms/pricing.ts`, `src/lib/sms/margin.ts`, `src/lib/sms/mock-provider.ts` (`MOCK_PROVIDER_COSTS`).

All customer money uses **integer cents** (fixed fees) or **integer micros** (per-segment amounts; 1 USD = 1,000,000 micros). Never floating-point currency math.

## Customer plans

### Text Entry

- Monthly fee: **$19.99** (`1999` cents)
- Outbound: **$0.05** / segment (`50_000` micros)
- Included inbound: **100** segments / UTC calendar month
- Inbound overage: **$0.025** / segment
- Bundle discount: **never**

### Text Essentials

- Monthly fee: **$49.99** (`4999` cents)
- Bundled monthly fee: **$44.99** (`4499` cents) — owner-specified billed amount
- Outbound: **$0.035** / segment (`35_000` micros)
- Included inbound: **300**
- Inbound overage: **$0.025** / segment

### Text Advantage

- Monthly fee: **$99.99** (`9999` cents)
- Bundled monthly fee: **$89.99** (`8999` cents)
- Outbound: **$0.025** / segment (`25_000` micros)
- Included inbound: **750**
- Inbound overage: **$0.025** / segment

## Bundle-discount rules

Qualifying email plans: **Growth, Pro, Pro Plus** (active; annual or monthly).

Non-qualifying: **Free, Starter**, and any paused / unpaid / cancelled / expired qualifying plan.

Eligible SMS plans: **Text Essentials, Text Advantage** only.

Discount: **10% off the SMS fixed monthly fee only**.

Not discounted: activation, outbound usage, inbound overage, registration fees, vetting, penalties, exceptional charges, taxes.

When the email plan loses eligibility, the SMS fixed fee returns to its normal rate. The SMS service itself is **never** removed because the email plan changed. Discount changes use Stripe's supported subscription-proration behavior when SMS billing is live.

## Activation fee

- **$99** one-time (`9900` cents)
- Covers standard onboarding + standard brand/campaign registration prep + dedicated-number setup
- Does not guarantee carrier approval
- Does not silently absorb exceptional third-party charges (see product structure doc)

## Exceptional charges

Owner/admin creates a charge (`SmsExceptionalCharge`). Status flow: `DRAFT` → `PENDING_CUSTOMER_APPROVAL` → `APPROVED` / `REJECTED` → `INVOICED`. Customer approval is required before Stripe invoice-item creation.

## Current provider-cost assumptions (must be verified before launch)

These are **assumptions** used by the mock provider and margin reports until Telnyx reconciliation data exists:

| Cost | Assumed | Micros |
|------|---------|--------|
| Outbound 10DLC segment | $0.008 | `8_000` |
| Inbound segment | $0.008 | `8_000` |
| Local number / month | $1.50 | `1_500_000` |
| Brand + campaign setup (one-time) | $48.50 | `48_500_000` |
| 10DLC campaign fees / month | $12.50 | `12_500_000` |

**Owner must verify actual Telnyx + carrier prices before public launch.** See `SMS_OWNER_ACTIONS.md`.

## Stripe processing estimate

`(revenue × 29 / 1000) + ($0.30 × charge count)` in integer micros. Used for margin reporting only; actual Stripe fees come from reconciliation when available.

## Break-even examples (fixed overhead only)

Fixed monthly provider overhead assumption = number (`$1.50`) + campaign fees (`$12.50`) = **$14.00**.

| Plan | Fixed fee | Overhead | Gross before usage / Stripe |
|------|-----------|----------|-----------------------------|
| Text Entry | $19.99 | $14.00 | ~$5.99 |
| Text Essentials | $49.99 / $44.99 bundled | $14.00 | ~$35.99 / ~$30.99 |
| Text Advantage | $99.99 / $89.99 bundled | $14.00 | ~$85.99 / ~$75.99 |

Outbound usage has positive unit margin under the $0.008 assumption at every plan rate ($0.05 / $0.035 / $0.025). Inbound overage at $0.025 also has positive unit margin under the $0.008 assumption. **If Telnyx outbound rises above the plan's outbound rate, that plan must not launch until pricing is revised.**

## Margin warnings (admin)

Configurable via `SmsAdminSetting` (defaults):

- Gross margin below **60%**
- Provider message cost exceeds assumption by **>25%**
- Inbound segments above **2000** / month (anomaly)
- Provider invoice ≠ recorded usage cost (reconciliation mismatch)
- Negative margin (always warned)

Provider-cost fluctuations must never silently create negative-margin accounts — the admin SMS page surfaces every warning.
