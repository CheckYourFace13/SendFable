# Legal & policy status (INTERNAL)

Updated 2026-07-26.

## Honesty statement (required)

These documents were **technically audited and tailored to the current SendFable
product**. They were **not reviewed or approved by qualified legal counsel**.
Professional review remains **recommended before broad public launch**. No
public or internal statement should imply attorney approval. Completing this
audit does **not** mean public launch is ready.

## Legal operator

| Question | Finding |
|---|---|
| Stripe KYC / legal entity | `iScream Studio INC` (documented from live Stripe account audit) |
| Public product name | SendFable |
| Registered DBA / assumed name for “SendFable”? | **Not verified** — do not claim d/b/a |
| Wording used in legal docs | **Approved:** “SendFable is a service operated by iScream Studio INC” |
| Where entity appears | Terms, Privacy, AUP, Refund, Security — legal / billing contexts only |
| Marketing / ordinary product branding | Remains SendFable only |

Record: `docs/OWNER_LEGAL_DECISIONS_PENDING_2026-07-25.md`.

## Governing law

**Illinois not verified** from project records or Stripe company address (state null).
Terms §18 remains without a named state. No arbitration / class-action waiver.

**Proof still needed:** Illinois SOS File Detail Report / Certificate of Good Standing
for iScream Studio INC (file number, Illinois jurisdiction, status) — see owner decision record.

## Public documents (live)

| Document | Route | Version |
|---|---|---|
| Terms of Service | `/terms` | 2026-07-26 |
| Privacy Policy | `/privacy` | 2026-07-26 |
| Acceptable Use & Anti-Spam | `/acceptable-use` | 2026-07-26 |
| Billing, Renewal, Cancellation & Refund | `/refund-policy` | 2026-07-26 |
| Security & responsible disclosure | `/security` | 2026-07-26 |
| Cookie disclosure | `/cookies` | 2026-07-26 |
| Contact & legal notice mailboxes | `/contact` | — |

Policy bundle constant: `CURRENT_POLICY_BUNDLE = 2026-07-26` in
`src/lib/legal-policies.ts`. Historical `PolicyAcceptance` rows are preserved;
soft reacceptance prompts for the new bundle.

## Refund posture (owner-approved 2026-07-26)

See `REFUND_POSTURE_SUMMARY` in `src/lib/legal-policies.ts` and `/refund-policy`.
Unconditional “will refund first charge in full” wording was removed.

## Pricing / billing consistency

Verified from `src/lib/plans.ts` (catalog revision 2026-07-25):

| Plan | Monthly | Annual | Contacts | Emails/mo | Seats (code) | Badge |
|---|---|---|---|---|---|---|
| Free | $0 | — | Up to 500 | Up to 1,000 | 1 | required |
| Starter | $12 | $120 | Up to 2,500 | Up to 10,000 | 1 | none |
| Growth | $29 | $290 | Up to 10,000 | Up to 40,000 | 1 | none |
| Pro | $69 | $690 | Up to 20,000 | Up to 80,000 | 5 | none |
| Pro Plus | $99 | $990 | Up to 40,000 | Up to 200,000 | 10 | none |

Seats are **not** advertised on public pricing. “Up to 10” is seats only — never a badge value.

## Open owner items

1. Supply Illinois (or other) formation proof before governing-law wording is deployed.
2. Qualified attorney review before removing early-access posture / broad launch.
3. SES case `178491867800933`: **AWS requested additional information — awaiting owner response** (see `docs/SES_CASE_REVIEW_OWNER_INSTRUCTIONS.md`). No automated appeal.
4. Controlled SES production-send test — prepared, not run (`docs/SES_CONTROLLED_PRODUCTION_TEST_PLAN.md`).
5. Final launch activation — prepared, not run (`docs/FINAL_LAUNCH_ACTIVATION_CHECKLIST.md`).
6. Launch flags remain locked (see `docs/PRE_APPROVAL_READINESS_2026-07-26.md`).
7. Optional: confirm Stripe invoice/KYC legal-name visibility of “iScream Studio INC”.
