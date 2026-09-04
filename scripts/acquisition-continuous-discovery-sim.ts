/**
 * Prove continuous discovery returns NEW domains outside ACQUISITION_SEED_CATALOG.
 * Calls public Overpass (no email send, no DB writes unless --persist).
 *
 * Usage: npx tsx scripts/acquisition-continuous-discovery-sim.ts
 */
import { ACQUISITION_SEED_CATALOG } from "../src/lib/acquisition/discovery/seed-catalog";
import { marketsForDiscoveryRun } from "../src/lib/acquisition/discovery/markets";
import {
  ENTERPRISE_DOMAIN_BLOCKLIST,
  fetchContinuousDiscoveryCandidates,
  parseOverpassElements,
} from "../src/lib/acquisition/discovery/overpass";
import { normalizeDomain } from "../src/lib/acquisition/normalize";

async function main() {
  const seedDomains = new Set(
    ACQUISITION_SEED_CATALOG.map((s) => normalizeDomain(s.website)).filter(Boolean)
  );

  // Unit: parser produces non-seed domains from fixture
  const fixture = parseOverpassElements(
    [
      {
        type: "node",
        id: 1,
        tags: {
          name: "Maple Street Cafe",
          website: "https://maplestreetcafe-example-test.com",
          amenity: "cafe",
        },
      },
      {
        type: "node",
        id: 2,
        tags: {
          name: "PetSmart",
          website: "https://www.petsmart.com",
          shop: "pet",
        },
      },
      {
        type: "node",
        id: 3,
        tags: {
          name: "River Bend Brewing",
          website: "https://riverbendbrewing-sim.test",
          craft: "brewery",
        },
      },
    ],
    { city: "Chicago", state: "IL", lat: 41.87, lon: -87.62 }
  );
  assert(fixture.length === 2, `fixture expected 2 (enterprise filtered), got ${fixture.length}`);
  assert(
    !fixture.some((c) => ENTERPRISE_DOMAIN_BLOCKLIST.has(normalizeDomain(c.website))),
    "enterprise leaked"
  );

  console.log("Fetching live Overpass candidates (rotating markets)…");
  const markets = marketsForDiscoveryRun(new Date(), 4);
  const { candidates, byMarket } = await fetchContinuousDiscoveryCandidates(markets, {
    maxCandidates: 120,
  });

  console.log("Markets:", byMarket);
  console.log(`Total candidates: ${candidates.length}`);

  const outsideSeed = candidates.filter(
    (c) => !seedDomains.has(normalizeDomain(c.website))
  );
  console.log(`Outside seed catalog: ${outsideSeed.length}`);
  for (const c of outsideSeed.slice(0, 30)) {
    console.log(`  - ${c.businessName} · ${normalizeDomain(c.website)} · ${c.city} · ${c.category}`);
  }

  if (outsideSeed.length < 25) {
    console.error(
      `FAIL: need ≥25 new domains outside seed catalog, got ${outsideSeed.length}`
    );
    process.exit(1);
  }

  console.log("\nPASS: continuous discovery can surface ≥25 businesses outside seed catalog.");
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
