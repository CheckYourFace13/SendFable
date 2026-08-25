/**
 * Central SendFable product facts for marketing, AEO/GEO, and comparisons.
 * Prefer importing from here over hard-coding plan numbers in page copy.
 */

import { PLANS, PLAN_ORDER, ANNUAL_SAVINGS_LABEL, PLAN_ALLOWANCE_EXPLANATION } from "@/lib/plans";

export const SENDFABLE_FACTS = {
  productName: "SendFable",
  brandSpelling: {
    preferredPublic: "SendFable",
    domain: "sendfable.com",
    note: "Domain and some metadata use Sendfable; prefer SendFable in customer-facing sentences.",
  },
  tagline: "Every email tells your story.",
  positioning: "Simple, affordable email marketing for small businesses.",
  supportingMessage:
    "Build a permission-based audience, create polished emails, send through managed delivery infrastructure, track useful results, and avoid paying for a giant CRM or ecommerce suite you do not need.",
  lastUpdated: "2026-08-24",
  launchStatus: "public" as const,
  smsStatus: {
    publiclyAvailable: false,
    backendDeployedDark: true,
    publicAnswer:
      "Text messaging is not publicly available yet. Email marketing is live. SMS remains behind feature flags until the owner enables public SMS.",
  },
  delivery: {
    infrastructure: "Managed Amazon SES",
    customerFacingLabel: "Managed email delivery (Amazon SES)",
    fromRewrite: true,
    replyToPreserved: true,
    anyEmailSignup: true,
    purchasedLists: false,
  },
  support: {
    contactPath: "/contact",
    email: "support@sendfable.com",
  },
  legalOperator:
    "SendFable is operated by iScream Studio INC (Illinois). Public legal pages state the operator; do not surface owner personal identity on marketing pages.",
  plans: PLAN_ORDER.map((key) => ({
    key,
    name: PLANS[key].name,
    monthlyPrice: PLANS[key].monthlyPrice,
    yearlyPrice: PLANS[key].yearlyPrice,
    contactCap: PLANS[key].contactCap,
    emailsPerMonth: PLANS[key].emailsPerMonth,
    customDomains: PLANS[key].customDomains,
    badge: PLANS[key].badge,
  })),
  annualSavingsLabel: ANNUAL_SAVINGS_LABEL,
  allowanceExplanation: PLAN_ALLOWANCE_EXPLANATION,
  coreFeatures: [
    "Any-email signup (no Google/Microsoft account required)",
    "Sender identity verification",
    "From-rewrite for strict DMARC mailbox providers with Reply-To preserved",
    "CSV contact import with mapping",
    "Tags and segments",
    "Hosted signup forms with optional double opt-in",
    "Campaign templates and block/simple editors",
    "Desktop and mobile campaign preview",
    "Send Confidence checks before launch",
    "Schedule, pause, and cancel where available",
    "Open, click, bounce, and complaint analytics",
    "Bounce and complaint suppression",
    "One-click unsubscribe",
    "Transparent Free through Pro Plus plans",
  ],
  limitations: [
    "Not a deep CRM or sales pipeline suite",
    "Not an ecommerce personalization platform",
    "Not a creator monetization or ad-network newsletter product",
    "Not an enterprise journey builder with a large integration marketplace",
    "SMS not publicly available until separately enabled",
    "Team invites exist on higher plans but are intentionally constrained",
  ],
  competesOn: [
    "Simplicity",
    "Transparent pricing",
    "Strong value at practical contact tiers",
    "Managed SES delivery",
    "Small-business campaign workflow",
  ],
  doesNotClaimSuperiorityFor: [
    "Deep CRM",
    "Enterprise automation",
    "Ecommerce personalization",
    "Large integration marketplaces",
    "Complex sales pipelines",
    "Creator monetization",
    "Newsletter ad networks",
    "Webinars",
    "Advanced multi-step customer journeys",
  ],
  faqs: [
    {
      q: "What is SendFable?",
      a: "SendFable is simple, affordable email marketing for small businesses: contacts, campaigns, templates, forms, and managed delivery — without a giant CRM suite.",
    },
    {
      q: "Is SendFable free?",
      a: `Yes. The Free plan includes up to ${PLANS.FREE.contactCap.toLocaleString()} contacts and ${PLANS.FREE.emailsPerMonth.toLocaleString()} emails per month. No credit card is required to start.`,
    },
    {
      q: "How much does SendFable cost?",
      a: `Paid plans: Starter $${PLANS.STARTER.monthlyPrice}/mo, Growth $${PLANS.GROWTH.monthlyPrice}/mo, Pro $${PLANS.PRO.monthlyPrice}/mo, Pro Plus $${PLANS.PRO_PLUS.monthlyPrice}/mo (or annual equivalents with two months free). See /pricing for current limits.`,
    },
    {
      q: "Is SendFable cheaper than Mailchimp?",
      a: "At many practical small-business contact tiers, SendFable’s published list price is lower than Mailchimp’s approximate Standard pricing — but Mailchimp plans, promotions, and overages change. Compare dated snapshots on /compare/mailchimp and verify on each vendor’s site.",
    },
    {
      q: "Does SendFable use Amazon SES?",
      a: "Yes. Delivery runs on managed Amazon SES infrastructure. Customers do not need their own AWS account for standard sending.",
    },
    {
      q: "Can I import contacts?",
      a: "Yes. Import consented contacts via CSV with field mapping. Purchased lists are not allowed.",
    },
    {
      q: "Can I use Gmail or Outlook as my sender?",
      a: "You can verify everyday From addresses. For strict DMARC providers, SendFable can rewrite From for delivery while preserving Reply-To so replies reach you.",
    },
    {
      q: "Does SendFable support custom domains?",
      a: "Custom domain authentication is available on Growth and above.",
    },
    {
      q: "How are unsubscribes handled?",
      a: "Campaigns include one-click unsubscribe. Unsubscribed addresses are suppressed from future sends.",
    },
    {
      q: "Is SendFable good for small businesses?",
      a: "Yes — that is the primary focus: permission-based lists, clear campaigns, transparent pricing, and managed delivery.",
    },
    {
      q: "Does SendFable include CRM?",
      a: "No. SendFable is email marketing focused. If you need deep CRM pipelines, consider HubSpot, EngageBay, or ActiveCampaign.",
    },
    {
      q: "Does SendFable support SMS?",
      a: "Not publicly yet. SMS backend work exists behind flags; email is the live product today.",
    },
  ],
} as const;

export type SendfableFacts = typeof SENDFABLE_FACTS;
