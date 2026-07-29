export * from "./types";
export {
  COMPETITORS,
  COMPETITOR_CANDIDATES,
  listPublicCompetitors,
  getCompetitor,
} from "./catalog";

import { listPublicCompetitors } from "./catalog";
import { isFeaturesStale, isPricingStale, type CompetitorRecord } from "./types";

export type FreshnessRow = {
  slug: string;
  name: string;
  pricingLastChecked: string;
  featuresLastChecked: string;
  pricingStale: boolean;
  featuresStale: boolean;
  reviewStatus: CompetitorRecord["reviewStatus"];
};

export function competitorFreshnessReport(now = new Date()): FreshnessRow[] {
  return listPublicCompetitors().map((c) => ({
    slug: c.slug,
    name: c.name,
    pricingLastChecked: c.pricingLastChecked,
    featuresLastChecked: c.featuresLastChecked,
    pricingStale: isPricingStale(c, now),
    featuresStale: isFeaturesStale(c, now),
    reviewStatus: c.reviewStatus,
  }));
}
