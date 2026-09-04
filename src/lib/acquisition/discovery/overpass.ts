/**
 * Continuous prospect discovery via OpenStreetMap Overpass API.
 * Legitimate public map data — businesses that publish a website tag.
 * Does not buy lists, guess emails, or bypass CAPTCHAs.
 */

import type { SeedBusiness } from "@/lib/acquisition/discovery/seed-catalog";
import type { DiscoveryMarket } from "@/lib/acquisition/discovery/markets";
import { normalizeDomain, normalizeWebsite } from "@/lib/acquisition/normalize";

export type OsmCandidate = SeedBusiness & {
  sourceKind: "osm_overpass";
  osmId?: string;
};

const OSM_CATEGORY_QUERIES: Array<{
  category: string;
  /** Overpass filter fragment inside node/way/relation */
  filter: string;
}> = [
  { category: "restaurant", filter: '["amenity"="restaurant"]' },
  { category: "cafe", filter: '["amenity"="cafe"]' },
  { category: "bakery", filter: '["shop"="bakery"]' },
  { category: "brewery", filter: '["craft"="brewery"]' },
  { category: "brewery", filter: '["industrial"="brewery"]' },
  { category: "taproom", filter: '["amenity"="bar"]["microbrewery"="yes"]' },
  { category: "salon", filter: '["shop"="hairdresser"]' },
  { category: "salon", filter: '["shop"="beauty"]' },
  { category: "fitness", filter: '["leisure"="fitness_centre"]' },
  { category: "pet", filter: '["shop"="pet"]' },
  { category: "retail", filter: '["shop"="clothes"]' },
  { category: "retail", filter: '["shop"="gift"]' },
  { category: "events", filter: '["amenity"="theatre"]' },
  { category: "events", filter: '["amenity"="arts_centre"]' },
  { category: "contractor", filter: '["craft"="carpenter"]' },
  { category: "contractor", filter: '["craft"="electrician"]' },
  { category: "real_estate", filter: '["office"="estate_agent"]' },
  { category: "professional", filter: '["office"="lawyer"]' },
  { category: "professional", filter: '["office"="accountant"]' },
  { category: "nonprofit", filter: '["office"="ngo"]' },
];

/** Domains that are national chains / enterprises — skip for SMB outreach. */
export const ENTERPRISE_DOMAIN_BLOCKLIST = new Set([
  "petsmart.com",
  "petco.com",
  "banfield.com",
  "rei.com",
  "acehardware.com",
  "equinox.com",
  "barrys.com",
  "livenation.com",
  "thefillmore.com",
  "habitat.org",
  "starbucks.com",
  "mcdonalds.com",
  "chipotle.com",
  "dominos.com",
  "subway.com",
  "walmart.com",
  "target.com",
  "amazon.com",
  "facebook.com",
  "instagram.com",
  "yelp.com",
  "tripadvisor.com",
  "opentable.com",
  "toasttab.com",
  "squarespace.com",
  "wix.com",
  "godaddy.com",
  "linktr.ee",
  "bit.ly",
  "peets.com",
  "cornerbakerycafe.com",
  "dunkindonuts.com",
  "panerabread.com",
]);

type OverpassElement = {
  type: string;
  id: number;
  tags?: Record<string, string>;
};

export function parseOverpassElements(
  elements: OverpassElement[],
  market: DiscoveryMarket
): OsmCandidate[] {
  const out: OsmCandidate[] = [];
  const seen = new Set<string>();

  for (const el of elements) {
    const tags = el.tags || {};
    const name = (tags.name || "").trim();
    const websiteRaw = (tags.website || tags["contact:website"] || "").trim();
    if (!name || !websiteRaw) continue;

    const domain = normalizeDomain(websiteRaw);
    if (!domain || domain === "example.com") continue;
    if (ENTERPRISE_DOMAIN_BLOCKLIST.has(domain)) continue;
    if (seen.has(domain)) continue;
    seen.add(domain);

    const category = categorizeOsmTags(tags);
    out.push({
      businessName: name.slice(0, 120),
      website: normalizeWebsite(websiteRaw),
      city: market.city,
      state: market.state,
      category,
      tier: 1,
      hints: { repeatCustomer: true, localSmall: true },
      sourceKind: "osm_overpass",
      osmId: `${el.type}/${el.id}`,
    });
  }
  return out;
}

export function categorizeOsmTags(tags: Record<string, string>): string {
  if (tags.craft === "brewery" || tags.industrial === "brewery") return "brewery";
  if (tags.microbrewery === "yes") return "taproom";
  if (tags.amenity === "restaurant") return "restaurant";
  if (tags.amenity === "cafe") return "cafe";
  if (tags.shop === "bakery") return "bakery";
  if (tags.shop === "hairdresser" || tags.shop === "beauty") return "salon";
  if (tags.leisure === "fitness_centre") return "fitness";
  if (tags.shop === "pet") return "pet";
  if (tags.office === "estate_agent") return "real_estate";
  if (tags.office === "lawyer" || tags.office === "accountant") return "professional";
  if (tags.office === "ngo") return "nonprofit";
  if (tags.amenity === "theatre" || tags.amenity === "arts_centre") return "events";
  if (tags.craft === "carpenter" || tags.craft === "electrician") return "contractor";
  if (tags.shop) return "retail";
  if (tags.amenity === "bar" || tags.amenity === "pub") return "restaurant";
  return "local_services";
}

function buildOverpassQuery(market: DiscoveryMarket, categoryLimit = 8): string {
  const radius = market.radiusM ?? 12_000;
  // Rotate which category filters we query to diversify
  const day = Math.floor(Date.now() / 86_400_000);
  const start = day % OSM_CATEGORY_QUERIES.length;
  const filters: string[] = [];
  for (let i = 0; i < categoryLimit; i++) {
    const q = OSM_CATEGORY_QUERIES[(start + i) % OSM_CATEGORY_QUERIES.length]!;
    filters.push(q.filter);
  }

  const parts = filters
    .map(
      (f) => `
  node(around:${radius},${market.lat},${market.lon})${f}["website"];
  way(around:${radius},${market.lat},${market.lon})${f}["website"];
`
    )
    .join("");

  return `[out:json][timeout:45];(${parts});out tags center;`;
}

const DEFAULT_OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

export async function fetchOsmCandidatesForMarket(
  market: DiscoveryMarket,
  opts?: {
    fetchImpl?: typeof fetch;
    endpoints?: string[];
    timeoutMs?: number;
  }
): Promise<{ candidates: OsmCandidate[]; error?: string; endpoint?: string }> {
  const fetchFn = opts?.fetchImpl || fetch;
  const endpoints = opts?.endpoints || DEFAULT_OVERPASS_ENDPOINTS;
  const timeoutMs = opts?.timeoutMs ?? 50_000;
  const query = buildOverpassQuery(market);

  let lastError = "no_endpoint";
  for (const endpoint of endpoints) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetchFn(endpoint, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          "User-Agent": "SendFableAcquisitionBot/1.0 (+https://sendfable.com; B2B research)",
        },
        body: `data=${encodeURIComponent(query)}`,
      });
      clearTimeout(t);
      if (!res.ok) {
        lastError = `http_${res.status}`;
        continue;
      }
      const json = (await res.json()) as { elements?: OverpassElement[] };
      const candidates = parseOverpassElements(json.elements || [], market);
      return { candidates, endpoint };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "fetch_failed";
    }
  }
  return { candidates: [], error: lastError };
}

/** Fetch candidates across several markets; dedupe by domain. */
export async function fetchContinuousDiscoveryCandidates(
  markets: DiscoveryMarket[],
  opts?: { fetchImpl?: typeof fetch; maxCandidates?: number }
): Promise<{
  candidates: OsmCandidate[];
  byMarket: Array<{ city: string; count: number; error?: string }>;
}> {
  const max = opts?.maxCandidates ?? 80;
  const seen = new Set<string>();
  const candidates: OsmCandidate[] = [];
  const byMarket: Array<{ city: string; count: number; error?: string }> = [];

  for (const market of markets) {
    const r = await fetchOsmCandidatesForMarket(market, { fetchImpl: opts?.fetchImpl });
    let added = 0;
    for (const c of r.candidates) {
      const d = normalizeDomain(c.website);
      if (!d || seen.has(d)) continue;
      seen.add(d);
      candidates.push(c);
      added++;
      if (candidates.length >= max) break;
    }
    byMarket.push({ city: market.city, count: added, error: r.error });
    if (candidates.length >= max) break;
    // Be polite to public Overpass mirrors
    await new Promise((r) => setTimeout(r, 1_200));
  }

  return { candidates, byMarket };
}
