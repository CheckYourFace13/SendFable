# Production operations — Sendfable

## Day-2 commands

```bash
# Status
cd /opt/sendfable
docker compose -p sendfable -f docker-compose.prod.yml ps
curl -sf http://127.0.0.1:3010/api/health

# Logs
docker logs -f sendfable-app --tail 100
docker logs -f sendfable-worker --tail 100

# Restart
docker compose -p sendfable -f docker-compose.prod.yml restart app worker
```

## Nginx

```bash
nginx -t && systemctl reload nginx
# Backups live in /root/nginx-backups/
```

## Secrets

| Item | Location |
|------|----------|
| App env | `/opt/sendfable/.env` (600) |
| Owner temp password file | `/root/sendfable-secrets/owner-password.txt` |
| Nginx backups | `/root/nginx-backups/` |

Rotate the owner password after first login (Settings / change password flow when available, or re-run `create-owner` with a new `OWNER_PASSWORD`).

## Early launch flags

In `.env`:

- `EARLY_LAUNCH=true`
- `ALLOW_PUBLIC_SIGNUP=false`
- blank `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` → no SES sends
- blank Stripe keys → billing disabled

## Isolation checks

```bash
docker port sendfable-app          # expect 127.0.0.1:3010
docker port sendfable-postgres     # expect empty
ss -tlnp | grep 3010
```
