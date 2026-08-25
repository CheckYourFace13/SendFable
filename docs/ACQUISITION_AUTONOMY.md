# SendFable — Autonomous Acquisition

## Status

Code supports fully autonomous growth. **Live sending stays OFF until:**

1. `chris@sendfable.com` is verified in AWS SES (us-east-1)
2. Flags enabled on the VPS (see below)
3. (Recommended) IMAP credentials for automatic reply detection

## Autonomy behavior

- Auto-approve when score ≥ 70 + US state + same-domain public email + evidence (no owner review)
- Stage 1 caps: 5 new / 10 total per day
- Auto-ramp after 3 business days + healthy metrics (max stage 4)
- Hard-pause on complaints / high bounce / high unsub
- Exception-only owner alerts (no daily noise)
- Follow-up: day 0 / 4 / 10 then stop

## Enable (after SES verify)

```bash
# on VPS /opt/sendfable/.env
SENDFABLE_ACQUISITION_ENABLED=true
SENDFABLE_ACQUISITION_DISCOVERY_ENABLED=true
SENDFABLE_ACQUISITION_SENDING_ENABLED=true
SENDFABLE_ACQUISITION_AUTO_APPROVE=true
SENDFABLE_ACQUISITION_AUTO_RAMP=true
SENDFABLE_ACQUISITION_MIN_SCORE=70
SENDFABLE_ACQUISITION_RAMP_STAGE=1
SENDFABLE_ACQUISITION_FROM=Chris at SendFable <chris@sendfable.com>
```

Then recreate app+worker containers.

## ONE required owner step (current)

AWS SES Console → us-east-1 → Identities → Create identity → Email → `chris@sendfable.com` → confirm the verification email.
