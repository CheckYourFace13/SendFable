# Casey acquisition sender + support@ IMAP

Outbound From defaults to `Casey at SendFable <casey@sendfable.com>` (SES-verified).

Casey is an alias into `support@sendfable.com`. Reply detection polls **support@** via IMAP and recognizes messages addressed to Casey / acquisition subjects.

## IMAP env vars (required for reply-stop)

| Variable | Purpose |
|----------|---------|
| `SENDFABLE_ACQUISITION_IMAP_HOST` | Hostinger IMAP host |
| `SENDFABLE_ACQUISITION_IMAP_PORT` | Usually `993` |
| `SENDFABLE_ACQUISITION_IMAP_SECURE` | `true` for SSL/TLS |
| `SENDFABLE_ACQUISITION_IMAP_USER` | `support@sendfable.com` |
| `SENDFABLE_ACQUISITION_IMAP_PASS` | support mailbox password |

Also set:

```
SENDFABLE_ACQUISITION_FROM=Casey at SendFable <casey@sendfable.com>
SENDFABLE_ACQUISITION_REPLY_TO=casey@sendfable.com
```
