# Database backups & restore

Set up 2026-07-24. Scope: the `sendfable` PostgreSQL database only. Never
touches RentalNoodle, GravyBlock, or any other application's data or backups.

## Backup

- **Command:** `/root/sendfable-backups/backup.sh` (source: `deploy/sendfable-backup.sh`)
  — `docker exec sendfable-postgres pg_dump -U sendfable sendfable | gzip`
- **Schedule:** daily at 03:15 server time (root crontab).
- **Storage:** `/root/sendfable-backups/{daily,weekly,monthly}` — root-only (`700`/`600`).
- **Retention:** 14 days daily, 60 days weekly (Sunday copies), 365 days monthly (1st-of-month copies).
- **Integrity:** `gzip -t` self-test, minimum-size sanity check, `sha256sum` sidecar per file.
- **Logs:** `/root/sendfable-backups/backup.log` (timestamped); `last-success` marker file.
- **Off-host:** age-encrypted upload to private S3 (dedicated backup IAM — not the SES user).
  Marker: `/root/sendfable-backups/last-offhost-success`. Setup: `docs/OFFHOST_BACKUP_SETUP.md`.
- **Failure alerting:** backup failures email the owner via SES
  (`scripts/ops-alert.js`, `OWNER_ALERT_EMAIL`); the 5-minute monitor also
  alerts if `last-success` is older than 26 h.
- **Secrets:** dumps contain application data only; no `.env` files or keys are
  included in backups or logs. Age private key stays on the VPS only.
- **Disk safety:** backup aborts (with alert) at ≥ 92% disk; monitor warns at 85%.

## Restore

Restore drill (isolated; never against the production DB):

```bash
# 1. Create an isolated scratch database
docker exec sendfable-postgres createdb -U sendfable sendfable_restore_drill
# 2. Restore the latest daily backup
gunzip -c /root/sendfable-backups/daily/<latest>.sql.gz \
  | docker exec -i sendfable-postgres psql -U sendfable -d sendfable_restore_drill
# 3. Verify (table count, key row counts vs production)
# 4. Drop the scratch database
docker exec sendfable-postgres dropdb -U sendfable sendfable_restore_drill
```

For off-host: download `.age` object → `age -d` with the VPS age key → gunzip → same isolated restore.

Real recovery: stop app + worker, restore into a fresh database the same way,
point `DATABASE_URL` at it, start containers, verify `/api/health`.

## Rechecked 2026-07-26

- **Last successful local backup:** `/root/sendfable-backups/last-success` → 2026-07-26T03:15:01Z
- **Last successful off-host upload:** `/root/sendfable-backups/last-offhost-success` → same window (daily + weekly `.age`)
- **Last successful restore drill:** 2026-07-24 (documented). Refresh before public launch activation.
