# Growth launch — August 2026

Production baseline at certification: `746a075…` (superseded by this growth deploy).

Goal: **traffic → signup → first send → second send → paid.** SMS stays dark.

---

## Top 20 URLs to index first (commercial intent)

1. `/`
2. `/pricing`
3. `/signup` *(disallowed in robots — do not request indexing; use as conversion)*
4. `/templates`
5. `/solutions`
6. `/mailchimp-alternative`
7. `/compare/mailchimp`
8. `/mailerlite-alternative`
9. `/constant-contact-alternative`
10. `/cheap-email-marketing`
11. `/email-marketing-cost`
12. `/email-marketing-for-small-business`
13. `/simple-email-marketing-software`
14. `/email-newsletter-software`
15. `/small-business-newsletter-software`
16. `/solutions/restaurants`
17. `/solutions/breweries`
18. `/solutions/retail`
19. `/switch-from-mailchimp`
20. `/guides/best-mailchimp-alternative-for-small-businesses`

After those: other `/solutions/*`, `/compare/*`, new guides, `/deliverability`, `/about`.

---

## Google Search Console — OWNER CHECKLIST

**Status: OWNER ACTION** (verification token not inventable)

1. Open [Google Search Console](https://search.google.com/search-console).
2. Add property → **Domain** → `sendfable.com` (preferred).
3. Copy the DNS TXT record Google shows → add at your DNS host → Verify.
4. **Alternative:** URL-prefix `https://sendfable.com` → HTML tag → copy only the `content="…"` token → tell Cursor → set `GOOGLE_SITE_VERIFICATION` on VPS `.env` → redeploy.
5. Sitemaps → submit: `https://sendfable.com/sitemap.xml`
6. URL Inspection → request indexing for the Top 20 list above (start with `/`, `/pricing`, `/mailchimp-alternative`, `/solutions/restaurants`).

**Already live:** canonical host `https://sendfable.com`, sitemap, robots → Sitemap line, no accidental noindex on commercial pages, verification env wired in `src/app/layout.tsx`.

---

## Bing Webmaster + IndexNow — OWNER CHECKLIST

**Status: READY infrastructure / OWNER ACTION for property**

1. [Bing Webmaster Tools](https://www.bing.com/webmasters) → prefer **Import from Google** once GSC is verified.
2. Or add `https://sendfable.com` and complete verification (HTML meta → `BING_SITE_VERIFICATION` on VPS).
3. Submit sitemap: `https://sendfable.com/sitemap.xml`
4. IndexNow: key file live at `/indexnow/key.txt` and `/{INDEXNOW_KEY}.txt` (INDEXNOW_KEY already set on VPS).
5. After publishes, owner (or Cursor with admin session) can POST public URLs via `/api/admin/indexnow` — do not spam.

---

## First 20 customers — playbook

**Qualified prospect:** US/Canada local business, 50–2,500 contacts, already emails or wants to, owner controls marketing, currently on Mailchimp/Constant Contact/BCC-from-Gmail or nothing. Avoid enterprises.

**Primary industries:** restaurants, breweries, salons, retail, contractors, nonprofits, local events, real estate.

**Week 1:** You + 5 warm contacts complete Signup → verify → sender → 3 contacts → first send.  
**Week 2:** Same people send a second campaign; collect one sentence of feedback.  
**Weeks 3–4:** 10–15 personalized emails (no purchased lists) linking industry pages with UTMs from `docs/CUSTOMER_ACQUISITION_2026-08.md`.

**Success:** 15–25 signups, ≥40% first send among verified, 2–4 Starter upgrades.

---

## Warm-network scripts (do not auto-send)

**30-second explanation:**  
“SendFable is simple email marketing for small businesses. Free for 500 contacts and 1,000 emails a month. You import your list, write an email, and we handle delivery. No Mailchimp maze.”

**Short email:**  
Subject: Quick favor — try a simple email tool?  
Body: I built SendFable for businesses that don’t want to fight Mailchimp. Free for 500 contacts. If you have 20 minutes this week, I’d love you to send one real campaign to a small segment and tell me where it gets confusing. Link: https://sendfable.com/signup?utm_source=warm&utm_medium=email&utm_campaign=first20

**Text / LinkedIn:** shorter version of the above + signup link with UTM.

---

## Outreach system (prepared, not sent)

Track in a spreadsheet: business | why fit | current tool | landing page | opener | status | signup | first send | paid.  
Batch size: 10–25. Personalize. No scraped blasts. Land on `/solutions/{industry}` or `/mailchimp-alternative`.

---

## Directories (evaluate; do not pay without approval)

| Place | Priority | Status |
|-------|----------|--------|
| AlternativeTo | High | Ready — use descriptions below |
| Product Hunt | High | Launch when demo assets ready |
| SaaSHub | Medium | Free listing |
| BetaList | Medium | Startup timing |
| G2 / Capterra | Medium | May want sales contact — owner decide |
| Indie Hackers | Low | Soft launch post |

**Short description (≤160):** Simple email marketing for small businesses. Free: 500 contacts, 1,000 emails/mo.

**Long:** See About + `/how-sendfable-works`. Pricing: Free / Starter $12 / Growth $29 / Pro $69 / Pro Plus $99. Support: support@sendfable.com. Privacy: /privacy. Terms: /terms. Logo: `/brand/sendfable-mark.svg`, social card: `/brand/sendfable-social-card.jpg`.

---

## Support mailbox owner test

From an external account, email each of: support@, legal@, privacy@, abuse@, security@sendfable.com. Confirm receipt, reply, and spam placement. Code cannot prove monitoring.

---

## Real first-send test (owner mailbox)

1. Signup with real inbox → verify link  
2. Add sender → verify  
3. Set mailing address  
4. Add 3 synthetic contacts (owner-controlled)  
5. Build campaign → Send Confidence clean  
6. Send → receive → click → unsubscribe one → confirm suppression  
7. Duplicate → second draft  

Do not mail prospects.

---

## VPS reboot runbook (do not auto-reboot)

**Before:** Confirm no active campaign-send jobs (`docker compose … logs worker`); copy `.env` backup; note `git rev-parse HEAD`; take DB backup script if available.  
**Reboot:** `sudo reboot` in maintenance window.  
**After:** `docker compose -p sendfable -f docker-compose.prod.yml ps`; `curl -sf http://127.0.0.1:3010/api/health`; nginx -t; spot-check homepage + signup.

---

## CSP / npm audit

CSP remains report-only / deferred — enforcing now risks Stripe/auth breakage.  
npm audit: mostly transitive/dev; no force major Next upgrade in this pass.
