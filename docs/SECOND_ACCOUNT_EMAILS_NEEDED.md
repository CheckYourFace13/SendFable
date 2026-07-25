# Second-account QA — addresses needed from owner

**Do not open public signup.** Accounts will be created via Settings → Team invites
(Workspace A) and a controlled admin invite / owner-assisted Workspace B path
documented when you supply the addresses.

## Required

| Role | Purpose | Address needed |
|---|---|---|
| **Workspace B OWNER** | Second real workspace for cross-tenant isolation tests | One owner-controlled mailbox that can receive magic-link / invite email |

While SES is in sandbox, that address must be an **SES-verified identity** (or wait until production access is approved). Your current verified identity `chris@iscreamstudio.com` is already Workspace A OWNER — do **not** reuse it for Workspace B.

Suggested pattern: a second mailbox you control, e.g. another Hostinger alias or a personal address you can verify in SES console temporarily.

## Optional (recommended for role matrix)

| Role | Purpose | Address needed |
|---|---|---|
| Workspace A **ADMIN** | Team + elevated settings vs MEMBER | Second mailbox (or plus-address) that can accept an invite |
| Workspace A **MEMBER** | Billing/team denial checks | Third mailbox (or plus-address) |

Plus-addresses (e.g. `you+admin@…`) are fine **if** your provider and SES treat them as deliverable and you verify them in SES while sandboxed.

## Not needed from you yet

- Fake customers
- Public signup unlock
- Database ID hand-edits (we will not assign `workspaceId`s manually)

## Reply with

1. Workspace B owner email: `________________@________`
2. (Optional) Workspace A ADMIN email: `________________@________`
3. (Optional) Workspace A MEMBER email: `________________@________`
4. Confirm each can receive mail today, and whether SES verification is already done for each.
