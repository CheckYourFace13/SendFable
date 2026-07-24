# Known limitations

## Status update — 2026-07-24 evening (owner-controlled follow-up)

**Verdict:** NO-GO for broad public launch. CONDITIONAL readiness for controlled private testing.

AWS is **not** the only incomplete item. Remaining non-AWS blockers: SendFable mailboxes, Stripe support fields, off-host backups, second-workspace live QA, authenticated mobile/a11y owner pass, and legal-review acceptance. See `docs/READINESS_VERDICT_2026-07-24.md`.

- SES appeal draft ready (not submitted): `docs/SES_APPEAL_CASE_178491867800933.md`
- Email routing proposal (Hostinger MX already live; no DNS publish yet): `docs/EMAIL_ROUTING_PROPOSAL.md`
- Off-host backup options (SES IAM has no S3): `docs/OFFHOST_BACKUP_OPTIONS.md`
- Second-account QA plan: `docs/SECOND_ACCOUNT_QA_PLAN.md`
- CSP report-only plan (not enforcing): `docs/CSP_REPORT_ONLY_PLAN.md`
- A11y/mobile audit + contrast fixes: `docs/A11Y_MOBILE_AUDIT_2026-07-24.md`

## Status update — 2026-07-24 (production-readiness pass)

Supersedes the 2026-07-19 items below where they conflict. Historical entries
kept unchanged for audit purposes.

Legend: **live-proven** = exercised against real production services;
**integration-tested** = tested against the deployed stack without external
side effects; **unit-tested** = automated tests only; **blocked** = external
dependency; **disabled** = intentionally off for launch safety.

| Area | Status |
|---|---|
| Stripe live billing (products, prices, webhook, portal, checkout, refund) | **Live-proven** 2026-07-24: controlled $9 Starter checkout, webhook fulfillment, cancellation, and full refund all verified. Public billing remains **disabled** (`STRIPE_BILLING_ENABLED=false`, owner-test only). |
| SES identity/pipeline | Configured and verified (domain, DKIM, MAIL FROM, config set, SNS destination). **Blocked**: production access **DENIED** by AWS (case 178491867800933) — account is in sandbox (200/day, 1 msg/s). Owner must appeal/re-request. |
| Campaign sending | Code-complete + unit-tested; **disabled** for public (`CAMPAIGN_SEND_ENABLED=false`) and blocked by SES sandbox for real-world sends. |
| Public signup | **Disabled** (`ALLOW_PUBLIC_SIGNUP=false`, early-access waitlist live). |
| Login callback redirects | Fixed 2026-07-24: centralized `safeCallbackPath` validation (client + Auth.js `redirect` callback), unit-tested against encoded/double-encoded/backslash/scheme bypasses. |
| Tracked-link click redirects | Fixed 2026-07-24: click-time re-validation (`safeClickRedirectUrl`), unsafe targets land on branded `/link-unavailable`, unit-tested. |
| Unknown routes | Fixed 2026-07-24: unknown public URLs return a real branded 404 (noindex); login redirect only for known app sections. |
| Import suppression gap | Fixed 2026-07-24: globally/workspace-suppressed emails can no longer be imported as SUBSCRIBED (`resolveImportStatus`), unit-tested. |
| Password reset | Intentionally absent: recovery is via magic link (see `docs/AUTH_POLICY.md`). Password change UI is **deferred post-launch**. |
| Backups | Automated daily `pg_dump` with integrity checks, 14/60/365-day tiers, and SES owner alerting (see `docs/BACKUPS.md`). Off-host copies **deferred** — single-host failure domain until owner picks offsite storage. |
| Monitoring | 5-minute cron monitor (app, containers, nginx, disk, TLS, backups, queue, stuck campaigns) with de-duplicated SES owner alerts (see `docs/INCIDENT_RUNBOOK.md`). |
| Support channel | `/contact` form stores messages in DB (admin-reviewed). **Blocked/owner decision**: `sendfable.com` has no MX records, so no support/legal/privacy mailbox exists; Stripe support-email field needs a real mailbox. |
| Analytics | No approved provider. First-party typed event interface exists and is **disabled** (`src/lib/analytics.ts`, `docs/ANALYTICS_DECISION.md`). Do not reuse the RentalNoodle Plausible instance. |
| Legal pages | Terms, Privacy, Acceptable Use, Billing/Refund policy complete technically; **needs qualified legal review** before promotion (see `docs/LEGAL_STATUS.md`). |
| Cross-tenant / role E2E | Static authorization contract test covers all API routes (auth marker or explicit public allowlist). Full multi-user live HTTP E2E remains **deferred** (single OWNER account exists in production). |

## Historical inventory — 2026-07-19 (post product-polish pass)

## Product

- **Email builder polish** — Simple/Advanced modes work; drag handle polish, undo stack, and unsaved-change warnings are still incremental (not full Figma-level builder UX).
- **Hosted landing-page builder** — `LandingPage` model exists; no editor UI beyond signup forms at `/f/[slug]`.
- **Shareable template public pages** — platform templates seeded; no public `/t/[slug]` viewer yet.
- **Public campaign archive UX** — `/a/[slug]` works when enabled; controls are basic.
- **Admin hold UI** — holds enforced in send path; admin can see held users but not yet toggle holds from UI (DB/manual).
- **MEMBER role matrix** — only OWNER account exists in production today; cross-role E2E not fully exercised live.
- **Structured data** — homepage OG tags present; JSON-LD Product/Organization not yet added.
- **Screenshot set** — viewport screenshot pack under `docs/screenshots/product-polish/` may be incomplete until captured post-deploy.

## SEO / marketing

- Competitor pricing snapshots in `src/data/competitor-pricing.ts` are dated — not live scraped.
- Industry/compare pages are template-driven; keep claims conservative.

## Infra / delivery

- **SES inactive** — blank AWS keys; mail goes to console/outbox `.eml` only.
- **Stripe inactive** — blank keys; no charges.
- **Public signup closed** — early-access waitlist only.
- **Redis** required in production Compose; optional locally with inline queue fallback.

## Security posture notes

- Admin APIs require platform owner (`PLATFORM_OWNER_EMAIL` or first user).
- Workspace isolation via `workspaceId` on queries; expand HTTP cross-tenant tests over time.
- Raw HTML sanitized on compile paths (heuristic MVP, not a full HTML policy engine).
