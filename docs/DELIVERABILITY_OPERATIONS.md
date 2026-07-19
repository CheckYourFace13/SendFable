# Deliverability operations

## Warmup / ramp

New accounts start at `accountRampLevel = 1` (~500 emails/day, doubling after clean completed campaigns, capped by plan). Do not blast a huge cold list on day one.

## Thresholds (enforced in product)

- Bounce rate > **5%** → campaign auto-pause + owner email
- Complaint rate > **0.1%** → campaign auto-pause + account flag

## List quality

- No purchased, rented, or scraped lists (Terms)
- Imports over 1,000 on ramp level 1 require explicit policy confirmation
- Hard bounces and complaints enter workspace + global suppression

## From rewrite

Gmail/Yahoo/Outlook-class addresses send as `localpart@PLATFORM_SEND_DOMAIN` with Reply-To set to the real address so DMARC can pass.

## Opens are estimates

Apple Mail Privacy Protection and similar features inflate open rates. Treat opens as directional; prefer clicks and replies for decisions.
