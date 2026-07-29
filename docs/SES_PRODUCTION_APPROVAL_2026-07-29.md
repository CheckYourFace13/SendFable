# AWS SES production access — approval record

**Recorded:** 2026-07-29  
**Source:** AWS Support correspondence for case `178491867800933` (sandbox removal approval).  
Private email headers and credentials are not reproduced here.

## Approval summary

| Field | Value |
|---|---|
| Case | `178491867800933` |
| Decision | **APPROVED** — Amazon SES sandbox removal |
| Approval date | **July 29, 2026** |
| Effective | **Immediately** |
| Region | **us-east-1** (US East / N. Virginia) |
| Daily sending quota | **50,000** messages per 24 hours |
| Maximum sending rate | **14** messages per second |
| Live API confirmation | `ProductionAccessEnabled=true`, `SendingEnabled=true`, `EnforcementStatus=HEALTHY`, `ReviewDetails.Status=GRANTED` |

## Live verification (2026-07-29, read-only)

| Check | Result |
|---|---|
| `ProductionAccessEnabled` | `true` |
| `SendingEnabled` | `true` |
| `EnforcementStatus` | `HEALTHY` |
| `Max24HourSend` | `50000` |
| `MaxSendRate` | `14` |
| `SentLast24Hours` (at check) | `0` |
| Platform identity `send.sendfable.com` | Verified, sending enabled |
| DKIM | `SUCCESS`, signing enabled |
| MAIL FROM `bounce.send.sendfable.com` | `SUCCESS` |
| Configuration set `sendfable-events` | Bounce, complaint, delivery (+ delay/reject/rendering) → SNS |
| SNS topic subscriptions confirmed | `1` confirmed, `0` pending |
| App region | `AWS_REGION=us-east-1` |

## Application launch posture (conservative)

AWS permits **14 msg/s**. SendFable launches with an **application-level ceiling of 5 messages per second** (`PLATFORM_SEND_RATE_PER_SEC`, default `5`), below the AWS account rate. New-account ramp, plan monthly allowances, daily ceilings, pause/cancel, and bounce/complaint auto-holds remain active.

## Supersedes

Any prior documentation stating SES production access is pending, denied, or awaiting owner reply for case `178491867800933` is superseded by this approval record.
