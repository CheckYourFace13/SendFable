# Stripe Tax readiness (Sendfable)

**Stripe Tax is not enabled** for Sendfable production unless explicitly approved.

## Facts

- Stripe Tax does **not** automatically create tax registrations for you.
- Enabling Tax collection without registrations can still leave you non-compliant.
- SaaS sales-tax / VAT obligations depend on nexus, customer location, and product classification — a tax professional should confirm obligations for Sendfable.

## Current policy

- Tax collection: **disabled**
- Do not auto-enable Stripe Tax during live billing setup
- Prices are configured as USD recurring amounts exclusive of automatic tax unless later approved

## Before enabling Tax

1. Confirm registrations / obligations with a tax advisor
2. Configure Stripe Tax settings and registrations intentionally
3. Decide whether prices are tax-inclusive or exclusive
4. Update Checkout / Portal / invoices accordingly
5. Document the decision in this file with date + owner approval
