# SES case status correction — 2026-07-25

## Why earlier reports said “DENIED”

On 2026-07-24, `GetAccount` (SES v2, `us-east-1`) returned:

```json
"Details": {
  "ReviewDetails": {
    "Status": "DENIED",
    "CaseId": "178491867800933"
  }
}
```

That **API field value** was reported as a denial. It was **not** inferred from
`ProductionAccessEnabled=false` alone (sandbox accounts always show that until
production access is enabled).

AWS documents `ReviewDetails.Status = DENIED` as: production access has been
denied after review. We treated that literally.

## Re-check on 2026-07-25

The same field is **still** returned as `DENIED` with the same `CaseId`.

Separately:

- Owner inbox evidence: AWS email only confirms a **new Support case was opened**
  (`You have opened a new Support case: 178491867800933`) — not a denial letter.
- Support API (`support:DescribeCases` / `DescribeCommunications`): **AccessDenied**
  for IAM user `sendfable-ses-production`. Case messages cannot be listed from this
  environment. Owner must read the case in the AWS Console / Support Center.

## Correct operational classification (updated 2026-07-26)

**AWS requested additional information and is waiting for the owner response.**

The SES API may still return `ReviewDetails.Status=DENIED`. That enum alone is **not**
treated as a final Support denial letter. Do not describe the case as finally denied
unless AWS later sends an explicit denial message.

Do **not**:

- Submit an automated appeal
- Open another production-access request
- Paste the follow-up draft without reading AWS’s exact questions

Owner instructions: `docs/SES_CASE_REVIEW_OWNER_INSTRUCTIONS.md`  
Follow-up draft (unsubmitted): `docs/SES_PRODUCTION_ACCESS_FOLLOWUP_DRAFT.md`  
Consolidation: `docs/PRE_APPROVAL_READINESS_2026-07-26.md`

## Field snapshot (re-checked 2026-07-25 via `aws sesv2 get-account --region us-east-1`)

| Field | Value |
|---|---|
| ProductionAccessEnabled | false (sandbox; not by itself a denial) |
| EnforcementStatus | HEALTHY |
| SendingEnabled | true |
| SendQuota | Max24HourSend 200, MaxSendRate 1, SentLast24Hours 5 |
| Details.ReviewDetails.Status | DENIED *(API enum present; do not equate to Support correspondence)* |
| Details.ReviewDetails.CaseId | 178491867800933 |
| Support DescribeCases / DescribeCommunications | AccessDenied for IAM `sendfable-ses-production` (no `support:*`) |

Original request timestamp and AWS reply text/timestamps are **not** available via this IAM user. Owner inbox: case-opened notification only.
