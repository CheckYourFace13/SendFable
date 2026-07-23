/**
 * Centralized competitor pricing snapshots for marketing comparisons.
 * Prices change — always surface lastChecked and verify sources before quoting.
 */

export const PRICING_LAST_CHECKED = "2026-07-23";

export const PRICING_DISCLAIMER =
  "Competitor pricing changes frequently and varies by plan, billing interval, and add-ons. Figures below are approximate public list prices as of the lastChecked date — verify on each vendor’s site before making a decision.";

export type CompetitorTier = {
  name: string;
  /** Approximate contact or subscriber ceiling for the quoted price, when applicable */
  contacts?: number;
  /** Monthly list price in USD, or a short note when not a simple number */
  monthlyPrice: number | string;
  notes?: string;
};

export type CompetitorPricing = {
  id: string;
  name: string;
  website: string;
  lastChecked: string;
  sources: string[];
  disclaimer: string;
  tiers: CompetitorTier[];
};

const base = (partial: Omit<CompetitorPricing, "lastChecked" | "disclaimer">): CompetitorPricing => ({
  ...partial,
  lastChecked: PRICING_LAST_CHECKED,
  disclaimer: PRICING_DISCLAIMER,
});

export const COMPETITOR_PRICING: Record<string, CompetitorPricing> = {
  mailchimp: base({
    id: "mailchimp",
    name: "Mailchimp",
    website: "https://mailchimp.com/pricing/",
    sources: ["https://mailchimp.com/pricing/"],
    tiers: [
      { name: "Free", contacts: 500, monthlyPrice: 0, notes: "Limited sends; Essentials/Standard for full features" },
      { name: "Essentials ~500", contacts: 500, monthlyPrice: 13, notes: "Approx. Essentials list price" },
      { name: "Standard ~2,500", contacts: 2_500, monthlyPrice: 45, notes: "Approx. Standard by contact tier" },
      { name: "Standard ~10,000", contacts: 10_000, monthlyPrice: 105, notes: "Approx. Standard by contact tier" },
      { name: "Standard ~30,000", contacts: 30_000, monthlyPrice: 285, notes: "Approx. Standard by contact tier" },
    ],
  }),
  "constant-contact": base({
    id: "constant-contact",
    name: "Constant Contact",
    website: "https://www.constantcontact.com/pricing",
    sources: ["https://www.constantcontact.com/pricing"],
    tiers: [
      { name: "Lite ~500", contacts: 500, monthlyPrice: 12, notes: "Approx. entry email plan" },
      { name: "~2,500 contacts", contacts: 2_500, monthlyPrice: 45, notes: "Approx. mid-tier list pricing" },
      { name: "~10,000 contacts", contacts: 10_000, monthlyPrice: 80, notes: "Approx.; confirm current tiers" },
    ],
  }),
  brevo: base({
    id: "brevo",
    name: "Brevo",
    website: "https://www.brevo.com/pricing/",
    sources: ["https://www.brevo.com/pricing/"],
    tiers: [
      { name: "Free", contacts: 0, monthlyPrice: 0, notes: "Daily send caps; contacts often unlimited on free" },
      { name: "Starter (send-based)", monthlyPrice: "from ~$9", notes: "Priced primarily by emails/month" },
      { name: "Business (send-based)", monthlyPrice: "from ~$18", notes: "Higher volume + marketing features" },
    ],
  }),
  mailerlite: base({
    id: "mailerlite",
    name: "MailerLite",
    website: "https://www.mailerlite.com/pricing",
    sources: ["https://www.mailerlite.com/pricing"],
    tiers: [
      { name: "Free", contacts: 1_000, monthlyPrice: 0, notes: "Send limits apply" },
      { name: "Growing Business ~2,500", contacts: 2_500, monthlyPrice: 25, notes: "Approx. Growing Business" },
      { name: "Growing Business ~10,000", contacts: 10_000, monthlyPrice: 50, notes: "Approx. Growing Business" },
    ],
  }),
  kit: base({
    id: "kit",
    name: "Kit (ConvertKit)",
    website: "https://kit.com/pricing",
    sources: ["https://kit.com/pricing"],
    tiers: [
      { name: "Newsletter", contacts: 10_000, monthlyPrice: 0, notes: "Creator-focused free tier with limits" },
      { name: "Creator ~1,000", contacts: 1_000, monthlyPrice: 29, notes: "Approx. Creator plan" },
      { name: "Creator ~5,000", contacts: 5_000, monthlyPrice: 59, notes: "Approx. Creator plan" },
      { name: "Creator Pro", monthlyPrice: "higher", notes: "Automation-heavy; confirm current pricing" },
    ],
  }),
  beehiiv: base({
    id: "beehiiv",
    name: "beehiiv",
    website: "https://www.beehiiv.com/pricing",
    sources: ["https://www.beehiiv.com/pricing"],
    tiers: [
      { name: "Launch", contacts: 2_500, monthlyPrice: 0, notes: "Newsletter-first free tier" },
      { name: "Scale", monthlyPrice: "from ~$42", notes: "Subscriber-based paid tiers" },
      { name: "Max", monthlyPrice: "custom", notes: "Higher volume / monetization features" },
    ],
  }),
};

export function competitorPricing(id: keyof typeof COMPETITOR_PRICING): CompetitorPricing {
  return COMPETITOR_PRICING[id];
}
