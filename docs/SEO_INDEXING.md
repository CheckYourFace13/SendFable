# Getting Sendfable into Google & AI search

Technical SEO/AEO/GEO improvements ship in the product. **Ranking still requires indexing + time + links.** No tool can guarantee “#1 for email marketing.”

## Done in product (inner pages — homepage hero unchanged)

- FAQPage JSON-LD on FAQ blocks
- Organization + WebSite JSON-LD on marketing layout
- HowTo + DefinedTermSet on deliverability / how-to guides
- Answer-lead blocks for featured-snippet / AI citation style
- New high-intent pages:
  - `/email-marketing-for-small-business`
  - `/migrate/mailchimp`
- Expanded `/deliverability` and `/resources`
- Updated `sitemap.xml`, `llms.txt`, per-page canonicals on new hubs
- CTAs point to early access / login (simple path)

## Owner actions (required for Google)

1. **Google Search Console**
   - Add property `https://sendfable.com`
   - Verify (DNS TXT or HTML file — do not break existing DNS/email records)
   - Submit sitemap: `https://sendfable.com/sitemap.xml`
   - Request indexing for:
     - `/email-marketing-for-small-business`
     - `/migrate/mailchimp`
     - `/deliverability`
     - `/resources`
     - `/compare/mailchimp`

2. **Bing Webmaster Tools** (optional but useful)
   - Import from Search Console or add site + sitemap

3. **Keep shipping real content**
   - Update changelog when features ship
   - Refresh competitor pricing dates when you re-check vendors
   - Earn mentions from local/business directories (links help more than more thin pages)

4. **Do not**
   - Buy links or spam directories
   - Claim “#1 email marketing” or guaranteed inbox rates
   - Create dozens of near-duplicate keyword pages

## AI / answer engines (AEO / GEO)

- Keep `https://sendfable.com/llms.txt` accurate
- Prefer clear question → direct answer → steps on guides (already patterned)
- Cite-ready definitions on deliverability

## Measure

- Search Console → Performance (queries, clicks, impressions)
- Early-access lead count in `/admin/early-access`
