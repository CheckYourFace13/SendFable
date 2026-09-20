# Second-tenant SMS E2E checklist (non-owner)

Run on staging or a controlled prod pilot workspace that is **not** the Casey/owner pilot.

Workspace under test: ________________  
Date: ________________  
Operator: ________________

## Preconditions

- [ ] Owner pilot workspace remains intact (Casey From identity unchanged)
- [ ] Flags for this tenant path match the ladder in `SMS_PUBLIC_FLAG_LADDER.md` (PUBLIC still false for dark runs)
- [ ] Stripe test or authorized live catalog present
- [ ] Mock provider off only when intentionally testing live Telnyx

## Flow

1. [ ] Sign up / use a **second** workspace (non-owner)
2. [ ] Open Text Messaging setup — no Telnyx/TCR jargon in UI
3. [ ] Save business + use case + consent disclosure
4. [ ] Submit for approval
5. [ ] Admin approve / registration reaches choose_number
6. [ ] Customer claims number (optional area code)
7. [ ] Create Text campaign → send to owned handset
8. [ ] Reply STOP → suppressed; HELP → tenant brand (never owner `iScream Studio` leak)
9. [ ] Reply START (if supported) restores opt-in per product rules
10. [ ] Create Both campaign (1 email + 1 SMS) → both deliver
11. [ ] Report shows SMS sent/delivered/failed + opt-outs without double-counting email

## Pass criteria

All boxes checked; HELP identity = customer brand/DBA; no owner brand leakage; PUBLIC flag still false until Phase N owner approval.
