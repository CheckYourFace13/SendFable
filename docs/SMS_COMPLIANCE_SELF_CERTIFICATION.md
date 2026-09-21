# SMS Compliance Self-Certification

**Status:** Authoritative launch gate for public SMS compliance (implementation + factual documentation).  
**Not legal advice. Not attorney approval.** Outside counsel review remains **optional / recommended** for additional risk assurance — it is **not** a Telnyx, TCR, CTIA, or carrier-stated requirement that an attorney must approve SendFable before SMS launch.

**Date:** 2026-09-21  
**Disclosure version:** `sms-consent-2026-07-31`

---

## Gate distinction

| Gate | Status |
|------|--------|
| **REQUIRED for public SMS** | SMS compliance self-certification (this document) = **PASS** |
| **OPTIONAL / RECOMMENDED** | Outside legal review for additional risk assurance |
| **NOT a provider launch blocker** | Paid attorney checkbox as a procedural gate |

### Does any authority require an *attorney* to approve launch?

| Source | Requires attorney approval? | What it actually requires |
|--------|----------------------------|---------------------------|
| Federal TCPA / related rules | **No** (compliance with consent/opt-out rules; not “hire a lawyer”) | Documented consent, clear disclosures, honor STOP, etc. |
| CTIA Messaging Principles | **No** — principles explicitly are **not legal advice**; they recommend counsel as guidance, not a launch permit | Opt-in, disclosures, privacy policy, STOP/HELP, etc. |
| TCR / 10DLC | **No** | Accurate brand/campaign registration, consent evidence, samples |
| Telnyx | **No** | Account funding, compliant registration payloads, keyword handling |
| Carriers | **No** as “attorney sign-off” | Program compliance; fines for violations |

---

## Requirement checklist

Sources used (implementation requirements, not invented):

- CTIA Messaging Principles & Best Practices (opt-in, disclosures, privacy, STOP/HELP)
- Telnyx / TCR 10DLC registration practice (brand identity, samples, consent description)
- SendFable product implementation + controlled live second-tenant certification (2026-09)

### A. Separate SMS consent

**REQUIREMENT:** SMS permission must not be inferred from email permission or phone presence alone.  
**SOURCE:** CTIA opt-in principles; product design.  
**SENDFABLE IMPLEMENTATION:** Independent `smsStatus` / `SmsSuppression`; form sets SMS only when `smsConsent === true`.  
**ROUTE/FILE:** `src/lib/sms/consent.ts`; `src/app/api/forms/submit/route.ts`  
**LIVE TEST:** PASS (unit + second-tenant consent flows)

### B. Checkbox unchecked by default

**REQUIREMENT:** Opt-in control must not be pre-checked.  
**SOURCE:** CTIA / industry call-to-action practice; TCR evidence expectations.  
**SENDFABLE IMPLEMENTATION:** Hosted form initializes `smsConsent` to `false`; field checkboxes forced false on load.  
**ROUTE/FILE:** `src/app/f/[slug]/form-client.tsx`  
**LIVE TEST:** PASS

### C. SMS consent not bundled with email consent

**REQUIREMENT:** Distinct SMS affirmation.  
**SOURCE:** CTIA one-opt-in-per-campaign / clear program consent.  
**SENDFABLE IMPLEMENTATION:** Separate SMS checkbox block; helper text “Email signup does not imply SMS consent.”  
**ROUTE/FILE:** `src/app/f/[slug]/form-client.tsx`  
**LIVE TEST:** PASS

### D. Phone field optional where applicable

**REQUIREMENT:** Phone should not be forced when the form is email-primary; text-only forms may require phone.  
**SOURCE:** Product UX + “consent not condition of purchase” where purchase/signup proceeds without SMS.  
**SENDFABLE IMPLEMENTATION:** Presets: email (no phone); text (phone required); email-and-text (phone optional / either-required). SMS checkbox never `required` on submit.  
**ROUTE/FILE:** `src/lib/form-presets.ts`; submit route requirement modes  
**LIVE TEST:** PASS

### E. Brand identified

**REQUIREMENT:** End business identity in call-to-action / messages.  
**SOURCE:** CTIA; TCR brand = end customer.  
**SENDFABLE IMPLEMENTATION:** Disclosure uses workspace `brandName`; HELP/STOP/samples use end brand.  
**ROUTE/FILE:** `src/lib/sms/consent.ts`; `src/app/api/forms/public/[slug]/route.ts`  
**LIVE TEST:** PASS (North Loop Books; no owner leak)

### F. Messaging use case identified

**REQUIREMENT:** Program/use case described for registration and consent context.  
**SOURCE:** TCR campaign usecase; CTIA program description.  
**SENDFABLE IMPLEMENTATION:** Customer setup selects use case; `generateSmsOptInDescription` includes use-case label.  
**ROUTE/FILE:** `src/lib/sms/customer-facing.ts`  
**LIVE TEST:** PASS (setup path)

### G. Message frequency disclosure

**REQUIREMENT:** Disclose that frequency varies (or state frequency).  
**SOURCE:** CTIA call-to-action disclosures.  
**SENDFABLE IMPLEMENTATION:** “Message frequency varies” in consent disclosure and confirmation template.  
**ROUTE/FILE:** `src/lib/sms/consent.ts`  
**LIVE TEST:** PASS

### H. Message/data rates disclosure

**REQUIREMENT:** Msg & data rates may apply.  
**SOURCE:** CTIA / carrier program practice.  
**SENDFABLE IMPLEMENTATION:** In disclosure, HELP, and confirmation templates.  
**ROUTE/FILE:** `src/lib/sms/consent.ts`  
**LIVE TEST:** PASS

### I. STOP disclosure

**REQUIREMENT:** Clear opt-out instruction (STOP).  
**SOURCE:** CTIA; carrier keyword requirements.  
**SENDFABLE IMPLEMENTATION:** Disclosure + keywords `STOP`, `STOPALL`, `UNSUBSCRIBE`, `CANCEL`, `END`, `QUIT`.  
**ROUTE/FILE:** `src/lib/sms/consent.ts`; `src/lib/sms/inbound.ts`  
**LIVE TEST:** PASS (second-tenant live)

### J. HELP disclosure

**REQUIREMENT:** HELP / customer care path.  
**SOURCE:** CTIA.  
**SENDFABLE IMPLEMENTATION:** Disclosure + HELP/INFO auto-reply with brand + support contact.  
**ROUTE/FILE:** `src/lib/sms/consent.ts`; `src/lib/sms/inbound.ts`  
**LIVE TEST:** PASS (second-tenant live)

### K. Privacy Policy link

**REQUIREMENT:** Accessible privacy policy from call-to-action.  
**SOURCE:** CTIA § privacy policy.  
**SENDFABLE IMPLEMENTATION:** Links in disclosure + form footer to `/privacy` (or workspace override URL when supplied).  
**ROUTE/FILE:** `src/app/f/[slug]/form-client.tsx`; `src/app/api/forms/public/[slug]/route.ts`  
**LIVE TEST:** PASS

### L. Terms link

**REQUIREMENT:** Accessible terms for the messaging program.  
**SOURCE:** CTIA / short-code handbook practice (T&Cs).  
**SENDFABLE IMPLEMENTATION:** Links to `/terms` as SMS Terms default.  
**ROUTE/FILE:** same as K; Terms §7a Text Messaging  
**LIVE TEST:** PASS

### M. Marketing consent explicit for marketing texts

**REQUIREMENT:** Marketing/recurring texts require affirmative marketing consent.  
**SOURCE:** CTIA; TCPA express written consent for marketing.  
**SENDFABLE IMPLEMENTATION:** Disclosure: “recurring marketing and conversational text messages”; `canSendMarketingSms` requires `SUBSCRIBED` + not suppressed.  
**ROUTE/FILE:** `src/lib/sms/consent.ts`  
**LIVE TEST:** PASS

### N. Consent not required as condition of purchase (where applicable)

**REQUIREMENT:** Consent optional / not a condition of purchase where required.  
**SOURCE:** TCPA / CTIA disclosure practice.  
**SENDFABLE IMPLEMENTATION:** Explicit sentence in disclosure; form: optional, not required to submit.  
**ROUTE/FILE:** `src/lib/sms/consent.ts`; form-client  
**LIVE TEST:** PASS

### O. Mobile opt-in information not sold/shared for marketing/promotional purposes

**REQUIREMENT:** Privacy policy / disclosure must state SMS opt-in data is not sold or shared for third-party promotional marketing.  
**SOURCE:** CTIA privacy expectations; carrier campaign review practice.  
**SENDFABLE IMPLEMENTATION:** Consent disclosure sentence + Privacy Policy §§5 and 5a.  
**ROUTE/FILE:** `src/lib/sms/consent.ts`; `src/app/(marketing)/privacy/page.tsx`  
**LIVE TEST:** PASS (copy present; deploy verifies live)

### P. Consent evidence stored

**REQUIREMENT:** Retain evidence of opt-in.  
**SOURCE:** CTIA / TCR evidence; TCPA risk mitigation.  
**SENDFABLE IMPLEMENTATION:** `SmsConsentEvent` with action, source, disclosure version, evidence JSON.  
**ROUTE/FILE:** `src/app/api/forms/submit/route.ts`; Prisma `SmsConsentEvent`  
**LIVE TEST:** PASS

### Q. Opt-in timestamp stored

**REQUIREMENT:** Record when consent was obtained.  
**SOURCE:** Evidence practice.  
**SENDFABLE IMPLEMENTATION:** `Contact.smsConsentAt`; event `createdAt`.  
**ROUTE/FILE:** schema + form submit  
**LIVE TEST:** PASS

### R. Opt-in source stored

**REQUIREMENT:** Record how consent was obtained.  
**SOURCE:** Evidence practice / TCR description.  
**SENDFABLE IMPLEMENTATION:** `smsConsentSource` e.g. `form:<slug>`, `provider:start`, import batch.  
**ROUTE/FILE:** form submit; inbound START  
**LIVE TEST:** PASS

### S. STOP immediately honored

**REQUIREMENT:** Process opt-out promptly; stop marketing texts.  
**SOURCE:** CTIA; carrier keywords.  
**SENDFABLE IMPLEMENTATION:** Inbound STOP → `OPTED_OUT` + `SmsSuppression` + confirmation reply.  
**ROUTE/FILE:** `src/lib/sms/inbound.ts`  
**LIVE TEST:** PASS (second-tenant live)

### T. Suppression persisted

**REQUIREMENT:** Opt-out survives delete/reimport.  
**SOURCE:** Product compliance design; carrier expectation to honor STOP.  
**SENDFABLE IMPLEMENTATION:** `SmsSuppression` keyed by workspace + E.164; import cannot clear without documented new opt-in.  
**ROUTE/FILE:** `src/lib/sms/consent.ts` `applyOptIn`; import route  
**LIVE TEST:** PASS

### U. HELP supported

**REQUIREMENT:** Respond to HELP with program identity + care contact.  
**SOURCE:** CTIA.  
**SENDFABLE IMPLEMENTATION:** Auto HELP reply; not blocked by consent/allowance.  
**ROUTE/FILE:** `src/lib/sms/inbound.ts`  
**LIVE TEST:** PASS

### V. START / re-consent behavior documented

**REQUIREMENT:** Document how re-subscribe works after STOP.  
**SOURCE:** Carrier START/YES keywords; product clarity.  
**SENDFABLE IMPLEMENTATION:** START/YES/UNSTOP/SUBSCRIBE → documented RE_OPT_IN; clears suppression only when accepted.  
**ROUTE/FILE:** `src/lib/sms/consent.ts`; `src/lib/sms/inbound.ts`  
**LIVE TEST:** PASS (second-tenant live)

### W. Opt-in confirmation message

**REQUIREMENT:** Recurring programs should confirm opt-in (program name, frequency/rates, STOP/HELP).  
**SOURCE:** CTIA Short Code Monitoring Handbook practice; widely applied to recurring A2P programs.  
**SENDFABLE IMPLEMENTATION:** `buildSmsOptInConfirmation` + TCR `sampleMessage1` (confirmation-style). Automatic immediate confirmation SMS on every web form submit is **not** separately queued today; confirmation content is registered and used as the standard first/welcome sample. Customers’ first outbound should use this pattern.  
**ROUTE/FILE:** `src/lib/sms/consent.ts`; `src/lib/sms/customer-facing.ts`  
**LIVE TEST:** PASS for registration samples / templates; **PARTIAL** for automatic post-form confirmation SMS (documented; not a silent invent)

### X. Privacy policy accurately describes SMS data handling

**REQUIREMENT:** Privacy policy describes collection, use, sharing limits for SMS.  
**SOURCE:** CTIA §5.2.1.  
**SENDFABLE IMPLEMENTATION:** Privacy §§5, 5a + Telnyx subprocessor.  
**ROUTE/FILE:** `src/app/(marketing)/privacy/page.tsx`  
**LIVE TEST:** PASS (after deploy)

### Y. Terms accurately describe SMS program

**REQUIREMENT:** Terms cover SMS program responsibilities and limits.  
**SOURCE:** CTIA T&Cs accessibility / program description practice.  
**SENDFABLE IMPLEMENTATION:** Terms §7a Text Messaging.  
**ROUTE/FILE:** `src/app/(marketing)/terms/page.tsx`  
**LIVE TEST:** PASS (after deploy)

### Z. Customer-specific brand identity

**REQUIREMENT:** End-customer brand on HELP/STOP/consent; no owner/platform identity leak.  
**SOURCE:** TCR ISV / end-brand rules.  
**SENDFABLE IMPLEMENTATION:** Workspace brand throughout; second-tenant cert.  
**ROUTE/FILE:** consent + inbound + setup generators  
**LIVE TEST:** PASS (North Loop Books; no iScream / owner email leak)

---

## Quiet hours

| Question | Finding |
|----------|---------|
| Provider / CTIA mandate of a specific technical quiet-hours engine? | **No** such national mandatory product rule found in CTIA principles used here |
| SendFable SMS quiet-hours feature? | **Not implemented** |
| General schedule mechanism? | Campaigns may be **scheduled** by the customer; workspace has a `timezone` field (default UTC). No automatic SMS quiet window |
| Classification | **Best-practice / state-law-dependent**, not a Telnyx/TCR launch requirement |
| Launch posture | **NOT REQUIRED FOR PROVIDER LAUNCH** — do not invent a national mandatory rule. Outside counsel optional if expanding into states with telemarketing quiet-hour statutes |

---

## Owner self-certification block

I certify that I reviewed this checklist against the live product and that items A–Z are accurately marked.

**Overall SMS COMPLIANCE SELF-CERTIFICATION:** ☐ PASS ☐ FAIL  

**Name:** ________________  **Date:** ________________  

**Outside counsel review:** OPTIONAL / RECOMMENDED (not required for this gate)

---

## Related docs

- Optional attorney packet (non-blocking): `docs/SMS_COUNSEL_REVIEW_PACKET.md`
- Flag ladder: `docs/SMS_PUBLIC_FLAG_LADDER.md`
- Launch prep economics: `docs/SMS_PUBLIC_LAUNCH_PREP_2026-09-21.md`
