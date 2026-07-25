# Legal & policy status (INTERNAL)

Updated 2026-07-25.

## Honesty statement (required)

These documents were **technically audited and tailored to the current SendFable
product**. They were **not reviewed or approved by qualified legal counsel**.
Professional review remains **recommended before broad public launch**. No
public or internal statement should imply attorney approval. Completing this
audit does **not** mean public launch is ready.

## Legal operator

| Question | Finding |
|---|---|
| Stripe KYC / legal entity | `iScream Studio INC` (documented from live Stripe account audit) |
| Public product name | SendFable |
| Registered DBA / assumed name for “SendFable”? | **Not verified** in project or Stripe records |
| Wording used in legal docs | **Treatment B:** “SendFable is a service operated by iScream Studio INC” |
| Where entity appears | Terms, Privacy, AUP, Refund, Security — legal contexts only |
| Marketing / ordinary product branding | Remains SendFable only (no iScream Studio INC in nav/promos) |

**Owner decision still required:** confirm whether a state DBA/assumed-name
registration for “SendFable” exists or will be filed. Until then, do **not**
use “d/b/a SendFable.”

**Owner decision still required:** governing-law / venue **state** for
iScream Studio INC. Terms intentionally flag this and do **not** invent a state.
No mandatory arbitration or class-action waiver was added.

## Public documents (live)

| Document | Route | Version |
|---|---|---|
| Terms of Service | `/terms` | 2026-07-25 |
| Privacy Policy | `/privacy` | 2026-07-25 |
| Acceptable Use & Anti-Spam | `/acceptable-use` | 2026-07-25 |
| Billing, Renewal, Cancellation & Refund | `/refund-policy` | 2026-07-25 |
| Security & responsible disclosure | `/security` | 2026-07-25 |
| Cookie disclosure | `/cookies` | 2026-07-25 |
| Contact & legal notice mailboxes | `/contact` | — |

Historical pre-rewrite page sources: `docs/legal/archive/2026-07-24-*.tsx.bak`.

Policy bundle constant: `CURRENT_POLICY_BUNDLE = 2026-07-25` in
`src/lib/legal-policies.ts`.

## Policy acceptance

- Signup requires an affirmative checkbox; API rejects without `acceptedPolicies: true`.
- Acceptance rows stored in `PolicyAcceptance` (user, workspace, policy versions,
  timestamp, source, optional IP / user-agent).
- Existing accounts (including owner) are **not hard-blocked** for missing
  historical records; soft in-app reacceptance banner records the current bundle.
- Stripe Checkout collects Terms acceptance + conspicuous auto-renewal custom text
  when Checkout sessions are created.

## Pricing / billing consistency

Verified from `src/lib/plans.ts` and Stripe setup script:

| Plan | Monthly | Annual | Contacts | Emails/mo | Seats |
|---|---|---|---|---|---|
| Free | $0 | — | 500 | 2,000 | 1 |
| Starter | $9 | $90 | 2,500 | 15,000 | 1 |
| Growth | $19 | $190 | 10,000 | 60,000 | 1 |
| Pro | $49 | $490 | 30,000 | 200,000 | 10 |

Portal: cancel at period end; subscription updates create prorations
(`scripts/stripe-setup.ts`).

**Owner confirmation recommended:** 14-day first-charge refund and 7-day unwanted
renewal courtesy refund language (business practice; counsel should review
enforceability). Annual plans: no default unused-month proration on refund.

## Email-compliance alignment

Policies match implemented controls: mailing address gate, unsubscribe +
List-Unsubscribe / one-click, suppression, bounce/complaint auto-pause (~5% /
~0.1%), ramps, quotas, holds. Campaign send remains gated by
`CAMPAIGN_SEND_ENABLED=false` during early launch; SES production access still
pending AWS review.

## Cookies / analytics

First-party session, CSRF, and `sf_workspace` only. No third-party advertising
or product-analytics cookies enabled as of this version.

## Open owner items

1. Confirm DBA/assumed-name status for “SendFable” (or keep Treatment B).
2. Confirm governing-law state for iScream Studio INC.
3. Confirm refund windows / annual refund posture with counsel.
4. Confirm whether Stripe invoice/KYC legal name visibility of “iScream Studio INC”
   is acceptable for customers.
5. Qualified attorney review before removing early-access posture / broad launch.
6. SES production access still submitted/open — awaiting AWS.
7. Launch flags remain locked (see readiness docs).
