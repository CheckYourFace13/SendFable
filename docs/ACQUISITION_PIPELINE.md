# SendFable — Autonomous Customer Acquisition Pipeline

**Status:** Built behind feature flags. **Live outreach emails: 0** until owner enables sending.

## Flags (defaults)

| Flag | Default |
|------|---------|
| `SENDFABLE_ACQUISITION_ENABLED` | `false` |
| `SENDFABLE_ACQUISITION_DISCOVERY_ENABLED` | `false` |
| `SENDFABLE_ACQUISITION_SENDING_ENABLED` | `false` |
| `SENDFABLE_ACQUISITION_DAILY_NEW_LIMIT` | `10` |
| `SENDFABLE_ACQUISITION_DAILY_TOTAL_LIMIT` | `25` |
| `SENDFABLE_ACQUISITION_MIN_SCORE` | `65` |

## Pipeline

DISCOVER → QUALIFY → ENRICH → DEDUPE → SCORE → PERSONALIZE → SEND → FOLLOW UP → REPLY → SIGNUP → STOP → REPORT

Worker tick runs every 60s when `SENDFABLE_ACQUISITION_ENABLED=true` (no-op otherwise).

## Discovery

Seed catalog of public US small-business websites (`src/lib/acquisition/discovery/seed-catalog.ts`).
Enrichment fetches public HTML only (no CAPTCHA bypass). Extracts published `mailto:` / contact emails.
Never invents addresses.

## Cadence

- Initial day 0
- Follow-up 1 day 4
- Follow-up 2 day 10
- Then `OUTREACH_COMPLETE`

Mon–Fri, ~9am–3pm recipient-local; max 1 email/business/day.

## Safety pause

Complaint rate ≥ 0.1% or hard bounce ≥ 5% (recent window) → pipeline auto-pauses.

## Admin

- `/admin/acquisition` — dashboard
- `/admin/acquisition/[id]` — prospect detail / suppress / mark reply

## Dry run

```bash
npm run acquisition:dry-run
```

Creates/updates prospects + **dry-run drafts only**. Does not enable sending.

## Controlled live activation (owner)

1. Configure `SENDFABLE_ACQUISITION_FROM` (SES-verified) + Reply-To.
2. Confirm SPF/DKIM/DMARC for send domain.
3. `SENDFABLE_ACQUISITION_ENABLED=true` + `DISCOVERY_ENABLED=true` (sending still false).
4. Review first 20 qualified in admin.
5. Set `DAILY_NEW_LIMIT=5`, then `SENDING_ENABLED=true` for one controlled day.
6. Verify bounce/complaint/unsub/reply-stop/signup-stop.
7. Only then raise to 10/day.

## Do not

- Buy email lists
- Guess emails
- Auto AI sales replies
- Contaminate customer campaign sending identity without a dedicated From
- Enable SMS
