# SF-017 — Telnyx ISV Architecture and Account Readiness

**Status:** Complete (no paid Telnyx activity)  
**Date:** 2026-07-31  
**Starting commit:** `b04db30`  
**Branch:** `sf/017-telnyx-isv-readiness`  
**Sources:** Official Telnyx docs — [ISV & Reseller 10DLC Onboarding](https://developers.telnyx.com/docs/messaging/10dlc/isv-reseller-onboarding), [Brand registration](https://developers.telnyx.com/docs/messaging/10dlc/brand-registration), [Sole Proprietor](https://developers.telnyx.com/docs/messaging/10dlc/sole-proprietor), [10DLC fees](https://support.telnyx.com/en/articles/5634625-10dlc-fees-and-charges), [Shared campaigns](https://support.telnyx.com/en/articles/5617538-10dlc-shared-campaigns), [Webhook Ed25519](https://developers.telnyx.com/docs/messaging/messages/receiving-webhooks)

---

## Classification (official Telnyx)

SendFable is a **multi-tenant SaaS / ISV**: each customer is a separate business sending permission-based marketing and conversational SMS to **its own** opted-in contacts.

Per Telnyx ISV onboarding: platforms sending **on behalf of customers** need a **partner campaign** architecture — not a single “platform brand” covering unrelated end businesses.

**Do not** register all customer traffic under the iScream Studio INC brand unless Telnyx explicitly confirms that shared-brand model for this use case (official docs present a shared-brand pattern only when all customers send similar traffic under **your** brand — inappropriate for distinct marketing brands).

---

## Answers to required verification questions

| # | Topic | Finding |
|---|--------|---------|
| 1 | Classification | SaaS / ISV / reseller sending on behalf of customers |
| 2 | Architecture choice | Partner/shared-campaign ISV model with **isolated** brand+campaign per customer; Telnyx as messaging CSP. Toll-free as alternate path per customer. Confirm Telnyx-as-upstream vs external CSP with support. |
| 3 | Brand per customer | **Yes** — each customer needs their own TCR brand |
| 4 | Campaign per customer | **Yes** — at least one campaign per customer/use case |
| 5 | Dedicated number | **Yes** for production isolation — assign numbers to that customer’s campaign |
| 6 | Number sharing across brands | **No** — a number assigns to **one** campaign at a time; unrelated brands must not share |
| 7 | API registration | **Yes** — brand/campaign APIs; partner campaign APIs for shared campaigns |
| 8 | ISV approval | Level 2 verified account required; CSP ID association / partner sharing may need Telnyx review (up to ~2 business days for CSP ID association per shared-campaign help article) |
| 9 | Sales/compliance review | Expect Telnyx review for shared campaigns; enhanced brand vetting recommended for ISVs |
| 10 | Sole proprietors | Separate `SOLE_PROPRIETOR` route + SMS OTP; limits: 1 campaign, 1 number, low throughput |
| 11 | Nonprofits | `NON_PROFIT` entity type; EIN + exact legal name matching IRS records |
| 12 | EIN / legal name / address | Required for standard brands; exact IRS match for `companyName` |
| 13 | Opt-in proof | Message flow must describe **end-user** consent; screenshots/evidence retained |
| 14 | Privacy / SMS Terms | Separate links required in opt-in |
| 15 | Sample messages | Accurate samples reflecting real traffic |
| 16–18 | HELP / STOP / frequency | Required in campaign + consumer disclosure |
| 19 | Carrier / rates | “Message and data rates may apply” |
| 20 | Retention / security | Workspace isolation, encrypted EIN, audit logs, retention holds |

---

## Architecture comparison

### OPTION A — Customer-specific native 10DLC

Direct Telnyx brand/campaign per customer without partner sharing. Official ISV guide steers multi-tenant SaaS toward **partner** campaigns. May still be usable if Telnyx confirms Telnyx-as-upstream native ISV flow.

### OPTION B — Partner / shared campaign (ISV) — **recommended for scale**

Register brand+campaign per customer (upstream CSP — ideally Telnyx), share campaign to Telnyx for numbers/messaging. Use Telnyx’s **Isolated** multi-tenant pattern:

```
SendFable Telnyx account
├── Customer A → Brand A → Campaign A → Number(s) A
├── Customer B → Brand B → Campaign B → Number(s) B
└── …
```

### OPTION C — Customer-specific toll-free

Dedicated TFN + verification per end business; SendFable as reseller. Useful when 10DLC is blocked or customer prefers TFN.

### OPTION D — Limited owner-only pilot — **recommended for controlled testing**

Register **only** SendFable / iScream Studio owner workspace. No customer SMS access. Does **not** cover customer businesses.

---

## Recommendations

| Phase | Architecture | Why |
|-------|--------------|-----|
| 1. Controlled owner-only testing | **Option D** | Zero customer risk; validates webhooks/sending without implying multi-tenant compliance |
| 2. First ten customers | **Option B isolated** (+ C if needed) | Matches Telnyx ISV guidance; brand/campaign/number isolation |
| 3. Scaled production | **Option B isolated** | Throughput and compliance isolation; partner APIs for onboarding |

**Rejected for marketing SaaS:** one shared platform brand for all unrelated customer marketing brands.

---

## Production account readiness (2026-07-31)

| Item | Status |
|------|--------|
| Telnyx account credentials on VPS | **MISSING** (all) |
| `TELNYX_API_KEY` | MISSING |
| `TELNYX_PUBLIC_KEY` | MISSING |
| `TELNYX_WEBHOOK_SECRET` | MISSING |
| `TELNYX_MESSAGING_PROFILE_ID` | MISSING |
| `TELNYX_CONNECTION_ID` | MISSING |
| SMS customer flags | all **false** |
| Numbers / registrations / SMS sent | **0** |
| External charges this task | **$0** |

Owner setup: `docs/SF-017_TELNYX_OWNER_SETUP.md`  
Support paste text: `docs/SF-017_TELNYX_SUPPORT_REQUEST.md`

---

## Application changes in SF-017

- Ed25519 webhook verification (primary) + HMAC test fallback
- Brand-specific SMS consent disclosure + hosted form optional SMS checkbox (never prechecked)
- `SmsComplianceProfile` model + EIN encryption helper (migration prepared)
- Updated ISV cost assumptions for margin modeling

---

## GO / NO-GO

| Gate | Verdict |
|------|---------|
| 1. Telnyx account creation | **GO** (owner) |
| 2. Telnyx ISV approval request | **GO** (send support request; no charge expected) |
| 3. Owner-only registration | **NO-GO** until account + Level 2 + explicit approval |
| 4. Customer-specific registration | **NO-GO** |
| 5. Number purchase | **NO-GO** |
| 6. Controlled SMS testing | **NO-GO** |
| 7. Public SMS activation | **NO-GO** |
