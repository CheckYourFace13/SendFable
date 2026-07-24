# Second-account production QA plan

Prepared: 2026-07-24  
**Status:** Plan only. No second account has been created. Public signup remains closed.

## Goal

Prove cross-workspace isolation and role enforcement on the **live** production app without opening public signup or inventing fake customers.

## Accounts required from the owner

| Actor | Needs | Provided by |
|---|---|---|
| Workspace A — OWNER | Existing production owner account | Already exists |
| Workspace A — ADMIN | Invite accepted into Workspace A | Owner invites from Settings → Team |
| Workspace A — MEMBER | Invite accepted into Workspace A | Owner invites from Settings → Team |
| Workspace B — OWNER | Second workspace owned by a second email | **Owner must supply a second real mailbox** |
| Logged-out browser | Incognito / logged-out session | Tester |

### What I need from you before live testing

1. **A second owner-controlled email address** that can receive magic links / invite emails (must be SES-verified while SES is in sandbox, **or** testing waits until production access is approved / the address is verified in SES).
2. Confirmation you will create Workspace B by one of:
   - **Preferred while signup is closed:** owner-assisted DB/admin invite path (platform admin creates the user + workspace), **or**
   - Temporary owner-controlled signup with `ALLOW_PUBLIC_SIGNUP=true` for one minute — **not recommended**; do not do this unless you explicitly approve a timed unlock.
3. Two additional mailboxes (or aliases) for ADMIN and MEMBER invites into Workspace A — can be plus-addresses of your main inbox **only if** SES/magic-link delivery works for them (plus-addressing is distinct; do not assume merge).

Until those addresses exist, this plan stays on paper.

## Isolation matrix (run after accounts exist)

For each resource type below, Workspace B owner attempts Workspace A IDs via URL, body, query, and export token. Expected: **403 or 404**, never data.

| Resource | Read | List | Create | Update | Delete | Export / direct-ID |
|---|---|---|---|---|---|---|
| Workspace settings | ✓ | ✓ | — | ✓ | — | ✓ |
| Contacts | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Imports | ✓ | — | ✓ | — | — | — |
| Tags | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Segments | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Sender identities | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Domains / DNS check | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Templates | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Campaigns | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Campaign recipients / reports | ✓ | ✓ | — | — | — | ✓ |
| Billing status | ✓ | — | — | — | — | — |
| Billing checkout | ✓ | — | ✓ | — | — | — |
| Billing portal | ✓ | — | ✓ | — | — | — |
| Team members / invites | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Uploaded images `/uploads/{workspaceId}/…` | ✓ | — | ✓ | — | — | ✓ |
| Exports (CSV) | ✓ | — | ✓ | — | — | ✓ |
| Platform admin APIs | ✓ | ✓ | — | — | — | — |

## Role matrix (Workspace A)

| Action | OWNER | ADMIN | MEMBER | Logged-out |
|---|---|---|---|---|
| Contacts / campaigns / templates day-to-day | allow | allow | allow | login redirect |
| Team invite / remove | allow | allow* | **deny** | login |
| Billing checkout / portal | allow | allow* | **deny (403)** | login |
| Workspace destructive settings | allow | policy | **deny if restricted** | login |
| Platform admin (`/api/admin/*`) | only platform owner email | deny | deny | 401 |

\* Confirm current `settings/team` and billing routes against live code when running; document any ADMIN vs OWNER difference found.

## Logged-out checks

- Known app route → `/login?callbackUrl=…` with validated callback
- Unknown public URL → real 404
- API without session → 401 JSON
- Tracking / unsubscribe / public form routes remain reachable without session

## Execution rules

- Do **not** set `ALLOW_PUBLIC_SIGNUP=true` unless you send an explicit one-time approval with a time box.
- Do **not** enable `CAMPAIGN_SEND_ENABLED` or charge Stripe.
- Prefer invite + magic-link; SES sandbox can only deliver to verified identities until production access is approved.
- After testing, remove MEMBER/ADMIN test memberships if you do not want them permanent; keep Workspace B only if useful for ongoing QA.
- Record results in `docs/PRODUCTION_QA_RESULTS.md` (to be created when tests run).

## Interim coverage already in place

- Static API authz contract test (`src/lib/__tests__/api-authz-contract.test.ts`)
- Billing MEMBER denial in checkout/portal routes
- Workspace-scoped Prisma queries via `getApiContext()`
- Import suppression + redirect safety unit tests

These are **not** a substitute for the live second-workspace pass above.
