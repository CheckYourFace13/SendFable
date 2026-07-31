# SF-019 — SMS Launch Readiness While Telnyx Approval Is Pending

## Summary

Complete local / dark readiness for customer SMS onboarding, compliance review, provider abstraction, mock E2E coverage, billing safety, hidden pricing, admin ops, owner pilot config, and Telnyx review tracking — **without** Telnyx credentials or any paid activity.

| Field | Value |
|-------|--------|
| Starting commit | `a68cc41` (docs tip) / production app `0fa4315` |
| Branch | `sf/019-sms-launch-readiness` |
| Final commit | _(filled after commit)_ |
| Production commit | _(filled after deploy)_ |
| Telnyx Request ID | `ec782151-3915-94c0-a4bc-dedd0122f279` |
| External charges | **$0** |
| Numbers purchased | **0** |
| Registrations submitted | **0** |
| SMS messages sent | **0** |
| Stripe meter events | **0** |
| Public SMS flags enabled | **0** |

## Deliverables

| ID | Item | Status |
|----|------|--------|
| A | Customer SMS onboarding (flag-gated) | Done — `/sms/onboarding` + `/api/sms/compliance` |
| B | Internal compliance review queue | Done — statuses + audit events + `/admin/sms/compliance` |
| C | Provider abstraction | Done — `SmsProvider` + `SmsProviderOps` (mock full, Telnyx stub) |
| D | Mock end-to-end scenarios | Done — unit/integration + mock ops (no real SMS) |
| E | Billing safety guards | Done — `billing-guards.ts` on checkout |
| F | Hidden pricing / checkout preview | Done — `/sms/pricing-preview`, `/sms/checkout-preview` |
| G | Legal drafts + attorney flags | Done — `SF-019_SMS_LEGAL_REVIEW_REQUIRED.md` |
| H | Admin operations | Done — queue, kill switch, release, reconcile |
| I | Owner-only pilot prep | Done — `pilot.ts` + `SF-019_OWNER_ONLY_SMS_PILOT.md` (disabled) |
| J | Telnyx approval tracking | Done — `SF-019_TELNYX_SECURITY_REVIEW_STATUS.md` |

## Migrations

- `prisma/migrations/20260731180000_sf019_sms_compliance_review` — `SmsComplianceReviewStatus`, profile fields, `SmsComplianceReviewEvent`, rename `status` → `providerStatus`

## GO / NO-GO

| # | Area | Verdict |
|---|------|---------|
| 1 | Customer SMS onboarding code | **GO** (code complete; surface stays dark) |
| 2 | Internal compliance review | **GO** |
| 3 | Provider abstraction | **GO** |
| 4 | Mock end-to-end SMS | **GO** (mock/simulation; not live) |
| 5 | Billing calculations | **GO** (catalog mapped; live writes blocked) |
| 6 | Hidden pricing/checkout | **GO** |
| 7 | Admin operations | **GO** |
| 8 | Owner-only pilot preparation | **GO** (config ready; **not enabled**) |
| 9 | Telnyx account connection | **NO-GO** (security review pending) |
| 10 | Real controlled SMS testing | **NO-GO** |
| 11 | Public SMS launch | **NO-GO** |

## After Telnyx approves (only remaining work)

1. Add credentials securely  
2. Confirm ISV/partner access  
3. Submit owner-only controlled-test registration  
4. Purchase one controlled-test number after explicit approval  
5. Run controlled real-message testing  
6. Open SMS gradually after final approval  

Do **not** begin Telnyx setup until the owner reports account approval.
