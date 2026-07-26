# Pre-approval readiness consolidation — 2026-07-26

## Overall verdict

**CONDITIONAL GO** — all owner-controlled launch engineering work for this stage is complete.  
Public launch remains blocked only by:

1. AWS SES production approval (owner must respond to AWS’s request for additional information on case `178491867800933`)
2. Controlled SES production-send test (not run)
3. Final owner launch authorization (checklist prepared, not executed)

Do **not** state 100% ready until the controlled SES test passes.  
Early-access wording and all launch flags remain **locked**.

## Launch score

**88 / 100** (conditional). Remaining points reserved for SES production access + controlled send test + final activation.

## Launch flags (unchanged)

```
EARLY_LAUNCH=true
ALLOW_PUBLIC_SIGNUP=false
STRIPE_BILLING_ENABLED=false
STRIPE_OWNER_TEST_ENABLED=true
CAMPAIGN_SEND_ENABLED=false
SES_CONTROLLED_TEST_ENABLED=false
```

## Completed Stripe lifecycle

See `docs/STRIPE_STARTER12_LIFECYCLE_2026-07-26.md` — Starter **$12** paid, webhook FREE→STARTER, immediate cancel, full refund succeeded, FREE via `customer.subscription.deleted`, no duplicates, flags locked.

## SES status (read-only recheck 2026-07-26)

| Field | Value |
|---|---|
| ProductionAccessEnabled | `false` |
| SendingEnabled | `true` |
| EnforcementStatus | `HEALTHY` |
| ReviewDetails.Status (API enum) | `DENIED` *(API field; not treated as final Support denial letter)* |
| CaseId | `178491867800933` |
| Max24HourSend | 200 |
| MaxSendRate | 1 |
| SentLast24Hours | 1 |
| DKIM | SUCCESS / signing enabled (`send.sendfable.com`) |
| MAIL FROM | SUCCESS (`bounce.send.sendfable.com`) |
| Configuration set | `sendfable-events` — SNS destination enabled (BOUNCE, COMPLAINT, DELIVERY, DELIVERY_DELAY, REJECT, RENDERING_FAILURE) |
| SNS subscription | HTTPS → `https://sendfable.com/api/webhooks/ses` — **Confirmed** |

### Owner-visible case classification

**AWS requested additional information and is waiting for the owner response.**

Do not describe the case as a final denial unless AWS later sends an explicit denial message.  
Do **not** submit a reply/appeal/new request from automation — owner responds in Support Center.

Owner instructions: `docs/SES_CASE_REVIEW_OWNER_INSTRUCTIONS.md`  
Follow-up draft (unsubmitted): `docs/SES_PRODUCTION_ACCESS_FOLLOWUP_DRAFT.md`

## Exact owner response still needed for AWS

1. Open Support Center case `178491867800933`.
2. Read AWS’s information request in full.
3. Reply with the requested details (adapt `docs/SES_PRODUCTION_ACCESS_FOLLOWUP_DRAFT.md` to the questions asked).
4. Do not open a second production-access case.

## Controlled SES test + launch activation

- Test plan (not run): `docs/SES_CONTROLLED_PRODUCTION_TEST_PLAN.md`
- Launch checklist (not run): `docs/FINAL_LAUNCH_ACTIVATION_CHECKLIST.md`

## Consistency audit (production 2026-07-26)

| Area | Result |
|---|---|
| Five-plan pricing + Up to limits | PASS |
| Calendar-month reset copy | PASS |
| Annual / two months free | PASS on `/pricing` (annual toggle / label) |
| Refund posture (discretionary) | PASS |
| Operator wording | PASS on legal/contact pages |
| Public mailboxes @sendfable.com | PASS |
| No public `chris@iscreamstudio.com` | PASS |
| iScream only as legal operator | PASS |
| Stripe display / business profile | SendFable |
| Team seats not publicly advertised | PASS |
| No unlimited / dedicated-IP / delivery-guarantee promises | PASS |
| Early-access wording retained | PASS |

## Backups & ops

| Item | Status |
|---|---|
| Daily local backup | OK — `last-success` 2026-07-26T03:15:01Z |
| Encrypted off-host S3 | OK — OFFHOST uploads same day |
| Last off-host upload | 2026-07-26T03:15 (daily + weekly `.age`) |
| Last restore drill | 2026-07-24 documented (local); schedule refresh before public launch |
| Backup failure alerting | Configured (backup script + 5-minute monitor) |
| App / Postgres / Redis | Healthy |
| Worker | Up |
| Nginx | Config OK; unrelated sites enabled and untouched |
| Queue | Redis PONG; BullMQ keys present |
| Disk | ~68% on `/` |
| TLS | sendfable.com valid through 2026-10-17 |
| Stripe webhook smoke | POST without signature → 400 (expected) |
| Active Stripe subscriptions | 0 |
| Monitoring cron | `*/5` monitor + daily 03:15 backup |

## Remaining blockers (exact)

1. Owner response to AWS additional-information request (case `178491867800933`).
2. SES `ProductionAccessEnabled=true`.
3. Controlled SES production-send test PASS.
4. Final owner launch authorization + activation checklist execution.
5. Optional/pre-launch: refresh isolated restore drill marker; attorney review remains recommended (not claimed done).
