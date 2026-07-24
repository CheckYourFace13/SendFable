# Incident runbook — launch day

Written 2026-07-24. Owner alert channel: SES email to `OWNER_ALERT_EMAIL`
(sent by `scripts/ops-alert.js`; monitor and backup scripts use it automatically).

## Monitoring in place

`/root/sendfable-monitor.sh` (cron, every 5 min, de-duplicated alerts max 1/6 h per check):

| Check | Alert condition |
|---|---|
| App availability | `https://sendfable.com/api/health` not 200 |
| Containers | app / worker / postgres / redis not running |
| Nginx | service inactive |
| Disk | ≥ 85% used (backup aborts at 92%) |
| TLS certificate | < 14 days to expiry |
| Backups | no success in 26 h |
| Queue | > 10 failed jobs, or > 500 waiting |
| Campaigns | stuck in SENDING > 2 h, or SCHEDULED start missed > 15 min |

Not yet automated (check manually or post-launch): Stripe webhook backlog
(Stripe dashboard → webhook delivery attempts), SES bounce/complaint/quota
metrics (AWS console; also enforced in-app via auto-pause thresholds),
elevated login failures, import/tracking abuse (rate limits mitigate).

## Kill switches (verified locations)

| Switch | How |
|---|---|
| Public signup off | `ALLOW_PUBLIC_SIGNUP=false` in `/opt/sendfable/.env` + restart app (currently OFF) |
| Public billing off | `STRIPE_BILLING_ENABLED=false` + restart (currently OFF) |
| All campaign sending off | `CAMPAIGN_SEND_ENABLED=false` + restart app & worker (currently OFF) |
| Single workspace suspension | set the owner's account hold flag (admin/DB); send path enforces holds |
| Single campaign pause | Pause button in app, or `POST /api/campaigns/:id/pause`; drains queued jobs |
| Global emergency send stop | `docker stop sendfable-worker` (jobs wait in Redis; nothing sends) |

Restart command: `cd /opt/sendfable && docker compose -p sendfable -f docker-compose.prod.yml up -d`

## Procedures

**SES pauses our sending / enforcement changes** — stop worker, check AWS SES
console reputation dashboard + case, keep `CAMPAIGN_SEND_ENABLED=false`,
respond to AWS, only resume after status is HEALTHY.

**Complaint spike** — auto-pause should trigger per-campaign; verify with the
monitor + campaign stats, suspend the offending workspace, review its list
source, do not resume without list evidence.

**Bounce spike** — same as complaints; also check DNS/DKIM validity
(`docs/SES_DNS_RECORDS.md`) in case of infrastructure cause.

**Compromised customer account** — set account hold, `docker stop
sendfable-worker` if sends are in flight, rotate the user's sessions (delete
their sessions/JWT secret rotation if severe), review campaigns sent, restore
after owner verification via support recovery (`docs/AUTH_POLICY.md`).

**Spam customer** — account hold + campaign pause; keep suppression records;
terminate per Acceptable Use Policy; refund per Refund Policy (violations are
non-refundable).

**Stripe outage** — billing is fail-closed (checkout errors surface to user);
no action needed beyond status-page note; webhooks retry automatically for 3
days and are idempotent.

**Database outage** — `docker compose ... up -d postgres`, check `docker logs
sendfable-postgres`, disk space, then restore from backup per
`docs/BACKUPS.md` if data is corrupted (isolated restore first).

**Worker backlog** — check `docker logs sendfable-worker`, Redis health, and
the failed set; requeue is manual (BullMQ retries 3× automatically).

**Accidental duplicate campaign** — pause the campaign immediately (drains
queued jobs); already-sent messages cannot be recalled; recipients were
deduplicated per campaign, so true duplicates require two campaigns — cancel
the second.

**Broken unsubscribe endpoint** — this is legally significant: stop all
sending (`docker stop sendfable-worker`), fix, verify
`/api/unsubscribe/one-click` returns 200, then resume.

**Data-security incident** — snapshot evidence (logs, `docker ps`, access
logs), rotate secrets (`.env` on VPS: DB password, NEXTAUTH_SECRET, Stripe +
AWS keys), assess scope before external communication, document a timeline,
and follow the Privacy Policy commitments on notification.
