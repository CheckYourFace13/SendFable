# SMS public launch prep — cost, flags, funding, rollback (2026-09-21)

**Do not enable public SMS from this doc.** Facts below are from production Telnyx API reads + official Telnyx pricing/support pages + SendFable code. No irreversible Telnyx billing changes were made.

## 1. Per-customer Telnyx economics (normal distinct brand + campaign)

### Sources
- Live `GET /v2/balance` — available credit **$17.04** (2026-09-21)
- Live `GET /v2/payment/auto_recharge_prefs` — **enabled: false**
- Live `GET /v2/available_phone_numbers` — US SMS numbers **$1–$5/mo** (NPA-dependent; e.g. 312 samples **$5** monthly + **$5** upfront; other NPAs **$1–$2**)
- Live `GET /v2/detail_records` (registered traffic samples) — platform **$0.0040**/part; sample carrier_fee **$0.00000** (ClearSky); major carriers bill published passthrough fees
- Official: [Telnyx 10DLC fees](https://support.telnyx.com/en/articles/5634625-10dlc-fees-and-charges), [Telnyx SMS pricing](https://telnyx.com/pricing/messaging), Telnyx pricing.md 10DLC rates
- Operational: distinct campaign create previously returned **402 Insufficient Funds** when balance could not cover campaign prepaid

### ONE-TIME COST (typical Marketing/Mixed standard campaign, happy path)

| Item | Amount | Notes |
|------|--------|------|
| TCR brand registration | **$4.50** | Official pass-through |
| Campaign review (manual / Syniverse activation) | **$15** | Per review; resubmits bill again |
| Campaign MRC prepaid (first 3 months) | **$30** | $10/mo × 3 billed upfront (standard volume) |
| Optional brand vetting | **$41.50** | If required/selected (Telnyx list) |
| Optional T-Mobile campaign fee | **$50** | Listed OTC; confirm when charged for usecase |
| Number purchase upfront | **~$1–$5** | Live inventory; NPA-dependent |
| Phone→campaign assignment | **$0.03** | Telnyx API docs (qualify usecase) |
| **Happy-path subtotal (no vetting/T-Mo special)** | **~$49.50–$54.50** | Brand + review + 3×MRC + number |
| **With recommended vetting** | **~$91–$96** | Aligns with $99 customer activation cushion |

Low Volume Mixed is cheaper monthly (**$1.50**) but **must not** be used to optimize fees when volume/use case does not qualify.

### MONTHLY FIXED COST (after prepaid period)

| Item | Amount |
|------|--------|
| Campaign MRC (Marketing/Mixed/standard) | **$10/mo** |
| Local number | **$1–$5/mo** (live search; model **$1–$2** typical, premium NPA higher) |
| **Typical fixed** | **~$11–$15/mo** |

### USAGE COST (per SMS part)

| Item | Amount |
|------|--------|
| Telnyx SMS platform (send or receive) | **$0.004**/part (official + live detail_records) |
| Carrier surcharge (outbound, major US) | ~**$0.0035–$0.005**/part (AT&T/T-Mobile/Verizon/US Cellular published tables) |
| **All-in outbound (typical major carrier)** | ~**$0.0075–$0.009**/part |
| Inbound | **$0.004** platform + carrier inbound fee when applicable |

MMS not in current product scope.

### MINIMUM BALANCE REQUIREMENT

| Requirement | Amount | Basis |
|-------------|--------|------|
| Campaign create prepaid | **≥ ~$30** | Official 3-month MRC upfront for regular campaigns; live 402 when underfunded |
| Safe operating floor (recommended) | **≥ $50–$100** | Cover brand+review+number+one campaign create without stall |
| **Current production balance** | **$17.04** | **Below** campaign-create floor — **manual top-up or auto-recharge required before next distinct campaign create** |

---

## 2. SendFable billing model recommendation

**Keep the existing model (already coded):**  
**$99 one-time Text Messaging Activation + monthly Text Entry / Essentials / Advantage + metered outbound + included inbound with $0.025 overage.**

Maps to structures **C + D** (activation + monthly add-on with inbound credits). Registration/number costs are absorbed in activation for the happy path; exceptional fees use `SmsExceptionalCharge` with customer approval.

| Option | Verdict |
|--------|---------|
| A only (registration in add-on, no activation) | Reject — thin cushion on Entry; resubmits blow margin |
| B (SMS only on paid email plans) | Reject for launch — complicates signup; Entry already standalone |
| C | Keep — activation covers one-time provider registry |
| D | Keep inbound credits as already designed |

Email-only plans unchanged. Customer never sees Telnyx/TCR line items.

---

## 3. Telnyx funding automation (report only — nothing enabled)

**API supports auto recharge:** `GET/PATCH /v2/payment/auto_recharge_prefs`  
Fields: `enabled`, `threshold_amount`, `recharge_amount`, `preference` (`credit_paypal` | `ach`), `invoice_enabled`.

**Current production prefs:**
```
enabled: false
threshold_amount: "0.00"
recharge_amount: "10.00"
preference: "credit_paypal"
invoice_enabled: false
```

**Payment method:** Must already exist in Telnyx Portal (API does not add cards). Preference `credit_paypal` implies card/PayPal path once portal method is on file.

### Recommended safe ops (owner action — not executed here)
1. Confirm stored payment method in Telnyx Mission Control.
2. Manually top up so available credit ≥ **$100** before public registration opens.
3. Enable auto-recharge with e.g. **threshold $50**, **recharge $100** (or higher), preference matching portal method.
4. Alert if balance &lt; $40 (below campaign prepaid).

**No PATCH was sent.** Funding automation status: **supported but currently MANUAL**.

---

## 4. Counsel packet

See **`docs/SMS_COUNSEL_REVIEW_PACKET.md`** (exact live copy + paths). Privacy and Terms lack dedicated SMS sections — call out as gaps.

---

## 5. Public SMS flag map

| Flag | Current (prod 2026-09-21) | Desired for public launch | Notes |
|------|---------------------------|---------------------------|-------|
| `SENDFABLE_SMS_CODE_ENABLED` | unset → default **true** | **true** | |
| `SENDFABLE_SMS_ADMIN_ENABLED` | unset → default **true** | **true** | |
| `SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED` | **false** | **true** | |
| `SENDFABLE_SMS_BILLING_ENABLED` | **false** | **true** | |
| `SENDFABLE_SMS_ACTIVATION_PURCHASE_ENABLED` | **false** | **true** | |
| `SENDFABLE_SMS_REGISTRATION_ENABLED` | **false** | **true** | After self-cert + funding |
| `SENDFABLE_SMS_NUMBER_PURCHASE_ENABLED` | **false** | **true** | |
| `SENDFABLE_SMS_LIVE_SENDING_ENABLED` | **false** | **true** | |
| `SENDFABLE_SMS_INBOUND_ENABLED` | **false** | **true** | STOP/HELP |
| `SENDFABLE_SMS_REPLY_ENABLED` | **true** (anomalous with others off) | **true** | Normalize with ladder |
| `SENDFABLE_SMS_MOCK_PROVIDER_ENABLED` | **false** | **false** | Real Telnyx when live |
| `SENDFABLE_SMS_PUBLIC_ENABLED` | **false** | **true** (last) | Marketing/pricing |
| `SENDFABLE_PROMO_TEXT20_PUBLIC` | unset/false | **false** at SMS flip | Keep dark |
| `SENDFABLE_SMS_CERT_WORKSPACE_IDS` | empty | empty or ops-only | Not required for public |

### Safe enable order
1. Funding ≥ $100 + auto-recharge configured  
2. SMS compliance self-certification PASS (owner signed)  
3. `ACCOUNT_SIGNUP` → `BILLING` → `ACTIVATION_PURCHASE` → `REGISTRATION` → `NUMBER_PURCHASE` → `LIVE_SENDING` → `INBOUND` → `REPLY` → `MOCK=false`  
4. Smoke one new non-pilot customer path  
5. **`PUBLIC_ENABLED=true` last**

**Do not flip from this document.**

---

## 6. One-step rollback (public SMS incident)

**Goal:** Stop new registrations, number buys, and live marketing sends; keep STOP/HELP if legally required; preserve consent/audit DB; leave email untouched.

### Preferred single step
On VPS `/opt/sendfable/.env`, set:

```
SENDFABLE_SMS_PUBLIC_ENABLED=false
SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED=false
SENDFABLE_SMS_ACTIVATION_PURCHASE_ENABLED=false
SENDFABLE_SMS_REGISTRATION_ENABLED=false
SENDFABLE_SMS_NUMBER_PURCHASE_ENABLED=false
SENDFABLE_SMS_LIVE_SENDING_ENABLED=false
SENDFABLE_SMS_BILLING_ENABLED=false
SENDFABLE_SMS_INBOUND_ENABLED=true
SENDFABLE_SMS_REPLY_ENABLED=false
SENDFABLE_SMS_MOCK_PROVIDER_ENABLED=false
SENDFABLE_PROMO_TEXT20_PUBLIC=false
```

Then recreate app+worker only (no DB wipe):

```bash
cd /opt/sendfable && docker compose -p sendfable -f docker-compose.prod.yml up -d --force-recreate app worker
```

**Preserve:** Postgres consent events, suppressions, messages, registrations.  
**Email:** unchanged (no email flags touched).  
**Inbound STOP:** keep `INBOUND_ENABLED=true` so STOP still records opt-out; set `false` only if webhook itself is unsafe (then STOP may queue at provider — prefer keep inbound on).

---

## 7. TEXT20 launch rule

**Keep dark.** Recommendation: **B — after 7 days of stable public SMS production** (no funding stalls, no consent incidents, margin alerts quiet).  
Not same-day (couples email promo risk to SMS launch day). Not “first X customers” alone (time-based ops stability is clearer).

---

## 8. Scorecard snapshot

See owner response in chat. **PUBLIC SMS: OFF. TEXT20: DARK.**
