# Customer-style email flow test — 2026-07-29

## Method

`scripts/customer-flow-verify.ts` on production worker against live flags.

- Signup via public `POST /api/auth/signup`
- Verification via valid `email-verify` token endpoint (same mechanism as email link)
- Fresh workspace “Flow Test Bakery” with its **own** mailing address
- One-recipient campaign to `chris+recip…@iscreamstudio.com`
- Open pixel, click redirect, unsubscribe page, one-click unsubscribe, suppression, resend skip

## Results

| Step | Result |
|---|---|
| Public signup page | PASS |
| Account creation | PASS |
| Email verification endpoint | PASS |
| Workspace business name / address | PASS (customer workspace) |
| Primary owner workspace isolation | PASS (still iScream Studio INC / 1364 Patriot Blvd) |
| Sender identity | PASS (DB verified for send; **manual click UX remaining**) |
| Contact + campaign + audience | PASS |
| Launch blocked without mailing address | PASS |
| One-recipient send + delivery webhook | PASS |
| Open tracking | PASS (HTTP endpoint + DB) |
| Click tracking | PASS → `https://sendfable.com/pricing` |
| Unsubscribe page + one-click | PASS |
| Suppression + resend skip | PASS |
| Analytics opens/clicks | PASS |
| Free plan | PASS |

## Controlled emails sent (this run)

**2** additional messages:

1. Signup verification → `chris+flow…@iscreamstudio.com`
2. Campaign → `chris+recip…@iscreamstudio.com`

Footer identity for flow workspace: **Flow Test Bakery**, `500 Customer Ave, Chicago, IL 60601` (not owner address).

## Manual remaining

- Human Outlook confirmation of the new flow campaign rendering (agent cannot open inbox).
- Full Settings → Senders “click verification email” UX (not re-sent to avoid extra mail).

## Email verdict

**GO** for email general availability (with the two manual UX notes above).
