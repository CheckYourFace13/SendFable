# Live product audit — Sendfable

**Date:** 2026-07-19  
**Environment:** https://sendfable.com (production)  
**Auditor login:** `chris@iscreamstudio.com` (OWNER)  
**Method:** Authenticated HTTP smoke + route inventory + code review  
**Workspace data at audit:** 1 user, 1 workspace, 0 contacts, 0 campaigns, 12 platform templates  

Classifications: **Working** · **Working but confusing** · **Visually weak** · **Partial** · **Broken** · **Missing** · **Blocked by SES** · **Blocked by Stripe**

---

## Public website

| Route | Classification | Evidence |
|-------|----------------|----------|
| `/` Homepage | Working / Visually strong | HTTP 200, ~152KB, branded title; early-access CTA in announcement bar |
| `/pricing` | Working | HTTP 200; plan copy present |
| `/features` | Working | HTTP 200 |
| `/templates` | Working | HTTP 200, marketing template gallery |
| `/deliverability` | Working | HTTP 200; claims must stay conservative (no inbox guarantee) |
| `/migrate` | Working | HTTP 200 |
| `/compare/*` (6 pages) | Working / Thin risk | All HTTP 200 (~60KB); template-driven — avoid stale competitor pricing |
| `/solutions/*` (9 pages) | Working / Thin risk | All HTTP 200 (~55KB); industry variants |
| `/login` | Working | HTTP 200; credentials login verified for owner |
| `/signup` | Working (gated) | HTTP 307 → `/early-access` under `EARLY_LAUNCH` |
| `/early-access` | Partial | HTTP 200; static page + mailto only — **no lead form** |
| Header / footer / logo | Working | Present on marketing shell |
| Mobile menu | Working (code) | SiteHeader mobile panel exists; not pixel-tested this pass |
| Favicon `/favicon.ico` | Broken | HTTP **404** (SVG `/icon.svg` + apple icon work) |
| `/icon.svg` | Working | HTTP 200 |
| `/apple-icon.png` | Working | HTTP 200 |
| Metadata / OG | Working | `og:title`, `og:description`, `og:image`, `twitter:card` present on homepage |
| Structured data (`ld+json`) | Partial / Missing | Not detected on homepage HTML scan |
| `/sitemap.xml` | Working | HTTP 200 |
| `/robots.txt` | Working | HTTP 200 |
| Internal links | Working | Marketing nav + footer links resolve |
| 404 `/this-route-should-404` | Working but confusing | Returned **307** (likely auth/middleware path) rather than branded 404 body for anonymous; not-found UI exists in app |

---

## Authenticated application

| Route / flow | Classification | Evidence |
|--------------|----------------|----------|
| `/dashboard` | Working / Partial | HTTP 200; first-run shows Add people / Create email / View results; **no full setup checklist** (address, sender, test, activate delivery) |
| `/onboarding` | Working | HTTP 200; wizard exists |
| `/contacts` | Working / Partial | HTTP 200; list + add dialog; **no detail URL** (rows not linked to `/contacts/[id]`) |
| Contact detail/edit | **Missing** | No `src/app/(app)/contacts/[id]/page.tsx`; API `GET/PATCH /api/contacts/[id]` exists |
| `/contacts/import` | Working / Partial | Upload → map → review → import; preview counts valid/invalid/dupes; **weak on existing/suppressed/unsubscribed breakdown** |
| `/contacts/migrate` | Working | HTTP 200 migration center |
| `/tags` | Working | HTTP 200 |
| `/segments` | Working | HTTP 200 (empty state with 0 contacts) |
| `/forms` | Working | HTTP 200 (`SignupForm` model) |
| `/library` | Working | HTTP 200 templates library |
| `/campaigns` | Working | HTTP 200 empty list |
| `/campaigns/new` | Working | HTTP 200; goal-oriented create |
| Email builder / Simple Mode | Working (code) | Campaign editor + Simple Mode defaults; live campaign UI not exercised (0 campaigns) |
| Advanced Mode | Working (code) | Present behind mode toggle |
| Preview / test render | Working (code) / **Blocked by SES** for real inbox | Test send uses mailer; blank AWS → outbox `.eml` |
| Send Confidence | Working / Partial | Score UI + checks; fix CTAs incomplete; not labeled “spam score” |
| Campaign scheduling | Working (code) / **Blocked by SES** for real send | Launch API gated without SES + early launch |
| `/campaigns/[id]/report` | Working (code) | Follow-up draft API exists (`/api/campaigns/[id]/follow-up`) — never auto-sends |
| `/settings` | Working | Business profile, team, referrals sections |
| `/settings/senders` | Working / **Blocked by SES** for real verify | HTTP 200 |
| `/settings/ses` | Working | Owner SES readiness checklist |
| Brand in settings | Partial | Brand fields on Workspace; `/brand` is internal gallery (auth required), not SMB brand editor UX |
| `/billing` | Working / **Blocked by Stripe** | HTTP 200; blank Stripe keys → inactive billing |
| Team / referrals | Working | Settings + `/api/settings/referrals` |
| Logout / session | Working | Auth.js JWT; Secure cookies on HTTPS |
| Admin control center | **Missing** | Only `/api/admin/ses-readiness`; no `/admin` UI |
| Early-access lead capture | **Missing** | No `EarlyAccessLead` model / API / admin list |

---

## Cross-cutting

| Item | Classification | Notes |
|------|----------------|-------|
| Real email sending | Blocked by SES | AWS keys empty; early launch send guards |
| Live Stripe charges | Blocked by Stripe | Keys empty |
| Public signup | Gated | Early launch → early-access |
| Other VPS sites | Working | Unrelated to this audit; previously verified healthy |
| Health | Working | `/api/health` → app+db+redis ok |

---

## Priority backlog (from this audit)

1. Contact detail/edit page + safe status rules (no casual unsuppression of bounce/complaint)
2. Dashboard setup checklist for first-time owners
3. Functioning early-access form + admin export (no marketing email yet)
4. Owner admin control center (health, users, leads)
5. Fix `/favicon.ico`
6. Confidence checks: why it matters + one-click fix links
7. Import summary: existing / suppressed / unsubscribed
8. Structured data + thin-page content polish
9. Backup script + SES/Stripe readiness docs

---

## What was not fully exercised live

- Mobile pixel layouts (390×844) — deferred to polish screenshots after UX changes  
- Drag/drop builder with real campaign content (empty workspace)  
- Actual `.eml` test-send path end-to-end (to be verified in Phase 7)  
- Permission matrix across MEMBER role (only OWNER account exists)  
