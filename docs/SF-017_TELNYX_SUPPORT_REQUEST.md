# SF-017 — Telnyx support request (paste-ready)

**Do not auto-send.** No connected Telnyx support tool is configured in this environment. Owner pastes into Telnyx Mission Control support / account manager / `support@telnyx.com`.

---

## Subject

SendFable multi-tenant SaaS ISV 10DLC architecture confirmation (no numbers yet)

## Body

Hello Telnyx team,

We operate **SendFable** (sendfable.com), a multi-tenant email + SMS SaaS platform. Our customers are **separate businesses**. Each customer will send **permission-based marketing and conversational SMS** to **its own** opted-in contacts. SendFable manages consent, STOP/HELP, suppressions, billing, and inbox replies. We plan **dedicated phone numbers per customer** and API-driven onboarding at scale.

We are **not** asking you to purchase numbers, submit brands/campaigns, or enable production traffic in this ticket. We need architecture confirmation before any paid registration.

Please confirm:

1. **Account classification** — Should we be treated as an ISV / reseller / SaaS platform / downstream CSP?
2. **Upstream / downstream CSP structure** — Can Telnyx act as our **upstream CSP** for brand + campaign registration with campaigns then used for Telnyx messaging? Or must we register with an external CSP and **share** campaigns to Telnyx as downstream CNP?
3. **Native vs partner campaign APIs** — For isolated multi-tenant SaaS (one brand + one or more campaigns + dedicated number(s) **per customer**), which Telnyx API path is required?
4. **Brand / campaign requirements** — Confirm each end-customer business needs its own brand and at least one campaign (we will **not** put unrelated customer marketing under a single platform brand unless you explicitly require/permit that).
5. **Dedicated numbers** — Confirm a long code may only be assigned to one campaign at a time and must not be shared across unrelated brands.
6. **Account approval** — What verification tier and ISV/partner enablement steps are required before we can register customer brands via API?
7. **Business verification** — Any extra documents beyond Level 2 for ISV messaging?
8. **Pricing / fees** — Current pass-through brand, vetting, campaign review, monthly campaign MRC, number rental, and carrier surcharges we should budget (we understand registry fees are typically pass-through).
9. **API access** — Confirm brand, campaign, partner_campaign, and phone_number_campaign endpoints available on a standard Level 2 account after ISV enablement.
10. **Timeline** — Expected time for CSP ID association / partner acceptance / first customer brand approval.

Platform operator legal entity will be provided separately for account verification (iScream Studio / SendFable operator). Production SMS flags remain off until a later controlled test.

Thank you,
[Owner name]
[Owner email]
SendFable / iScream Studio INC
