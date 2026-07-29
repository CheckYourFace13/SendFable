# SF-014 — Growth automation controlled testing

| Field | Value |
|-------|-------|
| Reference | SF-014 |
| Date | 2026-07-29 |
| General nurture | **Still inactive** (`NURTURE_GENERAL_ENABLED=false`) |
| Referral credits | **Still inactive** |
| Partner outreach | **0 sent** |
| Social posts | **0** |

## Nurture controlled test

| Constraint | Value |
|------------|-------|
| Max recipients | 2 (allowlist) |
| Max emails this pass | 12 |
| Sequences sampled | lead, free-activation, inactive, free-to-paid, mailchimp-migration |
| Test mode | `NURTURE_TEST_MODE=true` |

### Verified behaviors

| Behavior | Result |
|----------|--------|
| Allowlist restriction | Pass (non-allowlist blocked) |
| Marketing consent required for lead/migration | Pass |
| Admin hold | Pass |
| Duplicate step blocked | Pass |
| General activation remains false | Pass |
| Masked recipient logging | Pass |
| Unsubscribe header present | Pass |
| Sender = platform From; Reply-To owner alert | Pass |
| Classification marketing vs product_onboarding | Pass |

### Controlled emails sent

Filled after VPS run (masked). Target ≤12.

### Remaining approval

Do **not** activate general nurture without exact phrases:

- `APPROVE LEAD NURTURE`
- `APPROVE FREE-USER NURTURE`

## Referral controlled test

| Check | Result |
|-------|--------|
| `REFERRAL_CREDITS_ENABLED` | false |
| Monetary credits issued | **0** |
| Proposed credit | $10 (1000¢) after 30 paid days |
| Self-referral / paid helper gate | Pass |

### Owner proposal (inactive)

- Reward: $10 account credit after referred customer completes 30 paid days
- Prefer Growth+ for sustainability on Starter margins (see SF-009 economics)
- Cap: ≤$25 without engineering change
- Fraud: self-referral block, one credit per referred user, admin monthly review
- Activation phrase required: `APPROVE REFERRAL CREDITS`

## Partner form controlled test

| Check | Result |
|-------|--------|
| `/partners` live | Yes |
| Validation + honeypot + rate limit | Yes |
| Auto-approval | No |
| Auto-outreach | No |
| QA application | One owner-labeled application; archive/delete after |

Activation phrase for outreach: `APPROVE PARTNER OUTREACH` (not granted).
