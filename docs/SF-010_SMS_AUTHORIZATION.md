# SF-010 — SMS production readiness (dark)

| Field | Value |
|-------|-------|
| Reference | SF-010 |
| Date | 2026-07-29 |
| Public SMS | **Dark** |
| Live Stripe SMS products | **0** |
| SMS messages sent | **0** |
| Numbers purchased | **0** |
| Registrations submitted | **0** |

## Code readiness (already in repo)

- Migration, feature flags, Telnyx adapter (flag-locked), mock provider
- Stripe dry-run setup script, plans, bundles, inbox, STOP/HELP, consent, usage ledger, admin
- Approved customer pricing matches `docs/SMS_PRICING_AND_MARGIN.md` / `src/lib/sms/pricing.ts`

## Credentials

| Item | State |
|------|-------|
| Telnyx API key in repo/prod sample | **Absent** (placeholders only) |
| Stripe `sk_test_` in local `.env` | **Absent** — cannot create test catalog automatically |
| Stripe live SMS setup | **Blocked** without owner approval |

Owner: create a **restricted Stripe test key** (or full `sk_test_`) in Stripe Dashboard → Developers → API keys, place only in a local/secret env file (never commit), then run:

`npx tsx scripts/stripe-sms-setup.ts --confirm-test-sms-setup`

Never use `sk_live_` for test catalog creation.

## Telnyx 10DLC fees (official pass-through — verify in portal before paying)

Sources (2026-07-29 retrieval):

- https://support.telnyx.com/en/articles/5634625-10dlc-fees-and-charges
- https://developers.telnyx.com/api-reference/brands/create-brand
- https://developers.telnyx.com/docs/messaging/10dlc/brand-registration

| Item | Typical amount | Refundable? |
|------|----------------|-------------|
| Brand registration | **~$4** one-time (TCR pass-through; Telnyx docs also cite $4 / help center $4.50 — **confirm in portal**) | **No** |
| Brand vetting (standard/enhanced) | **~$4–$40** depending on class | Treat as **non-refundable** |
| Campaign fee | Use-case dependent; often **first 3 months upfront** then monthly (e.g. low-volume mixed ~$1.50/mo; regular ~$10/mo) | Non-refundable ongoing |
| Manual campaign review | **~$15** per carrier review (pass-through) | No |
| US local number | Confirm current Telnyx number price (assumption in margin doc: ~$1.50/mo) | N/A |

### Authorization block (do not execute until owner replies APPROVE)

```
ACTION REQUESTED: Telnyx 10DLC brand + campaign registration + one US local number
Brand registration charge: ~$4–$4.50 (non-refundable)
Vetting (recommended): ~$4 standard / ~$40 enhanced (non-refundable) — confirm class
Campaign charge (estimate, regular use case): ~$30 upfront (3×$10) OR low-volume mixed ~$4.50–$6 upfront — confirm use case
Monthly campaign after: ~$1.50–$10 depending on use case
Number: confirm portal quote (assumption ~$1–$2/mo)
Total expected immediate charge: roughly $40–$90+ depending on vetting + use case (VERIFY IN PORTAL)
Refundable: brand/campaign TCR fees generally NO
Exact Cursor action if approved: set TELNYX_* secrets, submit brand+campaign via API/portal as documented, purchase one owner-controlled number, attach messaging profile, enable inbound webhook for owner workspace only
```

## Controlled test plan

Documented in owner actions. **Do not run** until registration approved, number linked, owner authorizes message charges, live-sending flag only for owner workspace, max recipients restricted.

## GO / NO-GO

| Gate | Status |
|------|--------|
| Backend dark | GO |
| Stripe test catalog | NO-GO (no sk_test_ present) |
| Telnyx registration | NO-GO (needs auth + fees) |
| Number purchase | NO-GO |
| Controlled SMS test | NO-GO |
| Live SMS Stripe catalog | NO-GO |
| Public SMS launch | NO-GO |
