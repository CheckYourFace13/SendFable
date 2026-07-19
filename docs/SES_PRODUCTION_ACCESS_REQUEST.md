# Sample SES production access request

Use AWS SES → Account dashboard → Request production access. Adapt this text honestly to your business.

**Mail type:** Transactional and marketing (permission-based newsletters and promotions).

**Website URL:** https://YOUR_DOMAIN

**Use case:** Sendfable customers send email only to contacts who opted in via signup forms or imported lists they own. Purchased/scraped lists are prohibited in our terms. We implement List-Unsubscribe (RFC 8058), suppress hard bounces and complaints globally, and auto-pause campaigns that exceed 5% bounce or 0.1% complaint rates.

**How recipients opt in:** Hosted signup forms (optional double opt-in), CSV import of existing consented lists, and manual adds.

**Bounce/complaint process:** SES configuration set publishes Bounce, Complaint, and Delivery to SNS → our HTTPS webhook. Hard bounces and complaints suppress the address workspace-wide and platform-wide.

**Expected volume:** Start under daily ramp limits (hundreds/day) and grow with clean sends. Monthly plan ceilings are documented in-product.

**Compliance:** Physical mailing address required before first send; unsubscribe in every campaign footer.
