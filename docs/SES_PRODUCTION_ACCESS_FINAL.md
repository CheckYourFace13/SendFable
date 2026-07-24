# SES production access request — final draft (DO NOT SUBMIT YET)

## ⚠️ Status update — 2026-07-24

A production-access request **was submitted and DENIED** by AWS
(`GetAccount` → `Details.ReviewDetails.Status = DENIED`, case
**178491867800933**). Account remains in sandbox: 200 sends/24 h,
1 msg/sec; `SendingEnabled=true`, `EnforcementStatus=HEALTHY`;
`MailType=MARKETING`, `WebsiteURL=https://sendfable.com`, language EN.

**Owner next steps (external blocker):**
1. Open the AWS Support case 178491867800933 (SES → Account dashboard, or
   Support Center) and reply/appeal rather than opening a new request.
2. Use the strengthened use-case description below. Since the denial, the
   following are now live and can be cited concretely: public Acceptable Use /
   Anti-Spam policy (`/acceptable-use`), working abuse-report channel
   (`/contact`), one-click unsubscribe, automated bounce/complaint suppression
   with SNS event coverage for BOUNCE/COMPLAINT/DELIVERY/REJECT/
   RENDERING_FAILURE/DELIVERY_DELAY, campaign auto-pause thresholds, gated
   public signup, and a modest 200–500/day initial volume ask.
3. AWS commonly denies first requests that look high-risk (marketing mail
   type + new domain). Emphasize permission-based lists, the closed early
   -access signup, and gradual warm-up.

Prepared after controlled sandbox verification of `send.sendfable.com` in `us-east-1`.  
**Status of the draft below:** submitted once (denied) — adapt for the appeal.

## Proposed request (AWS SES console → Account → Request production access)

**Mail type:** Transactional and marketing (permission-based).

**Website URL:** https://sendfable.com

**Use case description (paste / adapt):**

Sendfable is an email-marketing platform for small businesses (https://sendfable.com). Customers send newsletters, announcements, promotions, and transactional account messages only to people who opted in.

Sending domain: `send.sendfable.com` (Easy DKIM verified). Custom MAIL FROM: `bounce.send.sendfable.com` (verified). Region: `us-east-1`.

Bounce and complaint handling: SES configuration set `sendfable-events` publishes DELIVERY, BOUNCE, and COMPLAINT to SNS → authenticated HTTPS webhook on Sendfable. Hard bounces and complaints are suppressed at workspace and global (platform) level. Campaigns auto-pause above a 5% bounce rate or 0.1% complaint rate.

Unsubscribe: required campaign footer plus List-Unsubscribe / one-click (RFC 8058). A physical mailing address is required in the workspace before sending. Lists must be opt-in only; purchased, rented, and scraped lists are prohibited in our terms.

New accounts are ramped with sending limits. Public signup remains restricted during early launch while we warm carefully.

**How recipients opt in:** Hosted signup forms (optional double opt-in), CSV import of consented lists the customer owns, and manual adds by the account owner.

**Bounce/complaint process:** Automated via SNS → webhook; suppressions applied immediately; operators can review in-product.

**Expected volume (honest, initial):**

| Period | Daily sends | Send rate |
|---|---|---|
| First 1–2 weeks after production | **200–500 / day** | **1 message/sec** |
| After clean metrics | Grow gradually toward plan ceilings | Stay under complaint/bounce thresholds |

Do **not** claim tens of thousands/day at launch. Start low; warm with engaged recipients only.

**Compliance summary:** Opt-in only, mailing address required, unsubscribe + one-click, automated bounce/complaint suppression, auto-pause on bad rates, early-launch public signup still gated.

## Recommended initial quota ask

- **Max send rate:** 1–14 messages/second (match current sandbox comfort; request modest uplift only if needed)
- **Max 24-hour send:** **1,000** for the first production week (or keep near 500 if AWS asks for conservatism)
- Revisit after 7–14 days of healthy bounce (<2%) and complaint (<0.08%) metrics

## Checklist before submitting

- [ ] Controlled sandbox test to a verified recipient succeeded
- [ ] SNS DELIVERY observed on webhook
- [ ] DKIM + MAIL FROM still SUCCESS
- [ ] Early launch / public signup still intentionally restricted
- [ ] Owner reviews this draft and edits volume language if business reality differs

## Explicitly out of scope for this draft

- Do not submit this request automatically
- Do not enable unrestricted public signup as part of production access
- Do not promise inbox placement or “guaranteed deliverability”
