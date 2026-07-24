# Team roles & MEMBER permission policy

Documented 2026-07-24.

## Roles

Workspace memberships have three roles: `OWNER`, `ADMIN`, `MEMBER`.
Platform administration (cross-workspace) is separate and restricted to the
platform owner (`requirePlatformAdmin`, keyed to `PLATFORM_OWNER_EMAIL`).

## Current enforcement matrix

| Capability | OWNER | ADMIN | MEMBER |
|---|---|---|---|
| Contacts, tags, segments, imports, exports | ✅ | ✅ | ✅ |
| Templates, campaigns (create/send within gates) | ✅ | ✅ | ✅ |
| Sender identities & domains | ✅ | ✅ | ✅ |
| Workspace settings | ✅ | ✅ | ✅ |
| Team invites (settings/team) | ✅ | ✅ | ❌ (route enforces role) |
| Billing checkout / Stripe portal | ✅ | ✅ | ❌ (403 for MEMBER) |
| SES readiness / platform admin APIs | platform owner only | — | — |

MEMBER is a working role (day-to-day marketing work) that cannot manage the
team or money. Plan limits are always evaluated against the **workspace
owner's** plan.

## Launch reality

Only the OWNER account exists in production today; invites are functional but
unexercised with real second users. Team functionality is deliberately basic
and is not advertised as a granular-permissions feature on public pages.
Cross-role live E2E is deferred until a second real user exists; a static
authorization contract test (`src/lib/__tests__/api-authz-contract.test.ts`)
guards that every API route authenticates or is explicitly public-by-design.

## Isolation guarantee

Every workspace-scoped query filters by the session-derived `workspaceId`
(`getApiContext`). Direct-ID access to another workspace's resources returns
404/403 because lookups are `where: { id, workspaceId }`.
