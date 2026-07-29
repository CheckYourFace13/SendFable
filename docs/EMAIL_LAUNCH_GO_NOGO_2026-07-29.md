# Email production launch — GO / NO-GO — 2026-07-29

## Verdict: **GO** for public email marketing launch

SES production access is approved and live. Email launch code is deployed.
Public signup, billing, and campaign sending are **enabled**. SMS remains **dark**.

## Identifiers

| Item | Value |
|---|---|
| Launch branch | `launch/email-production-2026-07-29` |
| Final commit (also `main` / production) | `e23ec72` |
| Production deploy (initial) | `2026-07-29T14:49:40Z` @ `70eddfa` |
| Production deploy (webhook + campaign test) | rebuilt through `4dffbf5` / git `e23ec72` |
| Launch flags activated | `2026-07-29T15:09:41Z` |
| AWS case | `178491867800933` — APPROVED 2026-07-29 |

## AWS SES (us-east-1)

| Field | Value |
|---|---|
| ProductionAccessEnabled | `true` |
| Max24HourSend | `50000` |
| MaxSendRate | `14` |
| App ceiling | `PLATFORM_SEND_RATE_PER_SEC=5` |
| Identity `send.sendfable.com` | Verified, DKIM SUCCESS, MAIL FROM SUCCESS |
| Config set `sendfable-events` | Bounce/complaint/delivery (+delay/reject/rendering) → SNS |
| SNS | 1 confirmed subscription |
| Account suppression reasons | BOUNCE, COMPLAINT |

## SMS branch decision

**DEFERRED.** `feature/sms-product` @ `a1e1d54` was **not** merged into this launch.

Reasons: avoid nullable-email migration and SMS schema during first public email window; production image/schema remain email-only.

### Counts (required)

| Metric | Count |
|---|---|
| Customer campaigns sent | **0** |
| Customer recipients contacted | **0** |
| Controlled test emails sent | **6** |
| SMS messages sent | **0** |
| SMS numbers purchased | **0** |
| SMS registrations submitted | **0** |
| Live SMS Stripe products created | **0** |

Controlled email breakdown:

1. Delivery → `*@iscreamstudio.com` (mailer)
2. Bounce simulator → `bounce@simulator.amazonses.com`
3. Complaint simulator → `complaint@simulator.amazonses.com`
4. Bounce simulator (retest after webhook fix)
5. Complaint simulator (retest)
6. Owner campaign (1 recipient `@iscreamstudio.com`) — delivery event set `deliveredAt`

After retest, `GlobalSuppression` contains simulator bounce + complaint addresses.

## Launch flags (live)

```
EARLY_LAUNCH=false
ALLOW_PUBLIC_SIGNUP=true
STRIPE_BILLING_ENABLED=true
STRIPE_OWNER_TEST_ENABLED=false
CAMPAIGN_SEND_ENABLED=true
SES_CONTROLLED_TEST_ENABLED=false
PLATFORM_SEND_RATE_PER_SEC=5
```

No `SENDFABLE_SMS_*` keys present.

## Stripe

Live catalog verified against `src/lib/plans.ts`:

| Plan | Monthly | Annual | Match |
|---|---|---|---|
| Starter | $12 | $120 | yes |
| Growth | $29 | $290 | yes |
| Pro | $69 | $690 | yes |
| Pro Plus | $99 | $990 | yes |

Lookup keys `sendfable_*_20260725`; `livemode=true`; SMS lookup keys → **0** prices.

## Public smoke (post-activation)

All HTTP 200: `/`, `/pricing`, `/signup`, `/login`, `/features`, legal pages, `/robots.txt`, `/sitemap.xml`.  
`/early-access` → 307 `/signup`. `/inbox` → 404. `/api/sms/checkout` → 404. Pricing has no SMS wording.

## Backups

- Pre-deploy: `/root/sendfable-backups/last-success` → `2026-07-29T14:45:46+00:00`
- Pre-deploy commit recorded: `/root/sendfable-backups/pre-deploy-commit-2026-07-29.txt` → `13931de`
- Flag snapshots: `flags-before-public-launch-2026-07-29.env`, `flags-after-public-launch-2026-07-29.env`

## Migrations

No new migrations applied (still through `20260725180000_plan_pro_plus`). SMS migration **not** applied.

## Security notes (honest residual)

- SNS webhook signature verification remains in place; invalid signatures rejected.
- Campaign send requires auth + workspace membership (unchanged).
- Owner workspace received a **script-provisioned VERIFIED sender** and a **temporary mailing address** for controlled campaign testing — owner should replace with the real business mailing address in Settings and confirm sender verification UX for customers.
- Open/click/unsubscribe live click-through on the controlled campaign was **not** fully exercised in this session (code paths covered by prior unit/integration work; delivery webhook **was** live-proven).
- Legal pages still recommend qualified legal review (`docs/LEGAL_STATUS.md`).

## Rollback

```bash
cd /opt/sendfable
# Restore locked flags from /root/sendfable-backups/flags-before-public-launch-2026-07-29.env
# Then:
docker compose -p sendfable -f docker-compose.prod.yml up -d --force-recreate app worker
# Optional code rollback:
# git reset --hard 13931de
# docker compose -p sendfable -f docker-compose.prod.yml up -d --build app worker
```

## Remaining owner actions

1. Confirm real physical mailing address on the primary workspace (replace controlled-test placeholder).
2. Walk signup → sender verification → first Free campaign as a real customer would.
3. Optional: open the controlled campaign email and click tracked link / unsubscribe once.
4. Keep SMS dark until a dedicated post-email merge + migration window.
5. Optional legal/Stripe invoice branding review.

## Related docs

- `docs/SES_PRODUCTION_APPROVAL_2026-07-29.md`
- `docs/SES_DELIVERABILITY_VERIFICATION_2026-07-29.md`
- `docs/EMAIL_LAUNCH_STATUS_2026-07-29.md`
- `docs/FINAL_LAUNCH_ACTIVATION_CHECKLIST.md`
