# Off-host encrypted backups — options and recommendation

Prepared: 2026-07-24  
**Status:** Options report. No paid provider was purchased. No off-host upload is live yet.

## Current local backups (already working)

- Path: `/root/sendfable-backups/{daily,weekly,monthly}`
- Schedule: daily 03:15
- Integrity: gzip test + sha256 sidecar
- Retention: 14 / 60 / 365 days
- Alerts: SES ops alerts on failure / stale backup
- Limitation: same host as the database (single failure domain)

## Existing AWS / S3 configuration

| Item | Finding |
|---|---|
| `S3_BUCKET` env | Present but **empty / unused** (uploads still local `/uploads`) |
| `@aws-sdk/client-s3` in app | **Not installed** |
| AWS CLI on VPS | **Not installed** |
| Existing AWS keys | Present for SES (`AWS_ACCESS_KEY_ID` / secret / `us-east-1`) as IAM user `sendfable-ses-production` |
| IAM S3 capability | **Confirmed AccessDenied** for `s3:ListAllMyBuckets`. Do **not** widen this SES key. Create a separate `sendfable-backup` IAM user + private bucket if choosing Option A. |

## Options (do not purchase without owner choice)

### Option A — Dedicated S3 bucket in the existing SendFable AWS account (recommended if IAM allows)

**What:** Create `sendfable-db-backups` (private, block public access) in `us-east-1`, with:

- SSE-S3 or SSE-KMS encryption at rest
- TLS-only bucket policy
- Lifecycle: transition/expire matching 14d daily / 60d weekly / 365d monthly (or simpler: expire after 400 days)
- Dedicated IAM user or policy scoped to `sendfable-db-backups/*` only (not SES, not other buckets)
- Client-side encryption with `age` or `gpg` **before** upload (so AWS cannot read plaintext dumps even with bucket access)
- Daily cron: after local backup succeeds → encrypt → `aws s3 cp` / SDK PutObject → verify ETag/checksum → alert on failure

**Estimated cost (us-east-1 Standard, approximate public list prices):**

| Line | Estimate |
|---|---|
| Storage | ~$0.023 / GB-month |
| Current dump size | ~0.012 GB compressed (~12 KB raw observed; will grow) |
| PUT/LIST requests | pennies at daily cadence |
| **Month 1 at current size** | **≪ $0.01** |
| At 1 GB retained | ~$0.023 / month |
| At 10 GB retained | ~$0.23 / month |

No new vendor account. Uses AWS you already have. Requires:

1. Confirm IAM can create bucket / PutObject (or create a dedicated backup IAM user in console)
2. Owner approval to create the bucket and attach a least-privilege policy
3. Generate an `age` keypair stored only on the VPS (`/root/sendfable-backups/age.key`, mode 600) — private key never uploaded

### Option B — Cloudflare R2

- Zero egress fees; storage ~$0.015 / GB-month
- Requires a Cloudflare account + R2 bucket + API token
- Same encrypt-then-upload pattern via `rclone` or S3-compatible API
- **Do not create** without owner Cloudflare approval

### Option C — Backblaze B2

- Storage ~$0.006 / GB-month
- Requires Backblaze account + application key
- Same pattern via `rclone`
- **Do not create** without owner approval

### Option D — Second VPS / offsite SSH host

- `scp`/`rsync` of age-encrypted dumps to another machine you control
- Cost = whatever that host already costs
- Only viable if you already have a second trusted host (not RentalNoodle/GravyBlock app directories)

## Recommendation

1. Prefer **Option A** if the SendFable AWS account can host a private backup bucket with a scoped IAM policy.
2. If SES IAM user is too narrow to create S3 resources, create a **separate** IAM user `sendfable-backup` in the AWS console (owner action) with PutObject/GetObject/ListBucket only on that bucket — do not widen the SES key.
3. Always encrypt with `age` on the VPS before upload (encryption at rest in S3 + client-side encryption).
4. Keep local backups as the primary restore path; off-host is disaster recovery.

## Implementation plan after owner picks an option

1. Provision destination (bucket or R2/B2).
2. Install `age` on VPS; generate keypair; store public key in repo docs, private key only on VPS.
3. Extend `deploy/sendfable-backup.sh` to:
   - encrypt latest `.sql.gz` → `.sql.gz.age`
   - upload to `s3://…/daily/sendfable-YYYYMMDD-HHMMSS.sql.gz.age`
   - verify remote size / checksum marker
   - alert via `ops-alert.js` on failure
4. Run isolated restore drill:
   - download off-host object
   - `age -d` → gunzip → restore into `sendfable_restore_drill`
   - compare counts → drop drill DB
5. Document last off-host backup + last off-host restore in `docs/BACKUPS.md`

## Blocker until owner replies

Please choose:

- **A)** Create dedicated S3 backup bucket in SendFable AWS account (I will implement after you confirm IAM approach), or  
- **B)** Cloudflare R2, or  
- **C)** Backblaze B2, or  
- **D)** You will provide another SSH host, or  
- **Defer** off-host copies and accept single-host risk for now

I will not create paid storage or new AWS resources until you pick one.
