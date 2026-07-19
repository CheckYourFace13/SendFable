# External setup required

Nothing below was purchased, submitted, or changed in a live vendor account by this verification pass.

## Required for real email (Amazon SES)

1. AWS account with MFA on root.
2. IAM user/role + access keys in server env only (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`).
3. Verify `PLATFORM_SEND_DOMAIN` (e.g. `send.sendfable.com`) — DKIM CNAMEs.
4. SES configuration set + SNS → `https://YOUR_DOMAIN/api/webhooks/ses`.
5. Sandbox testing, then production access request (see `SES_PRODUCTION_ACCESS_REQUEST.md`).
6. Follow `SES_SETUP_CHECKLIST.md`, `SES_DNS_RECORDS.md`, `SES_SNS_SETUP.md`, `DELIVERABILITY_OPERATIONS.md`.

Local/dev: leave AWS keys **blank** → console + `.eml` outbox.

## Required for billing (Stripe)

1. Stripe account + `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
2. Price IDs via `npm run stripe:setup` (or Dashboard) into `.env`.
3. Webhook endpoint: `/api/webhooks/stripe`.

## Required for production hosting

1. Postgres + Redis (Docker Compose in repo, or managed equivalents).
2. Public HTTPS domain (`APP_URL`, `NEXTAUTH_URL`).
3. `NEXTAUTH_SECRET` (long random).
4. Docker engine (Compose + Caddy) **or** equivalent process supervisor for `app` + `worker`.
5. Outbound DNS for customer custom domains (Growth+).

### Local vs production sending

| Mode | When | Behavior |
|------|------|----------|
| Local outbox | AWS keys blank | Console + `.eml` files only — no real email |
| Inline queue | `REDIS_URL` unset (dev) | Campaign jobs run in the web process; **not** production-ready |
| Production | Redis + `npm run worker` + SES credentials | Dedicated worker drains BullMQ; real SES delivery |

The app shows a development banner when Redis is missing. Do not treat inline processing as a production configuration.

## Local vs production sending

| Mode | When | Behavior |
|------|------|----------|
| Local outbox | AWS keys blank | Console + `.eml` files only — no real email |
| Inline queue | `REDIS_URL` unset (dev) | Campaign jobs run in the web process; **not** production-ready |
| Production | Redis + `npm run worker` + SES credentials | Dedicated worker drains BullMQ; real SES delivery |

The app shows a development banner when Redis is missing. Do not treat inline processing as a production configuration.

## Optional

- S3 for uploads (`S3_BUCKET` …) — otherwise local `/uploads`.
- Redis for BullMQ — without it, campaign jobs run inline in the web process.

## Demo credentials (seed only)

- Email: `demo@sendfable.com`
- Password: `password123`

Rotate or disable before any public deployment.
