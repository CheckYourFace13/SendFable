# SF-009 — Referral economics

| Field | Value |
|-------|-------|
| Reference | SF-009 |
| Date | 2026-07-29 |
| Credits live | **No** (`REFERRAL_CREDITS_ENABLED` default false) |
| Cash payouts | **No** |
| Multi-level | **No** |

## Plan revenue context (list prices)

From `src/lib/plans.ts` (USD / month):

| Plan | Monthly | Annual (10× month) |
|------|---------|-------------------|
| Free | $0 | — |
| Starter | $12 | $120 |
| Growth | $29 | $290 |
| Pro | $69 | $690 |
| Pro Plus | $99 | $990 |

Exact COGS (SES, infra, support) varies. For referral safety we assume **gross margin after payment processing must remain positive after the reward**.

## Proposed reward (inactive)

| Rule | Proposal |
|------|----------|
| Referred customer benefit | Standard signup / free tier — no cash; optional future “first month” promo only if margin-approved |
| Referrer reward | **$10 account credit** (1000¢) after referred customer completes **30 days** paid |
| Cap | Hard code ceiling **$25** per credit without engineering + owner review |
| Form | Stripe customer balance / invoice credit — **not implemented live** |
| Self-referral | Blocked (`referrer.id === referredUserId`) |
| Expiration | Credit ledger entries older than 12 months may expire (policy TBD before activation) |
| Cancellation | If referred sub refunded/charged-back within qualify window → no credit / clawback meta |

### Sustainability check (illustrative)

On **Starter $12/mo**, a $10 credit after month 1 consumes most of first-month revenue — **only sustainable if**:

- Qualifying period is paid and non-refunded, **and**
- Expected lifetime ≥ ~2–3 months, **or**
- Reward is limited to Growth+ referrals

**Recommendation before activation:** either (a) require Growth+ for monetary credit, or (b) keep $10 but require 60 qualifying paid days, or (c) lower credit to **$5** on Starter.

Until owner chooses, keep `REFERRAL_CREDITS_ENABLED=false`. Placeholder non-monetary ledger entries may still record attribution events.

## Fraud controls (implemented / planned)

- Self-referral block (implemented)
- Unique credit per referred user (implemented)
- Admin review of attribution anomalies (monthly job — report only)
- No cash payout path

## Live status

Referral URL + dashboard: **available** in Settings.  
Monetary credits: **NO-GO**.  
Credits issued: **0** monetary.
