# TEXT20 promo (dark until public SMS)

**Code:** `TEXT20`  
**Offer:** 20% off first **3** months on **Starter** and **Growth** (email plans; SMS plans only after public SMS)  
**Eligibility:** new paid subscriptions only; no stacking with other discounts  
**Positioning:** “Launch email and text together” — market only after `SENDFABLE_SMS_PUBLIC_ENABLED=true`

## Stripe (create in Dashboard or API — do not commit secrets)

1. Coupon: percent_off 20, duration `repeating`, duration_in_months 3, applies to Starter + Growth price IDs only  
2. Promotion code: `TEXT20`, first-time / new customers only if available, max redemptions optional  
3. Store promo id as `STRIPE_PROMO_TEXT20` in VPS env (not git)

## App wiring (already in code)

- Checkout accepts optional `promotionCode` (Stripe `promo_…` id)  
- Or set `SENDFABLE_CHECKOUT_ALLOW_PROMOTION_CODES=true` so customers can type codes at Checkout  
- Event `promo_applied` fires when a code id is passed into Checkout create  
- Landing `/promo/text20` stays dark (404-style message) unless `SENDFABLE_PROMO_TEXT20_PUBLIC=true` **and** public SMS is on

## Do not

- Touch `STRIPE_CERT_PROMO_ID` / cert coupons  
- Market TEXT20 while SMS is dark  
- Enable permanent sitewide discounts that cheapen $12 Starter
