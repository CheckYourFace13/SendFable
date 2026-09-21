# SMS Counsel Review Packet (OPTIONAL)

**Product:** SendFable (ISV / CSP-style SMS tooling; end business is the TCR brand)  
**Purpose:** Optional packet if outside counsel is engaged for additional risk assurance.  
**This packet is not legal advice and does not constitute approval.**  
**Public SMS launch gate:** `docs/SMS_COMPLIANCE_SELF_CERTIFICATION.md` (**REQUIRED**). Outside counsel is **OPTIONAL / RECOMMENDED**, not a Telnyx/TCR/CTIA attorney-approval requirement.

**Public SMS status:** Technically certified under controlled flags; **`SENDFABLE_SMS_PUBLIC_ENABLED=false`**.  
**Packet date:** 2026-09-21  
**Disclosure version in code:** `sms-consent-2026-07-31`

---

## How to use

Use only if engaging counsel. For each item: confirm or redline the **CURRENT LIVE COPY**. Launch may proceed on **self-certification PASS** without completing this packet.

Privacy/Terms SMS sections were added in product copy (2026-09-21). Re-verify live pages after deploy.

---

### 1. SMS consent language (hosted opt-in)

**CURRENT LIVE COPY:**  
`I agree to receive recurring marketing and conversational text messages from ${brand} at the mobile number provided. Message frequency varies. Message and data rates may apply. Consent is optional and is not a condition of purchase. Reply STOP to unsubscribe or HELP for help. View Privacy Policy (${privacy}) and SMS Terms (${terms}). Mobile information will not be sold or shared with third parties for their marketing.`

**ROUTE/FILE:** `src/lib/sms/consent.ts`; `src/app/f/[slug]/form-client.tsx`

**WHY REVIEW IS NEEDED (optional):** TCPA / CTIA disclosure alignment.

---

### 2–5. Hosted framing, HELP, STOP, START

See templates in `src/lib/sms/consent.ts` and behavior in `src/lib/sms/inbound.ts`. Full checklist with PASS/FAIL: `docs/SMS_COMPLIANCE_SELF_CERTIFICATION.md`.

---

### 6. Privacy Policy — SMS section

**CURRENT LIVE COPY:** Privacy Policy §§5 and **5a. Text Messaging (SMS) when enabled**.

**ROUTE/FILE:** `src/app/(marketing)/privacy/page.tsx`

---

### 7. Terms — SMS section

**CURRENT LIVE COPY:** Terms **§7a. Text Messaging (SMS) when enabled**.

**ROUTE/FILE:** `src/app/(marketing)/terms/page.tsx`

---

### 8. Billing / refund — SMS section

**ROUTE/FILE:** `src/app/(marketing)/refund-policy/page.tsx` §7

---

### Quiet hours

**Not implemented.** Not treated as a Telnyx/TCR/CTIA technical launch mandate. Optional counsel topic for state telemarketing statutes.

---

## Counsel response block (optional)

| Overall optional review | Approved / Redline | Initials | Date |
|-------------------------|--------------------|----------|------|
| | | | |

**Counsel name / firm:** ________________  
**Signature / date:** ________________
