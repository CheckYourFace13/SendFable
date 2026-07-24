# Accessibility & mobile audit — 2026-07-24

Launch flags unchanged. Early-access wording retained. Authenticated app screens
were spot-checked via markup/contracts where a live second session was not
available; public pages were measured with Lighthouse and production probes.

## Lighthouse (homepage, production, desktop headless)

| Category | Score |
|---|---|
| Performance | **90** |
| Accessibility | **97** (before contrast fixes; re-measure after deploy) |
| Best practices | **100** |
| SEO | **100** |

Core Web Vitals / lab metrics:

| Metric | Value | Score |
|---|---|---|
| FCP | 1.1 s | 100 |
| LCP | 3.6 s | 60 |
| TBT | 10 ms | 100 |
| CLS | 0 | 100 |
| Speed Index | 2.8 s | 96 |
| TTI | 3.6 s | 91 |

Raw JSON: `docs/lighthouse-home-2026-07-24.json`

### Color contrast (launch-critical)

Lighthouse axe reported **74** contrast failures on the homepage, dominated by:

1. Off-white (`#FFFDF8`) text on coral (`#F26A4F`) CTAs (~2.97:1)
2. Muted `text-ink/50`–`/60` on page/parchment (~3.1–4.1:1)
3. Small coral labels on light backgrounds

**Fixes shipped in this pass (pending deploy):**

- Added `coral.solid` (`#C44732`) and darker `coral.hover` for interactive fills with white text
- Switched marketing/auth CTAs from `bg-coral text-page` → `bg-coral-solid text-white`
- Lightened announcement-bar link on ink for contrast
- Bumped several muted labels toward `/70`
- Login Suspense now has a visible fallback (was blank SSR shell)
- Auth layout sets `robots: noindex,nofollow`

Re-run Lighthouse after deploy to confirm contrast score recovery. Remaining
decorative mock UI text may still fail AA at 10px — treat as polish, not gate,
unless they remain actionable controls.

## Production probes (no browser automation)

Verified live:

- Viewport meta on public + auth pages
- Landmarks: `header`, `nav[aria-label=Primary]`, `main`, footer present
- Mobile menu button: `aria-label`, `h-11 w-11` (44px) touch target
- Mobile nav dialog: `role=dialog`, `aria-modal`, focus trap code present
- Pricing toggle: `role=group`, `aria-label=Billing period`, `aria-pressed`
- Form labels on `/early-access` and `/contact` (`for`/`id` pairs)
- `prefers-reduced-motion` and `:focus-visible` present in shipped CSS
- No large fixed `min-width` overflow offenders in HTML

### Login SSR note

`/login` is a client component behind `useSearchParams` Suspense. Before this
pass the fallback was empty (labels missing from initial HTML). Fallback now
announces “Welcome back / Loading sign-in…”. Full labeled fields appear after
hydration; acceptable for launch with the fallback fix.

## Authenticated app screens

Not fully keyboard-audited in a live owner session this pass (no second
account; owner session not automated). Code review confirms:

- App sidebar `nav` landmark + focus rings
- Builder usability limitations remain honestly incomplete (drag/keyboard) —
  documented historically in `KNOWN_LIMITATIONS.md`
- Billing/dashboard routes remain behind login redirect when logged out

**Owner follow-up:** after deploy, manually verify dashboard, contacts, builder,
campaign, and billing at 375px and 1280px widths with keyboard + 200% zoom.

## Reduced motion

`globals.css` gates motion under `prefers-reduced-motion: no-preference` and
disables animation under `reduce`.

## Builder

Marketing builder showcase is presentational. In-app email builder keyboard
accessibility remains a known limitation — do not claim WCAG-complete builder
UX at launch.

## Verdict for this area

Public site is close after contrast fixes; **not** a free pass for broad launch.
Authenticated mobile/a11y still needs an owner-session pass. LCP ~3.6s is a
performance polish item, not a security/compliance gate.
