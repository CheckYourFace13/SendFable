# Authentication & account recovery policy

Decided 2026-07-24 (Phase 4 of the production-readiness pass).

## Decision

Sendfable is a **hybrid**: accounts are created with a password, and sign-in
supports both password and **magic link** (email). There is intentionally
**no forgot-password / reset-password flow** — the magic-link tab *is* the
recovery path. This matches the shipped UI and avoids maintaining a second,
redundant token flow.

The login page states this explicitly: "Forgot your password? Use the Magic
link tab — we'll email you a secure sign-in link instead."

## How recovery works

1. User opens `/login` → "Magic link" tab → enters their account email.
2. NextAuth email provider sends a single-use sign-in link (24 h expiry) via SES.
3. Clicking the link signs the user in; post-auth redirects are validated by
   `safeCallbackPath` (open-redirect safe).

Properties (NextAuth v5 email provider + Prisma adapter):
- Tokens are single-use (consumed on verification) and expire after 24 h.
- Reused/expired/malformed tokens land on `/login` with an error, never a session.
- Responses do not reveal whether an email has an account (no enumeration).
- Rate limits protect the sign-in endpoints.

## When the mailbox itself is inaccessible

If a user loses access to their sign-in mailbox, support-assisted recovery
applies (via `/contact`, topic "General question"):

1. Verify identity: request the workspace name, plan, approximate signup date,
   and — if a paid account — the last 4 digits + expiry month of the card on
   file (verified against Stripe, never stored by us).
2. If verification passes, the operator updates the account email in the
   database to a mailbox the user controls, then the user signs in by magic link.
3. Log the change (who, when, old/new address) in the support thread.
4. Never change an account email based on an unverified inbound request.

## Deferred (post-launch)

- Password change UI in Settings (users who signed up with a password keep it;
  magic link always works).
- Optional 2FA.

## Operational notes

- Transactional auth email is branded and sent from `send.sendfable.com`
  (DKIM-signed). While SES is in sandbox, magic links deliver **only to
  SES-verified addresses** — this is the current external constraint on
  onboarding new users and is tracked as the AWS launch blocker.
