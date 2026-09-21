# Legal & policy status (INTERNAL)

Updated 2026-09-21.

## Honesty statement (required)

These documents were **technically audited and tailored to the current SendFable
product**. They were **not reviewed or approved by qualified legal counsel**.
Outside counsel review remains **optional / recommended** for additional risk
assurance. No public or internal statement should imply attorney approval.

**SMS public launch gate:** compliance is gated on
`docs/SMS_COMPLIANCE_SELF_CERTIFICATION.md` (**REQUIRED**), not on a paid
attorney checkbox. No Telnyx / TCR / CTIA rule we rely on requires attorney
approval of the software before SMS launch.

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
| Terms of Service | `/terms` | 2026-09-21 (includes §7a Text Messaging) |
| Privacy Policy | `/privacy` | 2026-09-21 (includes §5a Text Messaging) |
| Acceptable Use & Anti-Spam | `/acceptable-use` | 2026-09-20 |
| Billing, Renewal, Cancellation & Refund | `/refund-policy` | 2026-09-20 |
| Security & responsible disclosure | `/security` | 2026-09-20 |
| Cookie disclosure | `/cookies` | 2026-09-20 |
| Contact & legal notice mailboxes | `/contact` | — |

Policy bundle constant: `CURRENT_POLICY_BUNDLE = 2026-09-21` in
`src/lib/legal-policies.ts`. Historical `PolicyAcceptance` rows are preserved;
soft reacceptance prompts for the new bundle.

## Open owner items

1. Supply Illinois (or other) formation proof before governing-law wording is deployed.
2. Complete SMS compliance self-certification signature (required before public SMS).
3. Optional: engage outside counsel for SMS risk review (recommended, not required).
4. Telnyx funding / auto-recharge before multi-customer registration.
5. Owner approval before `SENDFABLE_SMS_PUBLIC_ENABLED=true`.
