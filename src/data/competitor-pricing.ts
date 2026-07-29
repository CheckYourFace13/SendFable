/**
 * Compatibility shim — prefer `@/data/competitors`.
 * Kept so older imports continue to resolve during the SF-002 migration.
 */

import { COMPETITORS } from "./competitors/catalog";
import { COMPARISON_DISCLAIMER } from "./competitors/types";
import type { CompetitorPricing, CompetitorTier } from "./competitor-pricing-types";

export type { CompetitorTier, CompetitorPricing } from "./competitor-pricing-types";

export const PRICING_LAST_CHECKED = "2026-07-29";
export const PRICING_DISCLAIMER = COMPARISON_DISCLAIMER;

export const COMPETITOR_PRICING: Record<string, CompetitorPricing> = Object.fromEntries(
  Object.values(COMPETITORS).map((c) => [
    c.slug,
    {
      id: c.slug,
      name: c.name,
      website: c.pricingUrl,
      lastChecked: c.pricingLastChecked,
      sources: c.sources,
      disclaimer: COMPARISON_DISCLAIMER,
      tiers: c.tiers,
    } satisfies CompetitorPricing,
  ])
);

export function competitorPricing(id: string): CompetitorPricing {
  const row = COMPETITOR_PRICING[id];
  if (!row) {
    throw new Error(`Unknown competitor pricing id: ${id}`);
  }
  return row;
}
