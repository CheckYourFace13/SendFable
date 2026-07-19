# Sendfable Implementation Audit

**Date:** 2026-07-19 (refreshed after Phase 2–7 work)  
**Runtime evidence:** `docs/FINAL_VERIFICATION.md`

**Legend:** COMPLETE · PARTIAL · UI-ONLY · MISSING · BROKEN · NEEDS_CREDENTIAL

---

## Executive summary

Core send path is real: auth → audience → builder → launch (BullMQ or inline) → SES or local `.eml` → tracking/unsubscribe → Stripe gates. Phase 2–4 surfaces (onboarding, Simple Mode, goals, confidence, migration, SEO suite, SES docs) are now largely present. Remaining gaps are listed in `KNOWN_LIMITATIONS.md`.

**Previously overstated / since fixed**

| Claim | Prior | Now |
|-------|-------|-----|
| Guided onboarding | MISSING | COMPLETE — `/onboarding`, `GET/PATCH /api/onboarding` |
| Simple Mode | MISSING | COMPLETE — default `simpleMode`, shared `designJson` |
| Brand profile + SSRF import | MISSING | PARTIAL — import API + onboarding; settings brand surface limited |
| Send Confidence | MISSING | COMPLETE — lib + API + Review UI |
| Migration center | MISSING | COMPLETE — `/contacts/migrate` + marketing `/migrate` |
| SEO suite | MISSING | COMPLETE — routes, sitemap, robots, llms.txt, seo-check |
| SNS signature verify | MISSING | PARTIAL — implemented; soft-fail via `SNS_VERIFY_STRICT` |
| Automated tests | MISSING | PARTIAL — 25 unit tests |
| Login redirect loop | BROKEN | FIXED — middleware requires real user |

---

## Implementation matrix

### Authentication & sessions

| Item | Status | Evidence |
|------|--------|----------|
| Password signup/login | COMPLETE | `src/app/api/auth/signup/route.ts`, `src/lib/auth.ts`, `/signup`, `/login` |
| Magic link | COMPLETE | Email provider in `src/lib/auth.ts`, `/login/check-email` |
| Email verification | COMPLETE | `/api/auth/verify-email`, resend + banner |
| Sessions | COMPLETE | `src/lib/auth.config.ts`, `src/middleware.ts` |
| Mail for auth | NEEDS_CREDENTIAL | blank AWS → `.eml` |

### Workspace & onboarding

| Item | Status | Evidence |
|------|--------|----------|
| Workspace at signup | COMPLETE | signup route |
| Guided wizard (10 steps, save/return) | COMPLETE | `/onboarding`, `/api/onboarding` |
| Action-first dashboard | COMPLETE | `/dashboard` first-run three actions |
| Settings (name, address, timezone) | COMPLETE | `/settings`, `/api/settings/workspace` |
| Brand profile | PARTIAL | Workspace brand fields; `/api/brand/import`; onboarding |

### Sender identities

| Item | Status | Evidence |
|------|--------|----------|
| Address verification | COMPLETE | `/settings/senders`, `/api/identities*` |
| Strict-DMARC rewrite | COMPLETE | `src/lib/dmarc.ts`, `src/lib/identities.ts` |
| Custom domain + DKIM | COMPLETE | Growth+ gate; Check DNS |
| Live SES domain ops | NEEDS_CREDENTIAL | `src/lib/ses-domains.ts` |

### Audience

| Item | Status | Evidence |
|------|--------|----------|
| Contact CRUD list/create/delete | COMPLETE | `/contacts`, `/api/contacts*` |
| Contact detail edit UI | MISSING | PATCH API only |
| CSV import + mapping + dedupe | COMPLETE | `/contacts/import` |
| Competitor migration center | COMPLETE | `/contacts/migrate`, `src/lib/migration-presets.ts` |
| Status preservation on import | COMPLETE | never upgrades unsub/bounce/complaint → subscribed |
| Tags / segments / forms + DOI | COMPLETE | respective routes under `(app)` + `/f/[slug]` |

### Email builder & content

| Item | Status | Evidence |
|------|--------|----------|
| DnD builder + compiler + footer | COMPLETE | `email-builder/builder.tsx`, `email-compiler.ts` |
| Simple Mode default | COMPLETE | `simple-design.ts`, builder toggle |
| Raw HTML mode | PARTIAL | persists `rawHtmlMode` + sanitize; prefer advanced |
| Merge tags + fallbacks | COMPLETE | `src/lib/merge.ts` + tests |
| Platform template library (12) | COMPLETE | `platform-templates.ts`, seed |
| App template list | COMPLETE | `/library` (public gallery is `/templates`) |

### Campaigns

| Item | Status | Evidence |
|------|--------|----------|
| Goal-based create | COMPLETE | `campaign-goals.ts`, `/campaigns/new` |
| Launch, snapshot, suppress, schedule, pause/resume/cancel | COMPLETE | `campaign-send.ts`, campaign APIs, worker |
| Quotas + ramp + holds | COMPLETE | `quota.ts`, `sendingHeldAt` |
| Send Confidence | COMPLETE | `send-confidence.ts`, Review tab |
| Test send + `.eml` | COMPLETE | NEEDS_CREDENTIAL for SES |
| Follow-up drafts | PARTIAL | API complete; report UI partial |
| Action analytics | PARTIAL | report stats + open-as-estimate labels |

### Tracking, webhooks, compliance

| Item | Status | Evidence |
|------|--------|----------|
| Open/click tracking | COMPLETE | `/api/t/o/*`, `/api/t/c/*` |
| Unsubscribe + RFC 8058 | COMPLETE | `/unsubscribe/[token]`, one-click API |
| SES/SNS webhook | PARTIAL | events + idempotency + signature verify |
| Stripe webhooks | COMPLETE | signature via `constructEvent` · NEEDS_CREDENTIAL |

### Billing, team, growth

| Item | Status | Evidence |
|------|--------|----------|
| Stripe Checkout/Portal/plans | COMPLETE | `/billing` · NEEDS_CREDENTIAL |
| Team invites | COMPLETE | Pro gate, `/invite/[token]` |
| Free “Sent with Sendfable” badge | COMPLETE | `plans.ts` + compiler |
| Referrals + credit ledger | PARTIAL | signup attribution, settings UI, ledger on verify |
| Public archive | PARTIAL | `/a/[slug]` + schema flags; settings UX thin |
| Hosted landing pages | MISSING | model only |

### Marketing & SEO

| Item | Status | Evidence |
|------|--------|----------|
| Core + compare + solutions + resources suite | COMPLETE | `(marketing)/*` routes |
| sitemap / robots / llms.txt / RSS | COMPLETE | `sitemap.ts`, `robots.ts`, `public/llms.txt`, `/feed.xml` |
| JSON-LD helpers | COMPLETE | `components/marketing/json-ld.tsx` |
| seo-check script | COMPLETE | `scripts/seo-check.ts` — PASS |

### SES readiness & docs

| Item | Status | Evidence |
|------|--------|----------|
| SES docs suite | COMPLETE | `docs/SES_*.md`, `DELIVERABILITY_OPERATIONS.md` |
| Owner SES readiness screen | COMPLETE | `/settings/ses`, `/api/admin/ses-readiness` |

### Security

| Item | Status | Evidence |
|------|--------|----------|
| SSRF protection (brand import) | COMPLETE | `ssrf.ts` + tests |
| HTML sanitize | PARTIAL | `html-sanitize.ts` MVP |
| SNS authenticity | PARTIAL | `sns-verify.ts` |
| CSV formula injection on export | COMPLETE | contacts export prefix |
| Audit log | PARTIAL | `audit.ts` — sparse call sites |
| Workspace isolation tests | PARTIAL | contract unit tests only |
| Admin hold UI | MISSING | field enforced, no UI |

### Infra

| Item | Status | Evidence |
|------|--------|----------|
| Docker Compose + Caddy + worker | COMPLETE in repo | Docker CLI **not verified** on audit host |
| Seed | COMPLETE | demo + 12 platform templates |
| README / `.env.example` | COMPLETE | includes `SNS_VERIFY_STRICT` note |

---

## Route conflict resolution

Public marketing owns `/templates` and `/migrate`.  
Authenticated app uses `/library` and `/contacts/migrate`.
