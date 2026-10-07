/**
 * Discover a marketing page and build a demo only when the facts are good enough.
 * Otherwise the caller keeps the normal Casey email.
 */

import { fetchPublicText } from "@/lib/ssrf";
import { fetchCandidatePages, type PageFetcher } from "@/lib/acquisition/website-demo/discover";
import { extractMarketingFacts, type MarketingFacts } from "@/lib/acquisition/website-demo/extract";
import { chooseInitialTrack } from "@/lib/acquisition/queue-policy";

export type DemoBuild = {
  facts: MarketingFacts;
  track: "personalized_website_demo" | "normal";
};

async function defaultFetch(url: string) {
  try {
    const page = await fetchPublicText(url);
    return { url: page.url, body: page.body };
  } catch {
    return null;
  }
}

export async function buildWebsiteDemo(input: {
  website: string;
  businessName: string;
  fetchPage?: PageFetcher;
}): Promise<DemoBuild | null> {
  const fetchPage = input.fetchPage ?? defaultFetch;
  const pages = await fetchCandidatePages(input.website, fetchPage);
  let best: MarketingFacts | null = null;
  for (const page of pages) {
    const facts = extractMarketingFacts(page.body, page.url, input.businessName);
    if (!facts) continue;
    const score =
      (facts.priceText ? 3 : 0) +
      (facts.dateText ? 3 : 0) +
      (facts.imageUrl ? 2 : 0) +
      (facts.description ? 1 : 0);
    const prev =
      best == null
        ? -1
        : (best.priceText ? 3 : 0) +
          (best.dateText ? 3 : 0) +
          (best.imageUrl ? 2 : 0) +
          (best.description ? 1 : 0);
    if (score > prev) best = facts;
  }
  if (!best) return null;
  const track = chooseInitialTrack(true);
  if (track !== "personalized_website_demo") {
    return { facts: best, track: "normal" };
  }
  return { facts: best, track: "personalized_website_demo" };
}
