# SF-019 — SMS legal / compliance posture

**Updated:** 2026-09-21

## Gate change (important)

Public SMS launch is **not** blocked on paid outside counsel.

| Gate | Role |
|------|------|
| **SMS COMPLIANCE SELF-CERTIFICATION** | **REQUIRED** — see `docs/SMS_COMPLIANCE_SELF_CERTIFICATION.md` |
| **Outside counsel review** | **OPTIONAL / RECOMMENDED** for additional risk assurance |
| Attorney checkbox as procedural blocker | **REMOVED** |

No federal statute, CTIA principle, Telnyx rule, or TCR rule we rely on states that an attorney must approve SendFable before SMS launch. CTIA materials explicitly disclaim legal advice and recommend consulting counsel as guidance — that is not a launch permit.

This document is **not legal advice** and does **not** claim legal approval.

---

## Customer-facing SMS policy surfaces (live)

| Surface | Status |
|---------|--------|
| Privacy Policy §5 / §5a Text Messaging | Present (bundle `2026-09-21`) |
| Terms of Service §7a Text Messaging | Present (bundle `2026-09-21`) |
| Acceptable Use §6 Text messaging | Present |
| Billing & Refund §7 Text messaging fees | Present |
| Hosted opt-in disclosure | `buildSmsConsentDisclosure` |

Optional deep-dive packet for counsel if engaged: `docs/SMS_COUNSEL_REVIEW_PACKET.md`.

---

## Publish checklist (pre–public SMS)

- [x] AUP SMS section
- [x] Billing SMS section
- [x] Privacy SMS section
- [x] Terms SMS section
- [x] Compliance self-certification checklist authored
- [ ] Owner completes self-certification signature block in `SMS_COMPLIANCE_SELF_CERTIFICATION.md`
- [ ] Telnyx funding / auto-recharge (owner ops)
- [ ] Owner approval to flip public SMS flags

Until self-certification is signed **PASS** and funding/owner approval are done, keep `SENDFABLE_SMS_PUBLIC_ENABLED=false`.
