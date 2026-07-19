# Known limitations

Honest inventory of what is incomplete, thin, or environment-dependent as of 2026-07-19.

## Product

- **Contact detail edit UI** — PATCH API exists; no dedicated contact edit page.
- **Hosted landing-page builder** — `LandingPage` model exists; no editor UI beyond signup forms at `/f/[slug]`.
- **Shareable template public pages** — `Template.shareSlug` seeded for platform templates; no public `/t/[slug]` viewer yet.
- **Public campaign archive UX** — route `/a/[slug]` renders opt-in archives; workspace/campaign toggles in settings UI are minimal/partial (schema flags exist).
- **Follow-up kinds in UI** — report supports delivered-no-engagement, clicked-any, newly-subscribed; link-specific and exclude-recently-contacted are API-ready but not fully exposed in UI.
- **Brand settings outside onboarding** — brand import + onboarding save work; dedicated brand settings PATCH surface is limited.
- **Admin hold UI** — `sendingHeldAt` enforced in quota/confidence; no in-app admin console to set/clear holds (DB/manual only).
- **Audit log UI** — writes exist for some actions; no owner-facing audit browser.
- **SNS signature verify in local fixtures** — strict by default; set `SNS_VERIFY_STRICT=false` for fixture tests without Amazon certs.
- **SES readiness screen** — reports env/connectivity flags; does not call AWS live APIs to read sandbox/production or DKIM state (by design — no live AWS changes from the app without credentials, and readiness avoids secret exposure).

## SEO / marketing

- Competitor pricing in `src/data/competitor-pricing.ts` is a dated snapshot — not live.
- Industry/compare pages are substantial but not a substitute for ongoing editorial review.
- Image sitemap not separate (single `sitemap.ts`).

## Infra / tests

- **Docker Compose** not validated on this host (Docker CLI missing).
- **Integration / E2E suite** is thin — unit tests cover merge, confidence, SSRF, SNS URL allowlist, HTML sanitize, migration presets, isolation contract helpers. No Playwright auth E2E suite in CI.
- **Redis** optional locally; queue falls back to inline processing.
- Open rates are estimates (privacy proxies); product copy states this on reports.

## Security posture notes

- Workspace isolation is enforced in API queries by `workspaceId`; automated cross-tenant HTTP tests are not yet comprehensive.
- Raw HTML is sanitized on save/compile paths; sanitizer is regex/heuristic MVP, not a full HTML policy engine.
- Do not expose AWS secret keys in client code or public docs (not done; keep it that way).
