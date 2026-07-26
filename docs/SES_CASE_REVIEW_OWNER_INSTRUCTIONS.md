# SES case review — owner instructions (do not appeal automatically)

**Case ID:** `178491867800933`  
**API status (treat as denial unless Support Console shows otherwise):**

| Field | Value |
|---|---|
| ProductionAccessEnabled | `false` |
| SendingEnabled | `true` |
| EnforcementStatus | `HEALTHY` |
| ReviewDetails.Status | `DENIED` |
| CaseId | `178491867800933` |

**Do not** submit another production-access request.  
**Do not** send an appeal or paste the follow-up draft until you have read AWS’s stated reason.

## Where to open AWS Support Center

1. Sign in to the **AWS account that owns the SendFable SES identities** (same account used by production `/opt/sendfable` AWS keys — not another VPS app’s account).
2. Open **AWS Support Center**:  
   https://support.console.aws.amazon.com/support/home  
   (or AWS Console → search “Support” → **Support Center**).
3. Open **Your support cases** / case history.
4. Find case **`178491867800933`** (SES / production access / account review related).
5. Read **all correspondence**, attachments, and the denial reason end-to-end.
6. Optionally also check **Amazon SES** → Account dashboard / sending statistics for any in-console notices that mirror the denial.

## After you read AWS’s reason

- Decide whether a reply is warranted.
- If yes, use the preserved draft only: `docs/SES_PRODUCTION_ACCESS_FOLLOWUP_DRAFT.md`  
  **Edit it to address AWS’s stated reason** before sending.
- If AWS asks for different information, answer that — do not open a second production-access case.

## Related

- Follow-up draft status header should reflect **DENIED / awaiting owner review of correspondence**, not “submitted/open awaiting review.”
- Campaign send and SES controlled-test flags remain **off** until production access is resolved and owner re-authorizes testing.
