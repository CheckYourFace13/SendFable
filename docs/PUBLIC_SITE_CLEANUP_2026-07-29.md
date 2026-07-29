# Public site cleanup — 2026-07-29

## Root cause

Marketing pages were statically generated at Docker **build** time without
`ALLOW_PUBLIC_SIGNUP=true` / `EARLY_LAUNCH=false`, so the announcement bar baked
in “join the waitlist” even though runtime `.env` had public signup open.

## Fixes

- Announcement bar always shows live signup CTA
- Marketing layout `force-dynamic`
- Docker build args for launch flags
- Features copy no longer leads with BullMQ/SES jargon
- Legacy `/early-access` redirects to `/signup` when public signup is open
- Terms / privacy / refund / signup / billing early-launch wording cleaned
- Consistent “Start writing free” CTAs
- `public-launch-wording` unit tests + `scripts/crawl-public-launch.ts`
