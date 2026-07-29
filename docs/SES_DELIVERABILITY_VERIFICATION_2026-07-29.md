# SES deliverability & event pipeline verification — 2026-07-29

## Account

| Check | Result |
|---|---|
| Region | `us-east-1` |
| ProductionAccessEnabled | `true` |
| SendingEnabled | `true` |
| EnforcementStatus | `HEALTHY` |
| Max24HourSend | `50000` |
| MaxSendRate | `14` |
| App ceiling | `PLATFORM_SEND_RATE_PER_SEC=5` |

## Identity `send.sendfable.com`

| Check | Result |
|---|---|
| Verified for sending | `true` |
| DKIM status | `SUCCESS`, signing enabled |
| DKIM CNAMEs | 3 tokens → `*.dkim.amazonses.com` |
| MAIL FROM | `bounce.send.sendfable.com` → `SUCCESS` |
| MAIL FROM SPF | `v=spf1 include:amazonses.com ~all` |
| Org DMARC (`_dmarc.sendfable.com`) | `p=quarantine; adkim=r; aspf=r` |

## Configuration set `sendfable-events`

Enabled SNS destination for: BOUNCE, COMPLAINT, DELIVERY, DELIVERY_DELAY, REJECT, RENDERING_FAILURE.

SNS topic `sendfable-ses-events`: **1 confirmed**, **0 pending** → `https://sendfable.com/api/webhooks/ses`.

## Account-level suppression

SES account suppression list is used for hard bounces/complaints at the AWS layer in addition to SendFable workspace/global suppression enforcement in-app. Exact IAM permission to call `GetAccountSuppressionAttributes` may be restricted on the SES app user — do not broaden IAM solely for this read.

## Alignment notes

- From addresses rewrite to the platform domain when customer domains are not authenticated (existing From-rewrite behavior).
- Soft DMARC alignment (`adkim=r`, `aspf=r`) matches MAIL FROM subdomain under `sendfable.com`.
