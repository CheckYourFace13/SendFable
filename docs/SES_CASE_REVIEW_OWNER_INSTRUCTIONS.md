# SES case review — owner instructions (do not appeal automatically)

**Case ID:** `178491867800933`

## Owner-visible classification (2026-07-26)

**AWS requested additional information and is waiting for the owner response.**

Do **not** treat the SES API `ReviewDetails.Status=DENIED` enum alone as a final Support denial letter.  
Do **not** describe the case as finally denied unless AWS later sends an explicit denial message.  
Do **not** submit another production-access request.  
Do **not** send an automated appeal from this environment.

## Latest read-only API snapshot

| Field | Value |
|---|---|
| ProductionAccessEnabled | `false` |
| SendingEnabled | `true` |
| EnforcementStatus | `HEALTHY` |
| ReviewDetails.Status | `DENIED` (API enum) |
| CaseId | `178491867800933` |

## Where to open AWS Support Center

1. Sign in to the **AWS account that owns the SendFable SES identities** (same account used by production `/opt/sendfable` AWS keys — not another VPS app’s account).
2. Open **AWS Support Center**:  
   https://support.console.aws.amazon.com/support/home  
   (or AWS Console → search “Support” → **Support Center**).
3. Open **Your support cases** / case history.
4. Find case **`178491867800933`**.
5. Read **all correspondence** — especially AWS’s request for additional information.
6. Reply in-thread with the requested details. Adapt  
   `docs/SES_PRODUCTION_ACCESS_FOLLOWUP_DRAFT.md`  
   to answer what AWS actually asked.
7. Optionally confirm SES console identity/DKIM status remains healthy.

## After you respond

- Wait for AWS. Do not open a second production-access case.
- When `ProductionAccessEnabled=true`, run the controlled send test only after the authorization phrase in  
  `docs/SES_CONTROLLED_PRODUCTION_TEST_PLAN.md`.

## Related

- Consolidation: `docs/PRE_APPROVAL_READINESS_2026-07-26.md`
- API-vs-correspondence note: `docs/SES_CASE_STATUS_CORRECTION_2026-07-25.md`
