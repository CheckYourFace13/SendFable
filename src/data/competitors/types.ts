/**
 * Competitor comparison types — single source of truth for SF-002/SF-003.
 * Pricing must carry lastChecked + sources. Do not auto-publish unverified scrapes.
 */

export type CompetitorTier = {
  name: string;
  contacts?: number;
  /** Approximate monthly list price USD, or a short note */
  monthlyPrice: number | string;
  notes?: string;
};

export type CapabilityLevel =
  | "none"
  | "basic"
  | "strong"
  | "suite"
  | "specialized"
  | "varies";

export type CompetitorRecord = {
  slug: string;
  name: string;
  officialUrl: string;
  pricingUrl: string;
  publicComparisonEnabled: boolean;
  reviewStatus: "draft" | "reviewed" | "stale" | "archived";
  pricingLastChecked: string; // YYYY-MM-DD
  featuresLastChecked: string;
  sources: string[];
  pricingFreshnessWarning?: string;
  freePlanSummary: string;
  paidPlanSummary: string;
  billingBasis: string;
  contactLimitsSummary: string;
  emailLimitsSummary: string;
  automation: CapabilityLevel;
  crm: CapabilityLevel;
  ecommerce: CapabilityLevel;
  sms: CapabilityLevel;
  newsletterCreator: CapabilityLevel;
  integrationsSummary: string;
  supportSummary: string;
  bestFor: string[];
  potentialDrawbacks: string[];
  sendfableStronger: string[];
  competitorStronger: string[];
  shortAnswer: string;
  whoSendfableIsFor: string;
  whoCompetitorIsFor: string;
  deliverabilityNote: string;
  formsNote: string;
  templatesNote: string;
  analyticsNote: string;
  migrationNote: string;
  tiers: CompetitorTier[];
  relatedSlugs: string[];
  faqs: { q: string; a: string }[];
};

export const PRICING_STALE_DAYS = 30;
export const FEATURES_STALE_DAYS = 90;

export const COMPARISON_DISCLAIMER =
  "Pricing and features change. Figures are approximate public list prices as of each competitor’s pricingLastChecked date. Verify on the vendor’s official site before deciding. SendFable does not guarantee that any tool is always cheaper or better.";

export function daysSince(isoDate: string, now = new Date()): number {
  const t = Date.parse(isoDate + "T00:00:00Z");
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - t) / (24 * 60 * 60 * 1000));
}

export function isPricingStale(record: CompetitorRecord, now = new Date()): boolean {
  return daysSince(record.pricingLastChecked, now) > PRICING_STALE_DAYS;
}

export function isFeaturesStale(record: CompetitorRecord, now = new Date()): boolean {
  return daysSince(record.featuresLastChecked, now) > FEATURES_STALE_DAYS;
}

export function capabilityLabel(level: CapabilityLevel): string {
  switch (level) {
    case "none":
      return "Not a focus";
    case "basic":
      return "Basic";
    case "strong":
      return "Strong";
    case "suite":
      return "Full suite";
    case "specialized":
      return "Specialized";
    case "varies":
      return "Varies by plan";
    default:
      return level;
  }
}
