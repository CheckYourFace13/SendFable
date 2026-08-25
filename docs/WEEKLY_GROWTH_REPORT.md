# Weekly growth report (owner)

Open `/admin/funnel` (platform owner). Analytics requires `ANALYTICS_ENABLED=true` (already on production).

## Read each Monday

| Metric | Where |
|--------|--------|
| Landing / organic | Stage `organic_landing` + top paths |
| Signups | `signup_complete` |
| Sender verified | `sender_verified` |
| Contacts | `contact_created` / `contact_imported` |
| First send | `first_campaign_sent` |
| Second send | `second_campaign_sent` |
| Checkout | `checkout_started` |
| Paid | `checkout_completed` / `subscription_started` |
| Footer badge | UTM `footer_badge` + `referral_badge_click` |

Stage cards show “% of prior” conversion between funnel steps.

## Optional Search Console

After GSC is verified, paste top queries into a notes doc — do not invent rankings.

## What not to obsess over

Raw pageviews without signup, social vanity likes, or SMS (still dark).
