# SF-017 — Telnyx owner setup (no purchase / no registration)

**Goal:** Create a verified Telnyx account and store least-privilege credentials on the VPS.  
**Do not:** buy numbers, fund beyond minimum identity verification requirements if avoidable, submit brands/campaigns, or send SMS.

Never paste API keys into Cursor chat, Git, or tickets.

---

## Exact steps

1. **Create account** at [https://telnyx.com/sign-up](https://telnyx.com/sign-up) using an owner-controlled SendFable / iScream Studio email (not a shared personal inbox).
2. **Enable MFA** immediately in Mission Control.
3. **Complete identity verification** to reach **Level 2 verified** (required for ISV 10DLC per Telnyx ISV docs).
4. Enter the **exact legal entity** for the platform operator (iScream Studio INC / SendFable operator entity as applicable) — legal name must match official records.
5. **Request ISV / SaaS messaging access** — paste `docs/SF-017_TELNYX_SUPPORT_REQUEST.md` into Telnyx support / account manager. Ask whether Telnyx can be upstream CSP for partner campaigns.
6. **Create a least-privilege API key** (Mission Control → API Keys). Label it `sendfable-prod-sms`. Prefer scoped keys if Telnyx UI offers messaging-only scopes.
7. **Copy the account public key** (Mission Control → Keys & Credentials → Public Key) for webhook Ed25519 verification → `TELNYX_PUBLIC_KEY`.
8. Optionally create a messaging profile later (do **not** buy numbers yet). Note IDs only when created:
   - `TELNYX_MESSAGING_PROFILE_ID`
   - `TELNYX_CONNECTION_ID` (if used)
9. Generate a local AES key for EIN encryption (32 random bytes, base64):
   ```bash
   openssl rand -base64 32
   ```
   Store as `SMS_SENSITIVE_DATA_KEY` on the VPS only.
10. **Store on VPS** — never commit:

```bash
ssh root@YOUR_VPS
cd /opt/sendfable
cp -a .env "/root/sendfable-backups/sendfable-env-$(date -u +%Y%m%d-%H%M%S).bak"
# Append using an editor on the server (do not echo secrets into shell history if avoidable):
nano .env
```

Add (values filled on server only):

```
TELNYX_API_KEY=...
TELNYX_PUBLIC_KEY=...
# Optional controlled-test HMAC only — production uses Ed25519 public key:
# TELNYX_WEBHOOK_SECRET=...
TELNYX_MESSAGING_PROFILE_ID=
TELNYX_CONNECTION_ID=
SMS_SENSITIVE_DATA_KEY=...
```

Keep **all** `SENDFABLE_SMS_*` customer/live flags `false`.

11. Restart app/worker to load env **only after** keys are stored and flags confirmed false:

```bash
docker compose -p sendfable -f docker-compose.prod.yml up -d --force-recreate app worker
```

12. **Read-only sanity** (no purchases): from Mission Control, confirm balance, zero phone numbers (unless pre-existing), zero 10DLC brands/campaigns for customers.

---

## Webhook URL (configure later, still dark)

`https://sendfable.com/api/webhooks/telnyx`

While `SENDFABLE_SMS_INBOUND_ENABLED=false`, the route returns **404** and does not process events. Configure the URL only when inbound testing is authorized.

---

## Checklist before any paid action

- [ ] MFA on
- [ ] Level 2 verified
- [ ] ISV/support reply received
- [ ] Keys on VPS only
- [ ] All SMS public/billing/sending flags false
- [ ] Explicit owner approval for Option D owner-only registration
