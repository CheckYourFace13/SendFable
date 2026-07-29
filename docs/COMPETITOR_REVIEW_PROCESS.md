# Competitor review process

## Purpose

Keep SendFable comparison pages honest without automated scraping or silent public edits.

## Cadence

| Competitor | Pricing review | Feature review |
|------------|----------------|----------------|
| Mailchimp | Monthly | Monthly |
| MailerLite, Brevo, ActiveCampaign, HubSpot, Omnisend | Monthly | Monthly |
| Remaining public comparisons | Quarterly | Quarterly |

## Workflow

1. Open `/admin/competitors` freshness report.
2. Visit each vendor’s **official pricing URL** listed in `src/data/competitors/catalog.ts`.
3. Update `pricingLastChecked` / `featuresLastChecked` and tier notes when facts change.
4. Mark `reviewStatus` (`reviewed` / `stale` / `draft`).
5. Run unit tests (`competitor-catalog`, public launch wording).
6. Deploy only after owner review of material pricing changes.

## Rules

- Prefer official pricing pages over third-party blogs.
- Label imperfect matches as **approximate**.
- Never invent discounts, awards, or customer counts.
- Never auto-publish scraped HTML.
- Do not violate vendor site terms with aggressive scraping.

## Correction path

Public pages include “See something outdated? Let us know” → `/contact`.
