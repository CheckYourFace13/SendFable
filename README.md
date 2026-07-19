# Sendfable

Email marketing that costs half and lands better.

Sendfable is a Mailchimp-style SaaS platform: any-email signup, audience management, drag-and-drop campaigns, Amazon SES delivery, bounce/complaint handling, analytics, and Stripe billing.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind + shadcn/ui
- **Postgres** via Prisma
- **NextAuth v5** — email/password (bcrypt) + magic-link (any email; no Google/Microsoft OAuth required)
- **Amazon SES v2** for transactional + campaign mail
- **BullMQ + Redis** campaign send queue
- **Stripe** Checkout + Customer Portal + webhooks
- **Docker Compose** (app, worker, postgres, redis, Caddy) — also Vercel-compatible with `npm run worker`

## Quick start (local)

### 1. Prerequisites

- Node.js 20+
- Docker Desktop (recommended for Postgres + Redis)

### 2. Environment

```bash
cp .env.example .env
# Set NEXTAUTH_SECRET to a long random string:
#   openssl rand -base64 32
```

Leave `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` blank for **dev mail mode**: emails are logged to the console and written as `.eml` files under `/tmp/outbox` (or `%TEMP%\outbox` on Windows).

### 3. Infrastructure

```bash
docker compose up -d postgres redis
```

Or run the full stack (see [Deployment](#hostinger-vps-deployment-docker--caddy)).

### 4. App

```bash
npm install
npx prisma migrate deploy
npm run db:seed          # demo@sendfable.com / password123
npm run dev              # http://localhost:3000
```

In another terminal (required for queued sends when Redis is up):

```bash
npm run worker:dev
```

Without Redis, campaigns process **inline** in the API process (fine for local demos).

### Demo login

| Field    | Value               |
|----------|---------------------|
| Email    | `demo@sendfable.com` |
| Password | `password123`        |

Seed includes 200 contacts, tags, 2 templates, 1 completed campaign with stats, and 1 draft.

---

## Amazon SES setup

### Sandbox → production

1. Create an AWS account and open **Amazon SES** in your region (e.g. `us-east-1`).
2. New accounts start in the **sandbox** (can only send to verified addresses). Request **production access** in SES → Account dashboard → “Request production access.” Explain transactional + marketing use, consent practices, and bounce/complaint handling.
3. Create IAM user with SES send permissions (`ses:SendEmail`, `ses:CreateEmailIdentity`, `ses:GetEmailIdentity`, etc.). Put keys in `.env`.

### Platform domain (`send.sendfable.com`)

1. In SES → Verified identities → **Create identity** → Domain `send.sendfable.com` (or your `PLATFORM_SEND_DOMAIN`).
2. Publish the DNS records SES provides:
   - **DKIM** — three CNAMEs
   - **SPF** — e.g. `v=spf1 include:amazonses.com -all` on the sending subdomain
   - **DMARC** — e.g. `_dmarc.send.sendfable.com` TXT `v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com`
3. Wait until identity status is **Verified**.

### Configuration set + SNS (bounces / complaints / deliveries)

1. SES → **Configuration sets** → Create `sendfable-events` (match `SES_CONFIGURATION_SET`).
2. Add **Event destination** → Amazon SNS topic (create new), event types: **Bounce**, **Complaint**, **Delivery**.
3. SNS topic → **Create subscription**:
   - Protocol: **HTTPS**
   - Endpoint: `https://YOUR_DOMAIN/api/webhooks/ses`
4. Deploy the app so the endpoint is live. SNS sends a `SubscriptionConfirmation`; the handler auto-GETs `SubscribeURL`.
5. Confirm the subscription shows **Confirmed** in SNS.

Transactional and campaign sends use this configuration set (except test sends / some transactional paths that set `noConfigurationSet`).

### From-rewrite (Gmail / Yahoo / etc.)

Addresses on strict-DMARC providers (`gmail.com`, `yahoo.com`, `outlook.com`, …) are marked `rewriteRequired`. At send time:

- **From** = `localpart@PLATFORM_SEND_DOMAIN` (display name preserved)
- **Reply-To** = the user’s verified address

Custom domain authentication (Growth+) uses SES `CreateEmailIdentity` and a DKIM CNAME wizard in **Settings → Senders**.

---

## Stripe setup

```bash
# Set STRIPE_SECRET_KEY in .env, then:
npm run stripe:setup
```

Paste the printed `STRIPE_PRICE_*` values into `.env`.

Create a webhook endpoint in Stripe Dashboard:

- URL: `https://YOUR_DOMAIN/api/webhooks/stripe`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`
- Copy signing secret → `STRIPE_WEBHOOK_SECRET`

Plans: **Starter** $9/$90, **Growth** $19/$190, **Pro** $49/$490 (monthly/yearly).

---

## Running the worker

```bash
npm run worker        # production
npm run worker:dev    # watch mode
```

The worker:

- Consumes BullMQ queue `campaign-send`
- Polls for `SCHEDULED` campaigns every 30s
- Respects pause/cancel by checking campaign status before each recipient

On Vercel: run the web app on Vercel and the worker on a small always-on host (or Docker) with the same `DATABASE_URL` / `REDIS_URL` / AWS / `NEXTAUTH_SECRET`.

---

## Hostinger VPS deployment (Docker + Caddy)

1. Point DNS `A`/`AAAA` records for your domain to the VPS.
2. Clone the repo, copy `.env.example` → `.env`, fill secrets and AWS/Stripe.
3. Set `DOMAIN=your.domain.com`, `APP_URL=https://your.domain.com`, `NEXTAUTH_URL=https://your.domain.com`.
4. Launch:

```bash
docker compose up -d --build
```

Services: **caddy** (80/443, automatic HTTPS), **app**, **worker**, **postgres**, **redis**.

5. Seed (optional):

```bash
docker compose exec app npx tsx prisma/seed.ts
```

6. Wire SES SNS → `https://your.domain.com/api/webhooks/ses` and Stripe → `/api/webhooks/stripe`.

Uploads persist in the `uploads_data` volume; Caddy certificates in `caddy_data`.

---

## Deliverability launch checklist

- [ ] SES production access approved
- [ ] `PLATFORM_SEND_DOMAIN` verified with SPF + DKIM + DMARC
- [ ] Configuration set + SNS → `/api/webhooks/ses` confirmed
- [ ] Test bounce/complaint with SES mailbox simulator
- [ ] Physical mailing address set in workspace settings
- [ ] At least one verified sender identity
- [ ] List-Unsubscribe headers verified in a test send (`.eml` in outbox)
- [ ] Soft launch with ramp level 1 (500/day); only grow after clean campaigns
- [ ] Acceptable-use policy understood — no purchased lists
- [ ] Stripe webhooks live before enabling paid upgrades

---

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev server |
| `npm run build` / `start` | Production web |
| `npm run worker` / `worker:dev` | Campaign queue worker |
| `npm run db:seed` | Demo data |
| `npm run stripe:setup` | Create Stripe products/prices |
| `npm run prisma:migrate:dev` | Dev migrations |

---

## Project layout (high level)

```
src/
  app/(marketing)/     Public site
  app/(app)/           Authenticated product
  app/(auth)/          Login / signup
  app/api/             Auth-guarded + public webhooks/tracking
  components/          UI, email builder, marketing
  lib/                 SES, queue, compiler, plans, suppression…
  worker/              BullMQ entrypoint
prisma/                Schema + migrations + seed
scripts/stripe-setup.ts
```

## License

Proprietary — all rights reserved.
