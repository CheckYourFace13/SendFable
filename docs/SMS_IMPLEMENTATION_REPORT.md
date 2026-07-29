# SMS implementation report

**Branch:** `feature/sms-product`  
**Date:** 2026-07-26  
**Deploy:** no  
**Merge to main:** no  

## Audit baseline (before changes)

- Local branch at start: `main` @ `13931de` (matched `origin/main`, 0/0 divergence)
- Untracked docs from prior readiness work were present; SMS work isolated on the new feature branch
- Schema: email-required `Contact`, email-only campaigns, Stripe email Plan lifecycle, SES mailer, BullMQ worker
- Feature flags already in use for email launch gates; SMS flags added alongside
- SES status (unchanged, read-only last check): ProductionAccessEnabled=false, SendingEnabled=true, EnforcementStatus=HEALTHY, ReviewDetails.Status=DENIED, CaseId=178491867800933 — owner already submitted additional info; awaiting AWS
- Test baseline on branch point: **167 pass / 0 fail**
- Final on this branch: **250 pass / 0 fail** (83 SMS-focused cases added across pricing, segments, consent, phone, convert, mock provider, margin, flags, plus authz allowlist for Telnyx webhook)
- `npm run typecheck` — pass
- `npx prisma validate` — pass
- `npm run build` — pass
- `npx tsx scripts/stripe-sms-setup.ts` — dry-run only; printed planned meters/prices; created nothing

## What was built

### Schema / migration

`prisma/migrations/20260726160000_sms_product/` — nullable email, phoneE164, SMS consent fields, Campaign channel + sms* fields, SignupForm requirement modes, and full SMS billing/inbox/registration tables. Check constraint enforces email OR phone.

### Domain libraries (`src/lib/sms/`)

flags · pricing · segments · phone · consent · contact-intake · convert · provider · mock-provider · telnyx-provider · provider-registry · usage · margin · inbound · send · campaign · notifications · stripe

### API / UI (all server-flag gated)

- `POST /api/webhooks/telnyx`
- SMS checkout, inbox mark-read / reply
- Admin SMS overview + actions
- Campaign create/patch channel + `/convert`
- Contacts / import / forms updated for phone + consent
- Pages: `/billing/sms`, `/inbox`, `/admin/sms`
- Hidden `SmsPricingSection` mounted on `/pricing` (renders nothing while public flag is off)
- `SmsPurchaseDisclosure` component for pre-purchase

### Stripe

- Dry-run script `scripts/stripe-sms-setup.ts` (Billing Meters model)
- Shared webhook route extended for SMS activation + subscription + bundle recalc
- Zero live Stripe SMS objects created

### Docs

Ten files: `docs/SMS_*.md` (this report included).

## Safety statement for this task

| Action | Count |
|--------|------:|
| Provider (Telnyx) calls | **0** |
| Text messages sent | **0** |
| Phone numbers purchased | **0** |
| Registrations submitted | **0** |
| Live Stripe SMS products created | **0** |
| Emails sent (beyond existing local outbox paths) | **0** |
| Production deployment | **no** |
| Merge to main | **no** |
| Production env vars changed | **no** |

## GO / NO-GO

| Gate | Verdict |
|------|---------|
| 1. Merging disabled backend code | **CONDITIONAL GO** — after PR review; flags keep it dark |
| 2. Mock SMS testing | **GO** — mock provider + outbox ready on this branch |
| 3. Creating Stripe test-mode / live SMS products | **NO-GO** until owner authorizes + billing flag on |
| 4. Telnyx registration | **NO-GO** |
| 5. Controlled real-number testing | **NO-GO** |
| 6. Public launch | **NO-GO** |

## Remaining owner actions

See [SMS_OWNER_ACTIONS.md](./SMS_OWNER_ACTIONS.md) sections 2–7. Email SES approval remains a separate track and does not unlock SMS live operations by itself.
