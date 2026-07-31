# SF-017 — Revised SMS margin (ISV / customer-specific)

**Approved customer prices are unchanged** (do not alter without owner approval):

| Plan | Fixed | Bundled | Outbound / seg | Inbound included | Inbound overage |
|------|-------|---------|----------------|------------------|-----------------|
| Text Entry | $19.99 | n/a | $0.05 | 100 | $0.025 |
| Text Essentials | $49.99 | $44.99 | $0.035 | 300 | $0.025 |
| Text Advantage | $99.99 | $89.99 | $0.025 | 750 | $0.025 |
| Activation | $99 one-time | | | | |

Sources for cost assumptions: [Telnyx 10DLC fees](https://support.telnyx.com/en/articles/5634625-10dlc-fees-and-charges) (pass-through; no Telnyx markup stated). Verify before launch — fees change.

## Per-customer immediate (one-time) costs (typical marketing 10DLC)

| Item | Assumption |
|------|------------|
| Brand registration | $4.50 |
| Campaign review (manual) | $15 (per submission; resubmits bill again) |
| Enhanced vetting (recommended ISV) | ~$40 |
| Campaign MRC prepaid (3 months × $10) | $30 |
| Toll-free verification (if Option C) | TBD / exceptional charge |
| **Subtotal (happy-path 10DLC)** | **~$89.50** |

**Activation fee $99** covers the happy-path one-time registry path with ~$9.50 cushion before Stripe fees / support reserve. **Does not** cover repeated campaign rejections, T-Mobile special reviews, or TFN verification — use `SmsExceptionalCharge` with customer approval.

## Per-customer recurring monthly costs

| Item | Assumption |
|------|------------|
| Campaign MRC (Marketing/Mixed) | $10 |
| Low Volume Mixed (only if true LVM) | $1.50 — do **not** misdeclare |
| Sole Proprietor campaign | $2 |
| Charity | $3 |
| Local number rental | ~$1–$2 (use $1.50 in models) |
| Carrier surcharges (per segment) | ~$0.003–$0.005 send (carrier-dependent) |
| Telnyx message fee | account rate card (model $0.008 all-in segment until reconciled) |
| Stripe | 2.9% + $0.30 / charge |
| Support reserve | operational (not in unit cost) |

## Margin snapshots (assumptions — not a price change)

Fixed overhead ≈ $10 campaign + $1.50 number = **$11.50/mo** before message costs.

| Scenario | Revenue | Fixed overhead | Notes |
|----------|---------|----------------|-------|
| Entry $19.99, 0 usage | $19.99 | $11.50 | Thin but positive before Stripe/messages |
| Entry bundled n/a | — | — | Entry never bundles |
| Essentials $49.99 | $49.99 | $11.50 | Healthy |
| Essentials bundled $44.99 | $44.99 | $11.50 | Still healthy |
| Advantage $99.99 / $89.99 | high | $11.50 | Healthy |

### Loss / watch cases

| Case | Risk |
|------|------|
| Text Entry + high inbound overage + expensive carrier mix | Usage margin depends on Telnyx+carrier vs $0.025/$0.05 |
| Multiple campaign **resubmissions** ($15 each) | Can exceed $99 activation if not passed through |
| False Low Volume Mixed declaration | Compliance fines — never optimize fees this way |
| Sole proprietor customers needing scale | Throughput limits → support cost / upgrade path |
| Bundled Essentials + very high outbound at Advantage-like volume | Watch segment margin ($0.035 vs all-in cost) |
| Toll-free path without charging exceptional verification | Activation may not cover TFN verify |

**Recommendation:** Keep prices; treat activation as covering standard 10DLC setup; always bill exceptional registry fees with approval; reconcile Telnyx invoices before public launch.

External charges during SF-017: **$0**.
