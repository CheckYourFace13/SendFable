# Deployment record — email production launch — 2026-07-29

## Timeline (UTC)

| Time | Event |
|---|---|
| 14:45:46 | Pre-deploy backup success (`last-success`) |
| 14:45:48 | Off-host backup success |
| 14:49:40 | Deploy `70eddfa` (rate limit + docs + CTA) — `DEPLOY_OK` |
| 14:50:22 | Controlled SES mailer tests (delivery/bounce/complaint) — 3 accepted |
| ~15:01 | Hotfix rebuild with global suppression for unknown SES messageIds |
| 15:01:46 | Simulator bounce/complaint → `GlobalSuppression` |
| 15:04:47 | Owner campaign send + delivery webhook (`deliveredAt` set) |
| 15:09:41 | Public launch flags activated |

## Production commit

`e23ec7239a61bfa5a61d498f4d8131559da04162` on `main` / `/opt/sendfable`

## Services restarted

`sendfable-app`, `sendfable-worker` only (postgres/redis left running).

## Env changes (names only)

- Added `PLATFORM_SEND_RATE_PER_SEC=5`
- Flipped `EARLY_LAUNCH`, `ALLOW_PUBLIC_SIGNUP`, `STRIPE_BILLING_ENABLED`, `STRIPE_OWNER_TEST_ENABLED`, `CAMPAIGN_SEND_ENABLED`
- Left `SES_CONTROLLED_TEST_ENABLED=false` after tests
- No SMS keys

## Rollback

See `docs/EMAIL_LAUNCH_GO_NOGO_2026-07-29.md` and flag snapshots under `/root/sendfable-backups/flags-*-public-launch-2026-07-29.env`.
