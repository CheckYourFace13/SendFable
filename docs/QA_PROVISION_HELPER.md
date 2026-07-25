# Controlled second-workspace QA — provision helper

**Status:** Single-use, auditable, self-disabling.  
**Do not** open public signup. **Do not** expand this into a general account API.

## Why a helper was required

Supported invite flow (`POST /api/settings/team`) is blocked on the current FREE
plan (`seats: 1` → HTTP 402). Public signup is closed
(`ALLOW_PUBLIC_SIGNUP=false`). SES sandbox also cannot deliver magic links to
`@sendfable.com` aliases until those identities are verified or production
access is approved.

Therefore accounts were created with:

```bash
npx tsx scripts/qa-provision-accounts.ts
```

## What it creates

| Actor | Email | Result |
|---|---|---|
| Workspace A OWNER | `chris@iscreamstudio.com` | Pre-existing (unchanged ownership) |
| Workspace B OWNER | `support@sendfable.com` | New user + new workspace |
| Workspace A ADMIN | `legal@sendfable.com` | New user + ADMIN membership in A |
| Workspace A MEMBER | `privacy@sendfable.com` | New user + MEMBER membership in A |

Passwords are written only to `/root/sendfable-secrets/qa-accounts.env` (mode
`0600`). An `AuditLog` row with action `qa.provision_accounts` is created.

## Disable / re-enable

After a successful run the script writes:

`/root/sendfable-secrets/qa-provision.DISABLED`

Remove that marker only if you intentionally need to re-run.

## Live matrix

```bash
npx tsx scripts/qa-live-matrix.ts
```

Results: `/root/sendfable-secrets/qa-live-matrix-results.json`

## Rollback

```sql
-- Remove QA memberships / users / workspace B (IDs from secrets file)
DELETE FROM "Membership" WHERE "userId" IN (...admin..., ...member..., ...ownerB...);
DELETE FROM "User" WHERE email IN ('legal@sendfable.com','privacy@sendfable.com','support@sendfable.com');
DELETE FROM "Workspace" WHERE id = '<workspace B id>';
```

Do **not** delete Workspace A or `chris@iscreamstudio.com`.
