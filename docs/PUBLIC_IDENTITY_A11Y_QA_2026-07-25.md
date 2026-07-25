# Public identity + authenticated a11y QA — 2026-07-25

**Overall:** **PASS** for public-identity exposure and launch-critical a11y/keyboard fixes.  
**Caveat:** Stripe KYC `company.name` remains the legal entity (owner Dashboard action).  
Launch flags unchanged.

## 1. Overall

**PASS** (public identity clean on site; teammate redaction live; builder keyboard path fixed; public Lighthouse a11y ≥94).

## 2–5. Public-identity audit

### Occurrences found and classification

| Occurrence | Location | Classification | Action |
|---|---|---|---|
| “operated by iScream Studio” | `/terms`, `/privacy` (live HTML) | **Public — must remove** | Replaced with Sendfable-only wording |
| `chris@iscreamstudio.com` in team API for ADMIN/MEMBER | `/api/settings/team` | **Customer-visible — must replace** | Redacted to `Workspace owner` |
| Contact row `chris@iscreamstudio.com` | Production `Contact` | **Customer-visible via export** | Updated to `qa-audience@example.com` |
| Workspace B mailing “QA only — iScream Studio” | DB | **Internal QA — replace** | Updated to `QA only — SendFable` |
| User menu shows owner email when OWNER logged in | App shell | **Internal — acceptable** (private auth UI for that user only) | None |
| `PLATFORM_OWNER_EMAIL` / `OWNER_ALERT_EMAIL` | Server env | **Internal — acceptable** | None |
| `OWNER_TEST_EMAIL` in `stripe-billing-gate.ts` | Server code + unit tests | **Internal — acceptable** | None |
| Support notify → `OWNER_ALERT_EMAIL` | Server mail to owner only | **Internal — acceptable** (customer JSON is `{ok:true}` only; From is `no-reply@send.sendfable.com`) | None |
| `platformFrom()` | Transactional mail | **Public-safe** (`Sendfable <no-reply@send.sendfable.com>`) | None |
| Stripe `business_profile` support/url/name | Stripe API | **Public-safe** (`support@sendfable.com`, SendFable) | None |
| Stripe account `email` | Stripe account login | **Internal Stripe login — acceptable** (not Checkout support fields) | None |
| Stripe `company.name` = `iScream Studio INC` | Stripe KYC / may appear on invoices | **Customer-visible legal entity — owner Dashboard** | **Not auto-changed** (KYC). Owner should confirm invoice branding in Stripe Dashboard |
| Ops/QA docs mentioning chris@ / iScream | `docs/*`, scripts | **Internal docs — acceptable** | Follow-up draft signature cleaned to Sendfable only |
| SES follow-up draft signature | `docs/SES_PRODUCTION_ACCESS_FOLLOWUP_DRAFT.md` | Was draft-only; cleaned | `Sendfable` + `support@sendfable.com` |

### Public replacements made

- Terms: removed “operated by iScream Studio”
- Privacy: removed “operated by iScream Studio”
- Team API: internal owner email → `Workspace owner` for non-owner viewers
- Contact + Workspace B mailing address cleaned in DB
- Follow-up draft signature: Sendfable only

### Proof (post-deploy)

Public pages `/`, `/pricing`, `/login`, `/terms`, `/privacy`, `/acceptable-use`, `/refund-policy`, `/security`, `/contact`, `/features`, `/status`: **CLEAN** (no `chris@iscreamstudio.com`, `iscreamstudio.com`, or `iScream`).

MEMBER/ADMIN team API emails: `Workspace owner`, `legal@sendfable.com`, `privacy@sendfable.com` — **no iscreamstudio**.  
MEMBER contacts export: **clean**. MEMBER billing status JSON: **clean**.  
MEMBER HTML for dashboard/contacts/settings/billing/campaigns: **no iscream hits**.

## 6. Devices / viewports / browsers

- Automation: Chromium via Lighthouse (headless) on Windows for public pages
- Authenticated checks: production HTTPS via curl session cookies (Chrome-compatible Auth.js)
- Code-verified responsive shell at **375 / 768 / 1280** (Tailwind `lg` breakpoint + `MobileAppNav`)
- **200% zoom**: builder/settings use fluid layouts; no fixed overflow shells beyond known table scroll patterns
- **Reduced motion**: `prefers-reduced-motion` already suppresses `.page-lift` / `.motion-page-travel` in `globals.css`

Full interactive keyboard pass across every wizard step in a real browser session remains recommended for owner sign-off; launch-critical gaps found in code were fixed.

## 7. Pages tested

Public: home, pricing, login, terms, privacy, AUP, refund, security, contact, features, status.  
Authenticated (MEMBER/ADMIN HTML + APIs): dashboard, contacts, settings, billing, campaigns, team API, export.  
Code-reviewed: builder, mobile nav, user menu, 404/`link-unavailable`, import labels.

## 8–11. Issues and builder keyboard

| Area | Finding | Severity | Status |
|---|---|---|---|
| Public legal iScream branding | Exposed | Launch-critical | **Fixed** |
| Team list leaked owner mailbox | Exposed to ADMIN/MEMBER | Launch-critical | **Fixed** |
| Export contained owner email contact | Exposed | Launch-critical | **Fixed** |
| Builder reorder DnD-only | Keyboard blocked | Launch-critical | **Fixed** (Up/Down buttons) |
| Builder delete without confirm | Destructive | Launch-critical | **Fixed** (`window.confirm`) |
| Mobile nav focus restore | Focus lost on close | Launch-critical | **Fixed** |
| Invite email unlabeled | a11y | Noncritical→fixed | **Fixed** (sr-only label) |
| Stripe `company.name` KYC | May show on invoices | Remaining owner action | **Open** |
| Builder still pointer-enhanced DnD | Enhancement only | Noncritical | Documented |
| Login Lighthouse SEO 86 | Synthetic (login noindex-ish) | Noncritical | Accept |

**Builder keyboard path (post-fix):** add block (palette buttons), select (keyboard-focusable), edit text/links/buttons (properties), reorder (Up/Down), delete (confirm), desktop/mobile preview toggles, Simple mode. Drag handle remains optional enhancement.

## 12. Fixes made

See commit `f726e60` (+ mobile-nav lint follow-up). Helper: `src/lib/internal-identity.ts`.

## 13. Remaining noncritical limitations

- Builder DnD is still available as enhancement; complex multi-column editing is basic
- Tables use horizontal scroll on narrow screens rather than card-stacks
- Authenticated Lighthouse not run (session cookie automation); identity HTML scans used instead
- Stripe legal company name still iScream Studio INC in KYC

## 14. Lighthouse (measured)

| Page | Accessibility | SEO |
|---|---|---|
| Homepage | **96** | **100** |
| Pricing | **94** | **93** |
| Login | **96** | **86** |

(Chromium headless; cleanup EPERM noise on Windows temp dirs did not invalidate scores.)

## 15. Tests

- `internal-identity.test.ts` added
- Full `npm test`: **149 pass** (pre-follow-up); typecheck clean
- Live identity QA script: **OVERALL_PASS** after contact fix

## 16. Files changed

`terms/page.tsx`, `privacy/page.tsx`, `settings/team/route.ts`, `internal-identity.ts` + test, `builder.tsx`, `mobile-app-nav.tsx`, `settings/page.tsx`, SES follow-up draft, this doc.

## 17. Production health

`{"status":"ok","checks":{"app":"ok","database":"ok","redis":"ok"}}`  
Flags locked as required.

## 18. Commit hash

`b79eed6a71f9255729b89d7c9c7630dd1565b2ae` (includes `f726e60` identity/builder fixes)

## 19. Rollback

```bash
cd /opt/sendfable && git revert f726e60 --no-edit && docker compose -p sendfable -f docker-compose.prod.yml up -d --build app worker
# Optional: restore contact email only if needed (not recommended)
```

## 20. Exact remaining launch blockers

1. SES production access — submitted/open, awaiting AWS  
2. Controlled production-send test (after SES)  
3. Stripe Dashboard: confirm invoice/receipt legal-name / branding for `company.name` (iScream Studio INC) if customers must never see that legal string  
4. Owner interactive sign-off of authenticated keyboard/zoom checklist (recommended)  
5. Legal review acceptance  
6. Team invites still need Pro seats + SES delivery for real teammates  
