# Authenticated mobile / accessibility check — 2026-07-24

## Launch-critical fix shipped 2026-07-24 evening

**Mobile app navigation was missing** below the `lg` breakpoint (sidebar
`hidden lg:flex` with no drawer). Added `MobileAppNav` (dialog drawer, Escape,
focus to first link, 44px targets) and enlarged the user-menu trigger to
`h-11 w-11`.

Owner should still complete the checklist below after deploy.

A full interactive owner-session browser pass (keyboard + zoom across dashboard,
builder, billing) was **not automated** in this pass: no second session cookie
and no password automation against production. Findings below combine:

1. Production markup/CSS review of authenticated shell components
2. Prior public Lighthouse results
3. Code-level fixes for known launch-critical patterns
4. A checklist for the owner to complete in ~15 minutes

## Fixes applied / verified in code

| Area | Status |
|---|---|
| App sidebar focus rings | Present (`focus-visible:ring`) |
| App nav landmark | `aria-label="Workspace"` |
| Touch targets in marketing header | `min-h-11` / `h-11 w-11` |
| Auth pages noindex | Auth layout `robots: noindex` |
| Login Suspense fallback | Visible “Welcome back / Loading…” |
| Coral CTA contrast | `coral-solid` + white text |
| Contact form labels | `for`/`id` pairs |

## Builder keyboard limitation (honest)

Full drag-and-drop keyboard parity for the email builder is **not** practical
before launch. Documented as a known limitation: pointer-first block
reordering; keyboard users can still edit fields, change structure via
controls where exposed, and use Simple Mode. Do not claim WCAG-complete
builder DnD.

## Owner checklist (required before flipping launch flags)

Using the existing owner account in Chrome/Firefox:

**Widths:** 375px, 768px, 1280px, and 200% zoom at 1280px.  
**Input:** keyboard-only for one full pass.

- [ ] Dashboard — no horizontal overflow; checklist actionable
- [ ] Contacts list + contact detail — table/scroll usable at 375px
- [ ] CSV import wizard — steps reachable; file input labeled
- [ ] Sender identities — DNS instructions readable at 200% zoom
- [ ] Email builder — blocks addable; document DnD keyboard gap if stuck
- [ ] Campaign wizard — next/back focus order sane; modals trap focus
- [ ] Reports/analytics — charts don’t clip critical numbers at 375px
- [ ] Billing — portal/checkout buttons reachable; MEMBER denial N/A for owner
- [ ] Settings — team invite form labeled; workspace fields usable
- [ ] `/contact` — form submit + mailto links work on mobile

Record failures in a new dated note under `docs/` if any are launch-critical.
