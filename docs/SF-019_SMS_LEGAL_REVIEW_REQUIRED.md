# SF-019 — SMS legal review required

**Status:** Draft policies for internal readiness only. **Not published** as customer-facing legal terms until attorney review.

These drafts describe intended product behavior. They are **not** legal advice and must not be treated as final Terms of Service.

---

## Documents to finalize (hidden drafts)

1. SMS Terms  
2. SMS Acceptable Use Policy  
3. SMS Consent Requirements  
4. SMS Registration Requirements  
5. SMS Billing Terms  
6. SMS Number Policy  
7. SMS Suspension Policy  
8. SMS Data Retention Policy  

Existing related product docs: `docs/SMS_CONSENT_AND_COMPLIANCE.md`, pricing/billing docs. Align final legal copy with product flags and TCR/ISV rules.

---

## Required explanations (product intent)

| Topic | Intent |
|-------|--------|
| Lawful consent | Customer (end business) is responsible for obtaining and documenting lawful consent |
| Purchased lists | Purchased / rented / scraped lists are prohibited |
| Suspension | SendFable may suspend noncompliant messaging and numbers |
| Registration fees | Registration / activation fees may be nonrefundable |
| Rejected / resubmitted | Additional fees for rejected or resubmitted registrations may be charged after disclosure and approval |
| Numbers after cancel | Dedicated numbers may be released after cancellation; portability not guaranteed unless supported |
| STOP | STOP suppression persists across contact delete / reimport |
| Carrier rules | Carrier and registry rules may change; SendFable may require updates |
| Segments | Message costs are per segment; Unicode/emoji can increase segment count |
| Incoming | Incoming allowances apply per billing month; overages billed at disclosed rates |
| Business replies | Business-sent replies are outbound billable segments |
| Data retention | Message bodies and registration data retained per policy / legal holds |
| Registration info | Customer registration information is used for carrier/registry compliance |

---

## ATTORNEY REVIEW REQUIRED

Flag these items for counsel before public publish or customer contracts:

1. **Nonrefundable activation / registration fee language** — consumer protection and refund statutes.  
2. **Pass-through / exceptional carrier fees** — clear consent to charge after approval.  
3. **Indemnification** for customer consent failures and AUP violations.  
4. **TCPA / state mini-TCPA / CTIA / carrier handbook** alignment of disclosure and consent checkbox rules.  
5. **10DLC / toll-free** registration representations (accuracy warranties).  
6. **Number release and non-portability** after cancel or suspension.  
7. **STOP persistence** and suppression across imports — privacy / consumer expectation.  
8. **Data retention and deletion** for message bodies, phone numbers, EIN/BRN (encrypted at rest).  
9. **ISV / CSP relationship disclosures** (SendFable vs end brand).  
10. **International / non-US** expansion (currently US-first) — do not claim global coverage.  
11. **“Approval not guaranteed”** carrier timing language.  
12. **Kill switch / emergency suspension** without prior notice for abuse.  

Do **not** claim:

- Guaranteed carrier approval or delivery rates  
- That SendFable is the message “sender” instead of the end brand where TCR requires end-brand identity  
- That imported numbers imply consent  
- That SMS is available publicly while flags are false  

---

## Draft policy stubs (non-binding)

### SMS Consent Requirements (stub)

Customers must collect affirmative, documented opt-in. SMS consent checkboxes must never be pre-checked. Consent is not a condition of purchase where applicable. Purchased lists are prohibited. STOP must always be honored.

### SMS Billing Terms (stub)

Plans bill monthly fixed fees plus metered outbound segments and inbound overage beyond included allowance. Activation fee is one-time. Bundle discounts apply only to fixed monthly fees for eligible plans with qualifying email subscriptions. Business replies are outbound billable.

### SMS Number Policy (stub)

One dedicated number per registered workspace campaign path. Numbers may be released after cancellation, suspension, or nonpayment. Portability is not guaranteed.

### SMS Suspension Policy (stub)

SendFable may pause sending, suspend registration, or release numbers for AUP violations, unpaid balances, failed registration, or provider/carrier direction.

### SMS Data Retention Policy (stub)

Message metadata and bodies retained for delivery, compliance, and support subject to retention schedules. EIN/BRN stored encrypted; never shown in general admin lists. Suppression records retained to honor STOP.

---

*Generated for SF-019 readiness. Update after counsel review.*
