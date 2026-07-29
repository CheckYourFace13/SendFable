# SF-015 — External account and SMS launch package

Unavoidable owner decisions only. No ambiguous activation.

| Field | Value |
|-------|-------|
| Reference | SF-015 |
| Date | 2026-07-29 |
| External charges by Cursor | **$0** |

---

## SECTION A — Search engines

| Item | Action |
|------|--------|
| Google Search Console | Verify Domain `sendfable.com` (DNS TXT preferred) — see `docs/SEARCH_ENGINE_OWNER_ACTIONS.md` |
| Bing Webmaster Tools | Import GSC or verify; submit sitemap |
| Sitemap | `https://sendfable.com/sitemap.xml` |
| Expected time | ~10–20 minutes (+ DNS propagation) |
| App code changes by owner | None — supply meta tokens if using HTML verification; Cursor sets env + redeploys |

Verification values needed: GSC Domain TXT **or** `GOOGLE_SITE_VERIFICATION`; Bing import **or** `BING_SITE_VERIFICATION`.

---

## SECTION B — Stripe test mode for SMS

1. Open Stripe Dashboard → switch to **Test mode**.
2. Developers → API keys → create/reveal a **test** secret key (`sk_test_...`). Prefer a restricted key that can manage Products/Prices/Billing Meters only.
3. On the VPS only (never paste into chat or git):

```bash
# On VPS as root
nano /opt/sendfable/.env
# set STRIPE_SECRET_KEY=sk_test_...   # temporary for SMS catalog setup only
# keep a backup of the live key offline; do not commit
```

4. Commands Cursor will run after the test key is in place:

```bash
cd /opt/sendfable
docker compose -p sendfable -f docker-compose.prod.yml exec -T app npx tsx scripts/stripe-sms-setup.ts
docker compose -p sendfable -f docker-compose.prod.yml exec -T app npx tsx scripts/stripe-sms-setup.ts --confirm-test-sms-setup
```

5. Restore live `sk_live_` (or leave billing on live key) after test catalog creation; store test price IDs in env if keeping them.
6. Cleanup: Stripe test products can remain in test mode; do not create live SMS products without approval.

---

## SECTION C — Telnyx (re-verified 2026-07-29)

Sources:

- https://support.telnyx.com/en/articles/5634625-10dlc-fees-and-charges
- https://developers.telnyx.com/api-reference/brands/create-brand
- https://developers.telnyx.com/docs/messaging/10dlc/brand-registration

| Item | Estimate | Refundable? |
|------|----------|-------------|
| Brand registration | ~$4–$4.50 one-time | **No** |
| Brand vetting | ~$4 standard / ~$40 enhanced (confirm class) | **No** |
| Campaign (regular use case) | Often first 3 months upfront (~$30 at $10/mo) OR low-volume mixed lower | **No** |
| Monthly campaign after | ~$1.50–$10 by use case | N/A |
| Manual campaign review | ~$15 per review if triggered | **No** |
| US local number | Confirm portal (assumption ~$1–$2/mo) | N/A |
| Test message segments | Low cents each — confirm rate card | N/A |

**Expected immediate total (order-of-magnitude):** roughly **$40–$90+** depending on vetting + use case — **verify in Telnyx portal before paying**.

**Recurring fixed (order-of-magnitude):** campaign MRC + number MRC ≈ **$3–$12+/mo** before traffic.

**Timeline:** brand/campaign review can take days; carrier vetting varies.

**Required business info:** legal name, EIN/entity type, address, website, vertical, sample messages, opt-in description, support email/phone.

### Exact approval choices

Reply with exactly one:

`APPROVE TELNYX STANDARD SETUP`

or

`DO NOT APPROVE TELNYX SETUP`

Cursor will not purchase numbers or submit paid registration without the first phrase.

---

## SECTION D — Content and marketing status

| Item | Status |
|------|--------|
| Articles published (this sequence) | **2** |
| Drafts remaining | **10** |
| General nurture | Inactive |
| Social scheduling | Inactive |
| Partner outreach | Inactive |
| Referral credits | Inactive |

### Future approval phrases (exact)

```
APPROVE LEAD NURTURE
APPROVE FREE-USER NURTURE
APPROVE SOCIAL SCHEDULING
APPROVE REFERRAL CREDITS
APPROVE PARTNER OUTREACH
```

Ambiguous wording will not activate these systems.
