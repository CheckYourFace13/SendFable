# Known limitations

Honest inventory as of 2026-07-19 (post product-polish pass).

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
