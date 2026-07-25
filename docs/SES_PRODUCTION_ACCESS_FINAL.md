# SES production access request — final draft (HISTORICAL / DO NOT RE-SUBMIT)

## Status update — 2026-07-25 (correction)

Case **178491867800933** is classified operationally as:

**Submitted/open — awaiting AWS review.**

Do **not** open another production-access request. Do **not** paste follow-up
text into the case unless AWS explicitly rejects the request or asks for more
information.

- Correction note: `docs/SES_CASE_STATUS_CORRECTION_2026-07-25.md`
- Unsubmitted follow-up draft: `docs/SES_PRODUCTION_ACCESS_FOLLOWUP_DRAFT.md`

`GetAccount` may still return `Details.ReviewDetails.Status = DENIED` with this
CaseId. That API enum is **not** treated as a Support denial letter. Sandbox
(`ProductionAccessEnabled=false`) only means production access is not enabled yet.

Account remains in sandbox: 200 sends/24 h, 1 msg/sec; `SendingEnabled=true`,
`EnforcementStatus=HEALTHY`; `MailType=MARKETING`,
`WebsiteURL=https://sendfable.com`, language EN.

## ⚠️ Prior status note — 2026-07-24 (superseded)

Earlier drafts incorrectly stated the request was “submitted and DENIED” based
solely on the SES API `ReviewDetails.Status` field. That wording is superseded
by the 2026-07-25 correction above.

Prepared after controlled sandbox verification of `send.sendfable.com` in `us-east-1`.  
**Status of the draft below:** original request text (already submitted once via
the SES production-access flow). Do not re-submit. Prefer the follow-up draft
only if AWS asks.

## Proposed request (AWS SES console → Account → Request production access)

**Mail type:** Transactional and marketing (permission-based).

**Website URL:** https://sendfable.com

**Use case description (paste / adapt):**

Sendfable is an email-marketing platform for small businesses (https://sendfable.com). Customers send newsletters, announcements, promotions, and transactional account messages only to people who opted in.

Sending domain: `send.sendfable.com` (Easy DKIM verified). Custom MAIL FROM: `bounce.send.sendfable.com` (verified). Region: `us-east-1`.

Bounce and complaint handling: SES configuration set `sendfable-events` publishes DELIVERY, BOUNCE, and COMPLAINT to SNS → authenticated HTTPS webhook on Sendfable. Hard bounces and complaints are suppressed at workspace and global (platform) level. Campaigns auto-pause above a 5% bounce rate or 0.1% complaint rate.

Unsubscribe: every campaign includes an unsubscribe link; List-Unsubscribe / one-click (RFC 8058) supported. Physical mailing address required in footers. Purchased/rented/scraped lists prohibited (Acceptable Use + Terms).

Launch posture: public signup currently disabled (`ALLOW_PUBLIC_SIGNUP=false`); unrestricted campaign send disabled until after a controlled production-send test. Requested initial volume ~200–500/day at ~1 msg/s with gradual warm-up.

Contact: https://sendfable.com/contact — support@ / abuse@sendfable.com.

**Requested limits (honest / low):** ~200–500 messages/day initially; ~1 msg/s.

---

## Owner rules

- Do not re-submit this as a new production-access request
- Do not enable unrestricted public signup as part of production access
- Keep `CAMPAIGN_SEND_ENABLED=false` until controlled production-send test passes
