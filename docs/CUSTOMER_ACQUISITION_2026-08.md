# Customer acquisition plan — August 2026

Prepared as part of the growth & quality pass. **Do not send outreach or create social accounts from this doc alone** — owner executes.

## Ideal first customer profile

| Attribute | Target |
|-----------|--------|
| Business type | Local service or retail with an existing customer list (50–2,500 contacts) |
| Current tool | Mailchimp Free/Standard, Constant Contact, or “we just use Gmail BCC” |
| Pain | Paying for unused CRM features, confused pricing, or deliverability anxiety with personal domains |
| Decision maker | Owner or office manager who can verify a sender and import a CSV this week |
| Geography | US/Canada first (SES + support hours) |

## Initial industries (priority order)

1. **Restaurants & cafés** — weekly specials, event nights (`/solutions/restaurants`)
2. **Contractors & trades** — seasonal reminders (`/solutions/contractors`)
3. **Breweries & taprooms** — release alerts (`/solutions/breweries`)
4. **Nonprofits** — donor/volunteer updates (`/solutions/nonprofits`)
5. **Salons & retail** — promos and win-backs (`/solutions/salons`, `/solutions/retail`)

## Outreach angles (draft — not sent)

| Angle | Hook | Landing page |
|-------|------|----------------|
| Mailchimp bill shock | “At ~2.5k contacts, Mailchimp Standard is often ~$45/mo; SendFable Starter is $12.” | `/compare/mailchimp` |
| Gmail BCC chaos | “Verify your From address, keep Reply-To, send from a real tool.” | `/email-marketing-without-gmail` |
| First campaign this week | “Free: 500 contacts, 1,000 emails/mo — import CSV and send.” | `/signup?utm_source=outreach&utm_medium=email&utm_campaign=first_send` |
| Industry-specific | “Plays for [industry] — not a generic blast template.” | `/solutions/{industry}` |

## UTM convention

```
utm_source   = channel (email | linkedin | facebook | partner | footer_badge)
utm_medium   = format (outreach | post | bio | footer_badge | referral)
utm_campaign = initiative (first_send | launch_2026 | mailchimp_switch | free_plan)
utm_content  = optional variant (subject_a | cta_pricing)
utm_term     = optional keyword for paid search later
```

**Live today:** Free-plan email footer badge uses  
`utm_source=email&utm_medium=footer_badge&utm_campaign=free_plan`  
→ tracked as `referral_badge_click` on homepage.

## First 10–20 users plan

### Week 1 — Prove the loop (owner + warm network)

1. Verify GSC + Bing (see `docs/SEARCH_ENGINE_OWNER_ACTIONS.md`).
2. Ask 3–5 friendly businesses for a **controlled first send** (they import real consented list).
3. Watch `/admin/funnel` for: signup → sender_verified → contact_imported → first_campaign_sent.

### Week 2 — Second send + feedback

4. Follow up with week-1 users for a **second campaign** (now tracked as `second_campaign_sent`).
5. Collect one sentence of feedback via in-app `FirstSendFeedback` — permission to quote later.
6. Post one industry-specific tip on owner’s personal LinkedIn/Facebook (copy in `docs/SOCIAL_LAUNCH_KIT.md`).

### Weeks 3–4 — Light outbound

7. Send 10–15 personalized emails to local businesses (no purchased lists) with industry landing links.
8. Offer free migration help for Mailchimp CSV export (`/guides/export-contacts-from-mailchimp`).
9. Review funnel drop-off: if sender_verified is low, prioritize deliverability content.

### Conversion to paid

10. Trigger: 80%+ of contact cap or second successful send + positive feedback.
11. In-app usage banners (80/90/100%) already point to `/billing`.
12. Do **not** enable monetary referral credits until `REFERRAL_CREDITS_ENABLED=true` after economics review.

## Success metrics (30 days)

| Stage | Goal |
|-------|------|
| Signups | 15–25 |
| Sender verified | ≥60% of signups |
| First send | ≥40% of verified |
| Second send | ≥50% of first senders |
| Paid | 2–4 Starter upgrades |

## Content priorities (organic)

See `docs/CONTENT_PLAN_2026-08.md`.

## Prepared for owner action

- [ ] Google Search Console domain verify + sitemap
- [ ] Bing Webmaster import + sitemap
- [ ] Optional: `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` env tokens
- [ ] Optional: `NEXT_PUBLIC_GA4_ID` for marketing attribution
- [ ] Social account creation + bio from launch kit
- [ ] First outreach batch (manual send)
