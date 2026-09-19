/**
 * Master pricing comparison matrix — derived from competitor catalog + SendFable plans.
 * Exact competitor dollar amounts only where verified from official sources.
 * Prefer "From $X", "Varies", or approximate notes over invented precision.
 */

import { PLANS } from "@/lib/plans";
import { COMPETITORS, getCompetitor } from "./catalog";
import { COMPARISON_DISCLAIMER } from "./types";

export const PRICING_MATRIX_VERIFIED = "2026-09-19";

export const TRADEMARK_DISCLAIMER =
  "Mailchimp and other product names are trademarks of their respective owners. SendFable is not affiliated with them.";

export type PricingConfidence = "exact" | "approximate" | "varies";

export type PricingMatrixRow = {
  id: string;
  name: string;
  compareHref: string | null;
  freePlan: string;
  freeContacts: string;
  freeSends: string;
  entryPaid: string;
  includedContacts: string;
  includedSends: string;
  sms: string;
  automations: string;
  brandRemoval: string;
  pricingModel: string;
  bestFor: string;
  lastVerified: string;
  pricingUrl: string;
  confidence: PricingConfidence;
  /** Optional numeric monthly estimate for calculator scenarios (null = do not claim savings) */
  estimateAtContacts?: Partial<Record<number, number | null>>;
};

/** SendFable is always exact from PLANS. */
export function sendfableMatrixRow(): PricingMatrixRow {
  return {
    id: "sendfable",
    name: "SendFable",
    compareHref: "/pricing",
    freePlan: "Yes",
    freeContacts: String(PLANS.FREE.contactCap),
    freeSends: `${PLANS.FREE.emailsPerMonth.toLocaleString()}/mo`,
    entryPaid: `$${PLANS.STARTER.monthlyPrice}/mo`,
    includedContacts: String(PLANS.STARTER.contactCap.toLocaleString()),
    includedSends: `${PLANS.STARTER.emailsPerMonth.toLocaleString()}/mo`,
    sms: "Not publicly available yet",
    automations: "Campaigns, tags, segments, forms",
    brandRemoval: "Paid plans",
    pricingModel: "Published contact + monthly email caps",
    bestFor: "Small businesses that want simple campaigns",
    lastVerified: PRICING_MATRIX_VERIFIED,
    pricingUrl: "https://sendfable.com/pricing",
    confidence: "exact",
    estimateAtContacts: {
      250: 0,
      500: 0,
      1_000: PLANS.STARTER.monthlyPrice,
      2_500: PLANS.STARTER.monthlyPrice,
      5_000: PLANS.GROWTH.monthlyPrice,
      10_000: PLANS.GROWTH.monthlyPrice,
      20_000: PLANS.PRO.monthlyPrice,
      40_000: PLANS.PRO_PLUS.monthlyPrice,
    },
  };
}

/**
 * Competitor matrix rows. Dollar figures marked approximate unless confidence=exact.
 * Sources: official pricing pages checked 2026-09-19 where fetchable.
 */
export const COMPETITOR_MATRIX: PricingMatrixRow[] = [
  {
    id: "mailchimp",
    name: "Mailchimp",
    compareHref: "/compare/mailchimp",
    freePlan: "Yes",
    freeContacts: "250",
    freeSends: "500/mo (or 250/day)",
    entryPaid: "Essentials from $13/mo · Standard from $20/mo",
    includedContacts: "From ~500 (paid entry)",
    includedSends: "10×–15× contacts by plan",
    sms: "Paid add-on (select markets)",
    automations: "Strong (plan-gated)",
    brandRemoval: "Paid plans",
    pricingModel: "Contact-tier + send multiples; overages apply",
    bestFor: "Teams wanting a broad marketing suite",
    lastVerified: PRICING_MATRIX_VERIFIED,
    pricingUrl: "https://mailchimp.com/pricing/",
    confidence: "approximate",
    // Standard-tier estimates commonly published; verify on Mailchimp calculator
    estimateAtContacts: {
      250: 0,
      500: 20,
      1_000: 30,
      2_500: 60,
      5_000: 100,
      10_000: 135,
      20_000: 210,
      40_000: 350,
    },
  },
  {
    id: "constant-contact",
    name: "Constant Contact",
    compareHref: "/compare/constant-contact",
    freePlan: "No permanent free plan",
    freeContacts: "—",
    freeSends: "—",
    entryPaid: "Lite from ~$12/mo",
    includedContacts: "Varies by plan",
    includedSends: "Varies — verify",
    sms: "Add-on / suite options",
    automations: "Strong for local SMB",
    brandRemoval: "Paid",
    pricingModel: "List-size plans; annual discounts common",
    bestFor: "Local businesses wanting guided support",
    lastVerified: PRICING_MATRIX_VERIFIED,
    pricingUrl: "https://www.constantcontact.com/pricing",
    confidence: "approximate",
    estimateAtContacts: {
      500: 12,
      1_000: 35,
      2_500: 45,
      5_000: null,
      10_000: 80,
    },
  },
  {
    id: "brevo",
    name: "Brevo",
    compareHref: "/compare/brevo",
    freePlan: "Yes",
    freeContacts: "Large storage",
    freeSends: "300 emails/day",
    entryPaid: "Starter from ~$9/mo",
    includedContacts: "Contact storage generous; billed on sends",
    includedSends: "From ~5,000 emails/mo (Starter)",
    sms: "Credits / multichannel",
    automations: "Strong on paid",
    brandRemoval: "Paid",
    pricingModel: "Email volume oriented",
    bestFor: "Multichannel email + transactional needs",
    lastVerified: PRICING_MATRIX_VERIFIED,
    pricingUrl: "https://www.brevo.com/pricing/",
    confidence: "approximate",
    estimateAtContacts: {
      500: 9,
      1_000: 9,
      2_500: 18,
      5_000: 18,
      10_000: null,
    },
  },
  {
    id: "mailerlite",
    name: "MailerLite",
    compareHref: "/compare/mailerlite",
    freePlan: "Yes",
    freeContacts: "~250",
    freeSends: "~2,500/mo",
    entryPaid: "Growing Business from ~$12/mo",
    includedContacts: "Scales by subscribers",
    includedSends: "Plan-dependent",
    sms: "Limited / varies",
    automations: "Strong builder",
    brandRemoval: "Paid",
    pricingModel: "Subscriber-based",
    bestFor: "Design-forward SMB newsletters",
    lastVerified: PRICING_MATRIX_VERIFIED,
    pricingUrl: "https://www.mailerlite.com/pricing",
    confidence: "approximate",
    estimateAtContacts: {
      250: 0,
      500: 12,
      1_000: 12,
      2_500: 25,
      5_000: null,
      10_000: null,
    },
  },
  {
    id: "klaviyo",
    name: "Klaviyo",
    compareHref: "/compare/klaviyo",
    freePlan: "Yes",
    freeContacts: "~250 active profiles",
    freeSends: "~500 emails/mo",
    entryPaid: "Varies by profiles + usage",
    includedContacts: "Active profiles",
    includedSends: "Plan / usage based",
    sms: "Strong ecommerce SMS",
    automations: "Suite (ecommerce CDP)",
    brandRemoval: "Paid",
    pricingModel: "Active profiles + channel usage",
    bestFor: "Ecommerce stores needing deep personalization",
    lastVerified: PRICING_MATRIX_VERIFIED,
    pricingUrl: "https://www.klaviyo.com/pricing",
    confidence: "varies",
    estimateAtContacts: {},
  },
  {
    id: "omnisend",
    name: "Omnisend",
    compareHref: "/compare/omnisend",
    freePlan: "Yes",
    freeContacts: "~250",
    freeSends: "~500/mo",
    entryPaid: "Standard from ~$16/mo (promos vary)",
    includedContacts: "Contact tiers",
    includedSends: "Plan-dependent",
    sms: "Ecommerce SMS focus",
    automations: "Strong ecommerce",
    brandRemoval: "Paid",
    pricingModel: "Contact tiers; watch promos",
    bestFor: "Online stores",
    lastVerified: PRICING_MATRIX_VERIFIED,
    pricingUrl: "https://www.omnisend.com/pricing/",
    confidence: "approximate",
    estimateAtContacts: {
      250: 0,
      500: 16,
      1_000: 16,
      2_500: null,
      5_000: null,
      10_000: null,
    },
  },
  {
    id: "getresponse",
    name: "GetResponse",
    compareHref: "/compare/getresponse",
    freePlan: "Limited / trial style — verify",
    freeContacts: "—",
    freeSends: "—",
    entryPaid: "Starter from ~$19/mo",
    includedContacts: "~1,000 at entry",
    includedSends: "Often unlimited on paid",
    sms: "Available on higher plans",
    automations: "Strong",
    brandRemoval: "Paid",
    pricingModel: "Subscriber tiers",
    bestFor: "All-in-one marketing automation",
    lastVerified: PRICING_MATRIX_VERIFIED,
    pricingUrl: "https://www.getresponse.com/pricing",
    confidence: "approximate",
    estimateAtContacts: {
      1_000: 19,
      2_500: null,
      5_000: null,
      10_000: null,
    },
  },
  {
    id: "kit",
    name: "Kit",
    compareHref: "/compare/kit",
    freePlan: "Yes (creator)",
    freeContacts: "Up to ~10,000 subscribers",
    freeSends: "Creator free limits — verify",
    entryPaid: "Creator from ~$33/mo at ~1,000 (verify)",
    includedContacts: "Subscriber tiers",
    includedSends: "Creator plans",
    sms: "Not a focus",
    automations: "Creator sequences",
    brandRemoval: "Paid",
    pricingModel: "Subscriber + creator monetization",
    bestFor: "Creators and newsletter businesses",
    lastVerified: PRICING_MATRIX_VERIFIED,
    pricingUrl: "https://kit.com/pricing",
    confidence: "approximate",
    estimateAtContacts: {
      1_000: 33,
      2_500: null,
      5_000: null,
      10_000: 0,
    },
  },
  {
    id: "sender",
    name: "Sender",
    compareHref: "/compare/sender",
    freePlan: "Yes",
    freeContacts: "2,500",
    freeSends: "15,000/mo",
    entryPaid: "Promotional Standard from ~$6.30/mo (first-year promo)",
    includedContacts: "Scales by subscribers",
    includedSends: "12×–24× subscribers on paid",
    sms: "Included credits on paid",
    automations: "Strong",
    brandRemoval: "Paid",
    pricingModel: "Subscriber + promo pricing common",
    bestFor: "High free allowance seekers",
    lastVerified: PRICING_MATRIX_VERIFIED,
    pricingUrl: "https://www.sender.net/pricing/",
    confidence: "approximate",
    // Free covers 2500; paid promo is not regular list — do not claim SF savings vs promo
    estimateAtContacts: {
      250: 0,
      500: 0,
      1_000: 0,
      2_500: 0,
      5_000: null,
      10_000: null,
    },
  },
  {
    id: "flodesk",
    name: "Flodesk",
    compareHref: "/compare/flodesk",
    freePlan: "No",
    freeContacts: "—",
    freeSends: "Unlimited sends on paid",
    entryPaid: "~$25/mo or ~$19/mo annual-equivalent",
    includedContacts: "Up to ~1,000 at entry",
    includedSends: "Unlimited",
    sms: "Not a focus",
    automations: "Design-led workflows",
    brandRemoval: "Included",
    pricingModel: "Flat design-focused pricing",
    bestFor: "Brand-forward visual email",
    lastVerified: PRICING_MATRIX_VERIFIED,
    pricingUrl: "https://flodesk.com/pricing",
    confidence: "approximate",
    estimateAtContacts: {
      500: 25,
      1_000: 25,
      2_500: null,
      5_000: null,
    },
  },
  {
    id: "hubspot",
    name: "HubSpot Marketing Hub",
    compareHref: "/compare/hubspot",
    freePlan: "CRM free; Marketing Hub paid",
    freeContacts: "Limited marketing tools",
    freeSends: "Varies",
    entryPaid: "Starter from ~$20/mo (list pricing)",
    includedContacts: "~1,000 marketing contacts (Starter)",
    includedSends: "Plan-gated",
    sms: "Suite options",
    automations: "Full CRM suite",
    brandRemoval: "Paid",
    pricingModel: "Marketing contacts + hubs; onboarding at upper tiers",
    bestFor: "Teams needing CRM + sales + service",
    lastVerified: PRICING_MATRIX_VERIFIED,
    pricingUrl: "https://www.hubspot.com/pricing/marketing",
    confidence: "approximate",
    estimateAtContacts: {
      1_000: 20,
      2_500: null,
      5_000: null,
      10_000: null,
    },
  },
  {
    id: "activecampaign",
    name: "ActiveCampaign",
    compareHref: "/compare/activecampaign",
    freePlan: "No lasting free plan",
    freeContacts: "—",
    freeSends: "—",
    entryPaid: "Varies by contacts — check calculator",
    includedContacts: "Contact tiers",
    includedSends: "Typically unlimited email on paid",
    sms: "Available",
    automations: "Very strong",
    brandRemoval: "Paid",
    pricingModel: "Contact-based CRM automation",
    bestFor: "Automation-heavy CRM marketers",
    lastVerified: PRICING_MATRIX_VERIFIED,
    pricingUrl: "https://www.activecampaign.com/pricing",
    confidence: "varies",
    estimateAtContacts: {},
  },
  {
    id: "aweber",
    name: "AWeber",
    compareHref: "/compare/aweber",
    freePlan: "Trial / limited — verify",
    freeContacts: "—",
    freeSends: "—",
    entryPaid: "Lite ~$12.49/mo annual-equivalent",
    includedContacts: "≤500 at Lite entry",
    includedSends: "Plan-dependent",
    sms: "Limited",
    automations: "Solid classic ESP",
    brandRemoval: "Paid",
    pricingModel: "List size; annual discounts",
    bestFor: "Classic list-based email",
    lastVerified: PRICING_MATRIX_VERIFIED,
    pricingUrl: "https://www.aweber.com/pricing.htm",
    confidence: "approximate",
    estimateAtContacts: {
      500: 12.49,
      1_000: 19.99,
      2_500: null,
    },
  },
  {
    id: "campaign-monitor",
    name: "Campaign Monitor",
    compareHref: "/compare/campaign-monitor",
    freePlan: "No",
    freeContacts: "—",
    freeSends: "—",
    entryPaid: "Varies — verify calculator",
    includedContacts: "Contact tiers",
    includedSends: "Plan-dependent",
    sms: "Limited",
    automations: "Agency / design-led",
    brandRemoval: "Paid",
    pricingModel: "Contact-based",
    bestFor: "Agencies and design-led brands",
    lastVerified: PRICING_MATRIX_VERIFIED,
    pricingUrl: "https://www.campaignmonitor.com/pricing/",
    confidence: "varies",
    estimateAtContacts: {},
  },
  {
    id: "mailjet",
    name: "Mailjet",
    compareHref: "/compare/mailjet",
    freePlan: "Yes (limits)",
    freeContacts: "Varies",
    freeSends: "Daily free limit — verify",
    entryPaid: "Varies by volume",
    includedContacts: "Volume-oriented",
    includedSends: "Credit / plan volume",
    sms: "Available",
    automations: "Basic–strong",
    brandRemoval: "Paid",
    pricingModel: "Send volume + API",
    bestFor: "Transactional + marketing mix",
    lastVerified: PRICING_MATRIX_VERIFIED,
    pricingUrl: "https://www.mailjet.com/pricing/",
    confidence: "varies",
    estimateAtContacts: {},
  },
  {
    id: "emailoctopus",
    name: "EmailOctopus",
    compareHref: "/compare/emailoctopus",
    freePlan: "Yes",
    freeContacts: "Limited free tier — verify",
    freeSends: "Limited — verify",
    entryPaid: "Low-cost paid tiers — verify",
    includedContacts: "Contact tiers",
    includedSends: "Plan-dependent",
    sms: "Not a focus",
    automations: "Basic–strong",
    brandRemoval: "Paid",
    pricingModel: "Contact-based value pricing",
    bestFor: "Budget-conscious senders",
    lastVerified: PRICING_MATRIX_VERIFIED,
    pricingUrl: "https://emailoctopus.com/pricing",
    confidence: "varies",
    estimateAtContacts: {},
  },
  {
    id: "beehiiv",
    name: "beehiiv",
    compareHref: "/compare/beehiiv",
    freePlan: "Yes (creator)",
    freeContacts: "Creator free — verify",
    freeSends: "Creator limits — verify",
    entryPaid: "Scale / max tiers — verify",
    includedContacts: "Subscriber growth model",
    includedSends: "Newsletter-oriented",
    sms: "Not a focus",
    automations: "Creator growth tools",
    brandRemoval: "Paid",
    pricingModel: "Creator newsletter monetization",
    bestFor: "Newsletter publishers",
    lastVerified: PRICING_MATRIX_VERIFIED,
    pricingUrl: "https://www.beehiiv.com/pricing",
    confidence: "varies",
    estimateAtContacts: {},
  },
];

export const LIST_SIZE_PAGES = [500, 1_000, 2_500, 5_000, 10_000, 20_000, 40_000] as const;

export function allMatrixRows(): PricingMatrixRow[] {
  return [sendfableMatrixRow(), ...COMPETITOR_MATRIX];
}

export function matrixDisclaimer(): string {
  return `${COMPARISON_DISCLAIMER} Snapshot date: ${PRICING_MATRIX_VERIFIED}. ${TRADEMARK_DISCLAIMER}`;
}

/** Estimate monthly price at a contact count when confidence allows. */
export function estimateMonthlyAt(
  row: PricingMatrixRow,
  contacts: number
): { price: number | null; label: string } {
  if (row.confidence === "varies" && row.id !== "sendfable") {
    return { price: null, label: "Varies — verify current price" };
  }
  const map = row.estimateAtContacts || {};
  const keys = Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b);
  for (const k of keys) {
    if (contacts <= k) {
      const v = map[k];
      if (v === null || v === undefined) {
        return { price: null, label: "Varies — verify current price" };
      }
      return {
        price: v,
        label: row.confidence === "exact" ? `$${v}/mo` : `~$${v}/mo (approx.)`,
      };
    }
  }
  return { price: null, label: "Varies — verify current price" };
}

export function syncCatalogPricingDate(slug: string): string {
  return getCompetitor(slug)?.pricingLastChecked ?? PRICING_MATRIX_VERIFIED;
}

export function migrateSlugs(): string[] {
  return [
    "mailchimp",
    "constant-contact",
    "brevo",
    "mailerlite",
    "klaviyo",
    "activecampaign",
    "omnisend",
    "getresponse",
    "aweber",
    "campaign-monitor",
    "sender",
  ];
}

export function pairComparisons(): { slug: string; a: string; b: string; title: string }[] {
  return [
    {
      slug: "mailchimp-vs-constant-contact",
      a: "mailchimp",
      b: "constant-contact",
      title: "Mailchimp vs Constant Contact",
    },
    {
      slug: "mailchimp-vs-brevo",
      a: "mailchimp",
      b: "brevo",
      title: "Mailchimp vs Brevo",
    },
    {
      slug: "mailchimp-vs-mailerlite",
      a: "mailchimp",
      b: "mailerlite",
      title: "Mailchimp vs MailerLite",
    },
    {
      slug: "mailchimp-vs-klaviyo",
      a: "mailchimp",
      b: "klaviyo",
      title: "Mailchimp vs Klaviyo",
    },
  ];
}

/** Ensure matrix ids that have compare pages exist in catalog when public. */
export function matrixCatalogGaps(): string[] {
  return COMPETITOR_MATRIX.filter((r) => r.compareHref?.startsWith("/compare/"))
    .map((r) => r.id)
    .filter((id) => !COMPETITORS[id]?.publicComparisonEnabled);
}
