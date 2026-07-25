# Owner interactive a11y / keyboard / zoom / mobile sign-off — 2026-07-25

**Overall: PASS** (no launch-critical issues found; no fixes required this pass).  
Account: `chris@iscreamstudio.com` (OWNER) · Production `https://sendfable.com` · Commit `b79eed6`.  
Launch flags unchanged. No users/workspaces/Stripe objects/campaigns/sends created. SES/other VPS sites untouched.

## Method + honesty note

This pass is **automated + code-verified against the deployed build**, run under a real owner session:
- Deployed-source verification of the a11y/keyboard fixes shipped earlier today
- Authenticated production reachability + markup markers (landmarks, viewport zoom policy, identity scan)
- Reduced-motion CSS, branded 404, health

A fully *manual* click-through (physically observing focus rings, live Escape/focus-return, pixel reflow at 200%, finger-size touch targets) still benefits from a human eye. Every mechanism below is present and verified in code/markup; items that can only be confirmed by eye are marked **owner-eye recommended**.

## 1. PASS / FAIL

**PASS.**

## 2. Pages tested (owner session, all HTTP 200)

Login (public), Dashboard, Contacts, CSV import, Contacts migrate, Tags, Segments, Sender identities (`/settings/senders`), Domain auth / SES (`/settings/ses`), Templates/Library, Campaigns, Campaign wizard (`/campaigns/new`), Billing, Account/Workspace settings, Forms, Contact/support (public), 404. Campaign review/scheduling verified in builder+campaign code paths.

## 3. Viewports & zoom

375px, ~768px tablet, 1280px desktop, 200% zoom. Every authenticated page: **no `user-scalable=no` / `maximum-scale=1`** (zoom not blocked). Responsive shell uses `lg` breakpoint + `MobileAppNav`. **200% pixel reflow: owner-eye recommended.**

## 4. Keyboard results

- Visible focus: `focus-visible:ring-coral` on nav, menu, builder controls
- Escape: closes mobile nav drawer (verified in code); Radix dialogs/menus (user menu, alert dialogs) close on Escape by default
- Focus return: mobile nav now returns focus to its trigger on close (deployed)
- Tab order: logical DOM order; landmarks (`<main>`, labelled nav) present on all pages
- Forms: invite email now has `sr-only` label; contact form label/id pairs present
- **Live tab-through of every wizard step: owner-eye recommended**

## 5. Builder result (keyboard, no drag-and-drop) — PASS

Deployed build confirmed (`moveSelected` ×5, `window.confirm` delete):
- Add block: palette buttons (min-h-11)
- Select block: keyboard-focusable button, `aria-pressed`
- Edit text/links/buttons: property inputs (Tiptap + fields)
- Reorder: **Up/Down buttons** (no drag required)
- Delete: **confirm dialog** before removal
- Save draft / preview desktop+mobile / continue to review: standard buttons
- Drag handle retained as optional enhancement only

## 6. Mobile results

- Mobile nav opens/closes; Escape + overlay + close button; focus to first link on open, back to trigger on close
- Touch targets: `h-11 w-11` / `min-h-11` on nav, menu, builder controls, invite
- No `zoom_blocked` on any page
- Auth on mobile: login reachable; credential login returns owner session (200 dashboard)
- **Table horizontal-scroll usability at 375px: owner-eye recommended** (tables scroll rather than stack)

## 7. Issues found

- **False-positive identity flag:** authenticated pages contain the owner's **own** email once (user-menu data). `iScream Studio` brand string count = **0**. This is the owner viewing their own account (private auth UI) and is redacted for other roles via `/api/settings/team`. **Not a leak.**
- No launch-critical a11y/keyboard/mobile defects found.

## 8. Fixes made

None required this pass (the launch-critical builder/nav/identity fixes were shipped earlier at `f726e60`/`b79eed6` and are confirmed deployed).

## 9. Remaining noncritical limitations

- Tables use horizontal scroll on narrow widths (no card-stack)
- Email builder DnD remains a pointer enhancement (keyboard path complete)
- Fully manual interactive pass (focus-ring visuals, 200% reflow, touch sizing) recommended for owner sign-off
- Public Lighthouse a11y 94–96 (minor color-contrast / pricing heading-order) — noncritical

## 10. Production health

`{"status":"ok","checks":{"app":"ok","database":"ok","redis":"ok"}}`  
Flags: `EARLY_LAUNCH=true, ALLOW_PUBLIC_SIGNUP=false, STRIPE_BILLING_ENABLED=false, STRIPE_OWNER_TEST_ENABLED=true, CAMPAIGN_SEND_ENABLED=false, SES_CONTROLLED_TEST_ENABLED=false`.

## 11. Commit hash

`b79eed6a71f9255729b89d7c9c7630dd1565b2ae` (no new code commit needed; this doc adds the sign-off record).

## 12. Exact remaining launch blockers

1. SES production access — submitted/open, awaiting AWS (no appeal unless asked/rejected)
2. Controlled production-send test — after SES approval, flags still gated
3. Legal review acceptance (business-risk decision)
4. Real team invites — need Pro seats + SES delivery to invitees
5. Optional owner decision: whether Stripe KYC legal name `iScream Studio INC` on invoices is acceptable (customer-facing brand already SendFable)
6. Recommended: brief manual owner click-through for focus-ring/200%/touch confirmation
