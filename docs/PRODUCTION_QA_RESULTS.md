# Production QA results — second workspace & roles

**Date:** 2026-07-25  
**Environment:** Live production (`https://sendfable.com`)  
**Verdict:** Isolation and role gates **PASS** (58/58 live checks).  

Launch flags were **not** changed.

## 1. Accounts and workspaces created

| Actor | Email | Workspace | Role |
|---|---|---|---|
| Workspace A OWNER | `chris@iscreamstudio.com` | Sendfable (`cmrry4tfe0001aqx1xw328ghq`) | OWNER (pre-existing) |
| Workspace B OWNER | `support@sendfable.com` | SendFable QA Workspace B (`cms0kvs9k00033gne6uxqvnu2`) | OWNER (new) |
| Workspace A ADMIN | `legal@sendfable.com` | Sendfable (A) | ADMIN (new) |
| Workspace A MEMBER | `privacy@sendfable.com` | Sendfable (A) | MEMBER (new) |

Provision method: one-shot `scripts/qa-provision-accounts.ts` (see `docs/QA_PROVISION_HELPER.md`).  
Invite UI could not be used: FREE plan `seats=1` → HTTP 402; public signup closed; SES sandbox cannot deliver to `@sendfable.com` aliases yet.

## 2. Authentication method

- **Primary for matrix:** Auth.js JWT session cookies minted with `NEXTAUTH_SECRET` (ops-only; passwords never logged).
- **Smoke:** Credentials login (`POST /api/auth/callback/credentials`) succeeded (302) for B OWNER, ADMIN, and MEMBER.
- Workspace selection via `sf_workspace` cookie (membership-validated).

## 3. Tenant-isolation matrix

| Check | Result |
|---|---|
| B read/list/patch/delete A contact by ID | **PASS** (404 / no leak) |
| B read/patch A campaign + recipients by ID | **PASS** (404 / no leak) |
| B list/export excludes A data | **PASS** |
| B JSON `workspaceId` body injection | **PASS** (ignored; resource stays in B) |
| B spoofed `sf_workspace` = A | **PASS** (404) |
| Logged-out export reuse | **PASS** (401; no durable export token) |
| Guessed upload URL | **PASS** (404) |
| Upload by exact URL | **PASS / by design** — `/uploads/` is public for email CDN images; filenames are opaque |

## 4. Role-permission matrix

| Action | OWNER | ADMIN | MEMBER | Notes |
|---|---|---|---|---|
| Contacts / campaigns / import (day-to-day) | allow | allow | allow | **PASS** |
| Team invite | plan-gated 402 | plan-gated 402 | **deny 403** | FREE seats=1 |
| Billing checkout | *not POSTed* (Stripe customer exists) | **deny 403** (owner-test gate) | **deny 403** | |
| Billing portal | *not POSTed* | **400** no customer (no Stripe object) | **deny 403** | |
| Workspace settings PATCH | allow | allow | **deny 403** | **PASS** |
| Workspace DELETE | OWNER only | **deny 403** | **deny 403** | **PASS** |
| Sender identity create | allow | allow | **deny 403** | **PASS** |
| Platform `/api/admin/*` | allow | **deny 403** | **deny 403** | B also deny |
| Ownership transfer | N/A | N/A | N/A | Not implemented |
| API keys | N/A | N/A | N/A | Not implemented |
| Support messages | Public POST only | — | — | No workspace inbox API |

**Documented ADMIN billing policy:** Route allows OWNER/ADMIN past the MEMBER check. With `STRIPE_BILLING_ENABLED=false` and `STRIPE_OWNER_TEST_ENABLED=true`, only `chris@iscreamstudio.com` can create Checkout Sessions. ADMIN is therefore **denied by the billing gate** today, which matches the locked launch posture.

## 5. Vulnerabilities found

None that leak cross-tenant data.  

**Note (not a regression):** uploaded images under `/uploads/{workspaceId}/{opaque}` are publicly fetchable by design so email clients can load them. Do not store sensitive non-email assets there.

## 6. Fixes made

No production authz fixes required (matrix all green). Added:

- `scripts/qa-provision-accounts.ts` (self-disabling)
- `scripts/qa-live-matrix.ts`
- `src/lib/__tests__/role-permission-policy.test.ts`
- `docs/QA_PROVISION_HELPER.md`
- this results doc

## 7. Tests added and results

| Suite | Result |
|---|---|
| Live matrix (`qa-live-matrix.ts`) | **58/58 PASS** |
| Unit `role-permission-policy.test.ts` | included in `npm test` → **146/146 PASS** |
| Existing authz contract + isolation contract | still green |

## 8. Test data created or removed

**Kept:** three QA users, Workspace B, memberships, audit log `qa.provision_accounts`.  
**Removed after run:** B contacts/tags/segments/campaigns/templates created during the matrix; MEMBER draft campaign in A.  
Secrets: `/root/sendfable-secrets/qa-accounts.env` (host + container copy).  
Provision disabled: `/root/sendfable-secrets/qa-provision.DISABLED`.

## 9. Health status

`GET /api/health` → 200 during/after run. Launch flags unchanged:

```
EARLY_LAUNCH=true
ALLOW_PUBLIC_SIGNUP=false
STRIPE_BILLING_ENABLED=false
STRIPE_OWNER_TEST_ENABLED=true
CAMPAIGN_SEND_ENABLED=false
SES_CONTROLLED_TEST_ENABLED=false
```

## 10. Commit hash

`7bcddb8104a40d1f4bdaf54ce423794fba238fbf` (`7bcddb8`)

## 11. Rollback instructions

```bash
# On VPS (IDs also in /root/sendfable-secrets/qa-accounts.env)
docker exec -i sendfable-postgres psql -U sendfable -d sendfable <<'SQL'
DELETE FROM "Membership" WHERE "userId" IN (
  'cms0kvrs400003gnefkgsp3xw', -- support@
  'cms0kvs0w00013gnelc778i8z', -- legal@
  'cms0kvs9c00023gne9m898xuf'  -- privacy@
);
DELETE FROM "User" WHERE email IN (
  'support@sendfable.com',
  'legal@sendfable.com',
  'privacy@sendfable.com'
);
DELETE FROM "Workspace" WHERE id = 'cms0kvs9k00033gne6uxqvnu2';
SQL
```

Do **not** delete Workspace A or `chris@iscreamstudio.com`.

## 12. Exact remaining blockers

1. SES case **178491867800933** — Submitted/open — awaiting AWS review (no appeal unless asked/rejected).
2. Controlled production-send test — blocked on SES approval + flags.
3. Team invites for real teammates — need Pro seats (or temporary plan bump) **and** SES delivery to invitees.
4. Owner auth a11y checklist (manual).
5. Legal review acceptance (business risk).
6. Stripe Dashboard privacy/terms URL visual confirmation (API fields already PASS).
