# SF-016 — Live Stripe SMS Catalog Preparation

**Status:** Complete  
**Date:** 2026-07-31  
**Starting commit:** production app `c880c31`; docs tip `0d3dfbb`  
**Branch:** `sf/016-live-sms-catalog`  
**Final commit:** `c97d58b`  
**Production commit:** `c97d58b`  

---

## Preflight report (read-only — before any catalog writes)

### Stripe connection

| Check | Result |
|-------|--------|
| Key prefix | `sk_live_` **CONFIRMED** (value not printed) |
| Stripe account ID (masked) | `acct_1…Sfu4` |
| Mode | Live |
| Script mode | `--preflight-live` only |

### Existing email catalog (unchanged; read-only retrieve)

| Env | Amount (cents) | Notes |
|-----|----------------|-------|
| STARTER monthly / annual | 1200 / 12000 | $12 / $120 |
| GROWTH monthly / annual | 2900 / 29000 | $29 / $290 |
| PRO monthly / annual | 6900 / 69000 | $69 / $690 |
| PRO PLUS monthly / annual | 9900 / 99000 | $99 / $990 |
| FREE | n/a | No Stripe price (expected) |

Email Product IDs and Price IDs were retrieved via existing env mappings only. **No email Product or Price was created, updated, archived, or replaced.**

### SMS collision search

| Search | Result (pre-create) |
|--------|---------------------|
| Product name (SMS / Text Entry / Essentials / Advantage / Messaging) | **0** |
| Metadata `channel=sms` | **0** |
| Lookup keys (v1 + legacy) | **0** |
| Billing meters matching sms/text | **0** |

### Feature flags (production `.env`)

All customer-facing SMS flags **false** (unchanged throughout SF-016).

### Script safety

| Guarantee | Confirmed |
|-----------|-----------|
| Idempotent via lookup keys | Yes — second run reused 4 meters + 10 prices |
| Cannot create Checkout / subscriptions / invoices / charges / meter events | Yes |
| Products created `active=false` | Yes |
| Live catalog does **not** require `SENDFABLE_SMS_BILLING_ENABLED=true` | Yes (`--confirm-live-sms-catalog`) |

### Backup

| Item | Path |
|------|------|
| Production `.env` backup | `/root/sendfable-backups/sendfable-env-sf016-20260731-152652.bak` |
| DB backup (prior) | `/root/sendfable-backups/sendfable-20260729-202150.sql.gz` |

### Preflight verdict

**GO** to create live SMS catalog objects only.

---

## Catalog created

### Products (all `active=false`)

| Name | Product ID |
|------|------------|
| SendFable Text Entry | `prod_UzGugMRDJRQhd8` |
| SendFable Text Essentials | `prod_UzGu6cJNhSAwU3` |
| SendFable Text Advantage | `prod_UzGuXHTFP9NEIR` |
| SendFable Incoming SMS Overage | `prod_UzGu3BGrtcZOnE` |
| SendFable Text Messaging Activation | `prod_UzGuQFknPM533v` |

### Prices

| Lookup key | Price ID | Amount |
|------------|----------|--------|
| `sendfable_sms_text_entry_monthly_v1` | `price_1TzIMdGnw9fPSfu415H33cXC` | $19.99/mo |
| `sendfable_sms_text_entry_outbound_segment_v1` | `price_1TzIMeGnw9fPSfu4m1MWwaw6` | $0.05/seg |
| `sendfable_sms_text_essentials_monthly_v1` | `price_1TzIMfGnw9fPSfu4ESoIicqT` | $49.99/mo |
| `sendfable_sms_text_essentials_bundle_monthly_v1` | `price_1TzIMfGnw9fPSfu4LWW3FLTa` | $44.99/mo |
| `sendfable_sms_text_essentials_outbound_segment_v1` | `price_1TzIMfGnw9fPSfu45fdpsdzO` | $0.035/seg |
| `sendfable_sms_text_advantage_monthly_v1` | `price_1TzIMgGnw9fPSfu4OPAlTfJE` | $99.99/mo |
| `sendfable_sms_text_advantage_bundle_monthly_v1` | `price_1TzIMgGnw9fPSfu4xb6HFHWh` | $89.99/mo |
| `sendfable_sms_text_advantage_outbound_segment_v1` | `price_1TzIMhGnw9fPSfu44KOQnb3m` | $0.025/seg |
| `sendfable_sms_incoming_overage_segment_v1` | `price_1TzIMhGnw9fPSfu4nmiMtWkB` | $0.025/seg |
| `sendfable_sms_activation_v1` | `price_1TzIMiGnw9fPSfu4m0JBCMBy` | $99.00 one-time |

### Billing meters

| Event name | Meter ID |
|------------|----------|
| `sms_text_entry_outbound_segments_v1` | `mtr_61V8gJy0D55knv8zv41Gnw9fPSfu4Uz2` |
| `sms_text_essentials_outbound_segments_v1` | `mtr_61V8gJyDRw04uuXyi41Gnw9fPSfu4LAm` |
| `sms_text_advantage_outbound_segments_v1` | `mtr_61V8gJz1UCHdpzsE541Gnw9fPSfu4UYi` |
| `sms_incoming_overage_segments_v1` | `mtr_61V8gJzVvNcngFTL741Gnw9fPSfu4HoG` |

Aggregation: **sum**; customer mapping: **by_id** `stripe_customer_id`; value field: **value**.  
**No meter events submitted.**

### Idempotency / duplicates

| Metric | Count |
|--------|-------|
| First-run prices created | 10 |
| First-run meters created | 4 |
| First-run products created | 5 |
| Second-run prices reused | 10 |
| Second-run meters reused | 4 |
| Duplicate prices created | **0** |

### Environment mappings

Stored on VPS `/opt/sendfable/.env` only (not committed). Keys: `STRIPE_PRICE_SMS_*`, `STRIPE_PRODUCT_SMS_*`, `STRIPE_METER_SMS_*`.

### Validation (`--validate-live-catalog`)

All 10 prices: amount / interval / currency / inactive product / metadata / meter linkage **OK**.  
Email monthly prices still retrieve unchanged: Starter $12, Growth $29, Pro $69, Pro Plus $99.

---

## Local invoice simulation (no Stripe invoice APIs)

| # | Scenario | Expected total |
|---|----------|----------------|
| 1 | Text Entry + 100 outbound | **$24.99** |
| 2 | Text Essentials + 1,000 outbound | **$84.99** |
| 3 | Text Essentials bundled with Growth | **$44.99** |
| 4 | Text Advantage + 5,000 outbound | **$224.99** |
| 5 | Text Advantage bundled with Pro | **$89.99** |
| 6 | Incoming within allowance (Entry 100) | **$19.99** (overage $0) |
| 7 | One incoming above allowance | **$20.01** |
| 8 | Activation fee | **$99.00** |
| 9 | Upgrade Essentials → Advantage | $49.99 → $99.99 |
| 10 | Downgrade Advantage → Essentials | $99.99 → $49.99 |
| 11 | Bundle eligibility removed | $44.99 → $49.99 |

---

## Tests

| Check | Result |
|-------|--------|
| Full unit suite | **302** pass |
| Typecheck | pass |
| Prisma validate | pass |
| Production build | pass |
| Catalog idempotency | pass (0 creates on rerun) |
| Live-mode / no-charge guards | pass (SF-016 tests) |
| Email billing regression (Stripe retrieve) | pass |
| SMS-dark flags | pass |
| Workspace isolation | pass |
| Public pricing crawl | email plans present; no Text Entry/Essentials/Advantage |
| SMS checkout probe | **404** Not found (dark) |

---

## Charge / customer counters

| Metric | Count |
|--------|-------|
| Customers created | **0** |
| Subscriptions created | **0** |
| Checkout Sessions created | **0** |
| Invoices created | **0** |
| Charges created | **0** |
| Payment methods touched | **0** |
| Meter events submitted | **0** |
| Existing email prices modified | **0** |

---

## Feature flags

Unchanged — all public/live SMS flags remain **false**. Public SMS visibility: **none**.

---

## GO / NO-GO

| Gate | Verdict |
|------|---------|
| 1. Live SMS catalog correctness | **GO** |
| 2. Existing email billing safety | **GO** |
| 3. Telnyx setup | **NO-GO** |
| 4. Controlled SMS testing | **NO-GO** |
| 5. Public SMS checkout | **NO-GO** |
| 6. Public SMS launch | **NO-GO** |

---

## Rollback

1. Remove SMS `STRIPE_*_SMS_*` lines from production `.env` (or restore `/root/sendfable-backups/sendfable-env-sf016-20260731-152652.bak`).  
2. Leave Stripe SMS products inactive (do not delete unless required).  
3. Keep all `SENDFABLE_SMS_*` customer flags false.  
4. App rollback to `c880c31` if a deploy introduces issues.
