# Production rollback — Sendfable

## Stop Sendfable only (leave other sites)

```bash
cd /opt/sendfable
docker compose -p sendfable -f docker-compose.prod.yml down
# Volumes retained unless you add -v
```

## Remove Nginx site

```bash
rm -f /etc/nginx/sites-enabled/sendfable
nginx -t && systemctl reload nginx
```

Restore a full Nginx backup if needed:

```bash
# Example — pick the timestamp from /root/nginx-backups/
tar -tzf /root/nginx-backups/nginx-YYYYMMDD-HHMMSS.tar.gz | head
# Prefer restoring only the sendfable site file rather than the whole tree
```

## Restore previous app image

```bash
cd /opt/sendfable
git log --oneline -5
git checkout <known-good-sha>
docker compose -p sendfable -f docker-compose.prod.yml up -d --build
```

## Destructive (data loss)

```bash
docker compose -p sendfable -f docker-compose.prod.yml down -v
```

Only if you intend to wipe Postgres/Redis/uploads volumes.
