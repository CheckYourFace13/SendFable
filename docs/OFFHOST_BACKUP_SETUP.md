# Off-host backup — Option A proposal (approved to proceed if &lt; $1/mo)

Prepared: 2026-07-24 evening  
**Decision:** Proceed with dedicated S3 + separate backup IAM. Do **not** expand `sendfable-ses-production`.

## Proposed resources

| Item | Value |
|---|---|
| Bucket name | `sendfable-db-backups-911167908678` (account-suffixed, globally unique) |
| Region | `us-east-1` (same as SES account) |
| Prefix | `postgres/` only |
| Public access | Block **all** public access |
| Versioning | Enabled (protects against accidental overwrite) |
| SSE | SSE-S3 (`AES256`) on bucket default + TLS-only bucket policy |
| Client-side encryption | `age` before upload (`.sql.gz.age`) — AWS cannot read plaintext even with bucket access |
| IAM user | `sendfable-backup` — **only** `s3:PutObject`, `GetObject`, `ListBucket`, `DeleteObject` on this bucket/prefix |
| Access keys | Stored only in `/opt/sendfable/.env` as `BACKUP_S3_*` (never in git; never on SES user) |

## IAM policy (least privilege)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListPrefix",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::sendfable-db-backups-911167908678",
      "Condition": { "StringLike": { "s3:prefix": ["postgres/*"] } }
    },
    {
      "Sid": "Objects",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:GetObjectTagging", "s3:PutObjectTagging"],
      "Resource": "arn:aws:s3:::sendfable-db-backups-911167908678/postgres/*"
    }
  ]
}
```

No SES, EC2, IAM, Stripe, or other-bucket permissions.

## Lifecycle

| Prefix / tag | Transition / expire |
|---|---|
| `postgres/daily/` | expire after 14 days |
| `postgres/weekly/` | expire after 60 days |
| `postgres/monthly/` | expire after 365 days |

Object names: `postgres/{tier}/sendfable-YYYYMMDD-HHMMSS.sql.gz.age` — **no** emails, workspace names, or other PII.

## Estimated monthly cost (current ~12 KB dumps)

| Line | Estimate |
|---|---|
| Storage (≪ 1 GB) | ≪ $0.023 |
| PUT/GET (~30–60/mo) | ≪ $0.01 |
| **Total** | **Well under $1/mo** (expected ≪ $0.05) |

Safe to proceed under the approved cost gate.

## Bootstrap requirement

The live SES IAM user **cannot** create buckets or IAM users (`s3:ListAllMyBuckets` AccessDenied). Bootstrap needs a **one-time** AWS admin (or IAM-admin) credential, then that credential is discarded. The long-lived key is only `sendfable-backup`.

## Local backups

Remain primary at `/root/sendfable-backups/`. Off-host is the second copy.
