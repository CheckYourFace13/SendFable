import { prisma } from "@/lib/prisma";
import { acquisitionDiscoveryEnabled, acquisitionMinScore } from "@/lib/acquisition/flags";
import {
  ACQUISITION_SEED_CATALOG,
  type SeedBusiness,
} from "@/lib/acquisition/discovery/seed-catalog";
import { enrichWebsite } from "@/lib/acquisition/discovery/enrich";
import { marketsForDiscoveryRun } from "@/lib/acquisition/discovery/markets";
import {
  ENTERPRISE_DOMAIN_BLOCKLIST,
  fetchContinuousDiscoveryCandidates,
  type OsmCandidate,
} from "@/lib/acquisition/discovery/overpass";
import {
  getInventoryHealth,
} from "@/lib/acquisition/discovery/inventory";
import {
  isRepeatCustomerCategory,
  scoreProspect,
} from "@/lib/acquisition/scoring";
import { claimFromEvidence } from "@/lib/acquisition/personalize";
import {
  isLikelyPersonalConsumerEmail,
  isValidEmailSyntax,
  normalizeDomain,
  normalizeWebsite,
} from "@/lib/acquisition/normalize";
import { emailMatchesWebsiteDomain, isUsBusinessState } from "@/lib/acquisition/quality-gate";
import {
  isExistingCustomerDomainOrEmail,
  isSuppressed,
} from "@/lib/acquisition/suppression";
import { alertOwnerException } from "@/lib/acquisition/notify";

export type DiscoverOptions = {
  limit?: number;
  /** Skip live fetch — use fixture HTML analyzer only (tests) */
  enrich?: boolean;
  seed?: SeedBusiness[];
  dryRunTag?: boolean;
  /** Force seed-only (bootstrap/tests). Default: continuous OSM + optional seed fill. */
  seedOnly?: boolean;
  /** Inject candidates (tests / dry-run). */
  candidates?: Array<SeedBusiness & { sourceKind?: string }>;
  /** How many rotating markets to query (default 3). */
  marketCount?: number;
  /** Extra market rotation offset (hour/batch) for geographic spread. */
  marketOffset?: number;
};

export type DiscoverSummary = {
  attempted: number;
  upserted: number;
  newDomains: number;
  qualified: number;
  needsEmail: number;
  skipped: number;
  source: string;
  markets: string[];
  prospects: Array<{
    id: string;
    businessName: string;
    domain: string;
    score: number;
    status: string;
    hasEmail: boolean;
    city?: string | null;
    category: string;
    sourceKind?: string;
  }>;
};

const TERMINAL = new Set([
  "CONTACTED",
  "FOLLOW_UP_1",
  "FOLLOW_UP_2",
  "OUTREACH_COMPLETE",
  "SIGNED_UP",
  "PAID",
  "UNSUBSCRIBED",
  "BOUNCED",
  "COMPLAINT",
  "SUPPRESSED",
  "NOT_INTERESTED",
  "QUEUED",
]);

function landingForCategory(category: string): string {
  if (category === "brewery" || category === "taproom") return "/solutions/breweries";
  if (category === "restaurant" || category === "cafe" || category === "bakery") {
    return "/solutions/restaurants";
  }
  if (category === "salon") return "/solutions/salons";
  if (category === "retail") return "/solutions/retail";
  if (category === "real_estate") return "/solutions/real-estate";
  if (category === "nonprofit") return "/solutions/nonprofits";
  if (category === "contractor") return "/solutions/contractors";
  if (category === "events") return "/solutions/local-events";
  if (category === "professional") return "/solutions/professional-services";
  return "/email-marketing-for-small-business";
}

async function upsertCandidate(
  seed: SeedBusiness & { sourceKind?: string },
  enrich: boolean
): Promise<{
  id: string;
  status: string;
  score: number;
  hasEmail: boolean;
  isNew: boolean;
  changed: boolean;
} | null> {
  const domain = normalizeDomain(seed.website);
  if (!domain || domain === "example.com") return null;
  if (ENTERPRISE_DOMAIN_BLOCKLIST.has(domain)) return null;

  const existing = await prisma.acquisitionProspect.findUnique({ where: { domain } });
  if (existing && TERMINAL.has(existing.status)) return null;

  const supp = await isSuppressed(null, domain);
  if (supp.suppressed) return null;
  if (await isExistingCustomerDomainOrEmail(null, domain)) return null;

  let activeWebsite = false;
  let contactEmail: string | undefined;
  let newsletterPresent = false;
  let eventsPromotionsPresent = false;
  let competitorPlatform: string | undefined;
  let evidenceSnippets: string[] = [];
  let contactPageUrl: string | undefined;

  if (enrich) {
    const en = await enrichWebsite(normalizeWebsite(seed.website));
    activeWebsite = en.activeWebsite;
    contactEmail = en.bestEmail && isValidEmailSyntax(en.bestEmail) ? en.bestEmail : undefined;
    newsletterPresent = en.newsletterPresent;
    eventsPromotionsPresent = en.eventsPromotionsPresent;
    competitorPlatform = en.competitorPlatform;
    evidenceSnippets = en.evidenceSnippets;
    contactPageUrl = en.contactPageUrl;
  }

  if (contactEmail && (await isExistingCustomerDomainOrEmail(contactEmail, domain))) {
    return null;
  }
  if (contactEmail) {
    const es = await isSuppressed(contactEmail, domain);
    if (es.suppressed) return null;
  }

  const emailOk =
    Boolean(contactEmail) &&
    isValidEmailSyntax(contactEmail!) &&
    emailMatchesWebsiteDomain(contactEmail!, domain) &&
    !isLikelyPersonalConsumerEmail(contactEmail!);

  const signals = {
    newsletterPresent,
    eventsPromotionsPresent,
    repeatCustomerBusiness:
      seed.hints?.repeatCustomer ?? isRepeatCustomerCategory(seed.category),
    publicBusinessEmail: Boolean(contactEmail),
    domainMatchedBusinessEmail: emailOk,
    activeWebsite,
    competitorEmailTool: Boolean(competitorPlatform),
    clearLocalSmallBusiness: seed.hints?.localSmall ?? seed.tier === 1,
    recentSiteActivity: activeWebsite,
    poorOrDeadSite: enrich && !activeWebsite,
    questionableFit: false,
  };

  const score = scoreProspect(signals);
  const claim = claimFromEvidence({
    newsletterPresent,
    eventsPromotionsPresent,
    competitorPlatform,
    category: seed.category,
    evidenceSnippet: evidenceSnippets[0],
  });

  const min = acquisitionMinScore();
  let status: "DISCOVERED" | "QUALIFIED" | "NEEDS_EMAIL" | "REJECTED" = "DISCOVERED";
  if (!activeWebsite && enrich) status = "REJECTED";
  else if (!contactEmail) status = "NEEDS_EMAIL";
  else if (score >= min && claim && emailOk && isUsBusinessState(seed.state)) {
    status = "QUALIFIED";
  } else status = "DISCOVERED";

  const fitSignals = Object.entries(signals)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const sourceKind = seed.sourceKind || "seed_catalog";
  const data = {
    businessName: seed.businessName,
    website: normalizeWebsite(seed.website),
    domain,
    city: seed.city,
    state: seed.state,
    category: seed.category,
    tier: seed.tier,
    sourceUrl: normalizeWebsite(seed.website),
    sourceKind,
    contactEmail: contactEmail || null,
    contactPageUrl: contactPageUrl || null,
    newsletterPresent,
    eventsPromotionsPresent,
    competitorPlatform: competitorPlatform || null,
    activeWebsite,
    fitSignals,
    score,
    personalizationClaim: claim?.claim || null,
    personalizationSourceUrl: claim ? normalizeWebsite(seed.website) : null,
    personalizationEvidence: claim?.evidence || null,
    generatedOpener: claim?.claim || null,
    status,
    landingPagePath: landingForCategory(seed.category),
  };

  const isNew = !existing;
  const changed =
    isNew ||
    !existing ||
    existing.status !== status ||
    existing.score !== score ||
    existing.contactEmail !== (contactEmail || null);

  const row = existing
    ? await prisma.acquisitionProspect.update({ where: { id: existing.id }, data })
    : await prisma.acquisitionProspect
        .create({ data })
        .catch(async (err: { code?: string }) => {
          if (err?.code !== "P2002") throw err;
          // Concurrent discovery of same domain — update the winner
          return prisma.acquisitionProspect.update({ where: { domain }, data });
        });

  if (isNew) {
    await prisma.acquisitionEvent.create({
      data: {
        prospectId: row.id,
        type: "discovered_new",
        meta: { score, status: row.status, enriched: enrich, sourceKind },
      },
    });
  } else if (changed) {
    await prisma.acquisitionEvent.create({
      data: {
        prospectId: row.id,
        type: "discovered",
        meta: { score, status: row.status, enriched: enrich, sourceKind, refreshed: true },
      },
    });
  }

  return {
    id: row.id,
    status: row.status,
    score: row.score,
    hasEmail: Boolean(row.contactEmail),
    isNew,
    changed,
  };
}

/**
 * Continuous discovery: OSM Overpass (rotating US markets) + optional seed bootstrap.
 * Seed catalog alone is NOT sufficient for autonomous growth.
 */
export async function runDiscovery(
  opts: DiscoverOptions & { force?: boolean } = {}
): Promise<DiscoverSummary> {
  if (!opts.force && !acquisitionDiscoveryEnabled()) {
    return emptySummary("disabled");
  }

  const enrich = opts.enrich !== false;
  const limit = opts.limit ?? 40;
  let source = "continuous";
  let markets: string[] = [];
  let batch: Array<SeedBusiness & { sourceKind?: string }> = [];

  if (opts.candidates?.length) {
    batch = opts.candidates.slice(0, limit);
    source = "injected";
  } else if (opts.seedOnly || opts.seed) {
    batch = (opts.seed || ACQUISITION_SEED_CATALOG).slice(0, limit);
    source = "seed_catalog";
  } else {
    const marketList = marketsForDiscoveryRun(
      new Date(),
      opts.marketCount ?? 3,
      opts.marketOffset ?? 0
    );
    markets = marketList.map((m) => `${m.city}, ${m.state}`);
    try {
      const { candidates, byMarket } = await fetchContinuousDiscoveryCandidates(marketList, {
        maxCandidates: Math.max(limit * 3, 60),
      });
      // Prefer domains we have never seen
      const existingDomains = new Set(
        (
          await prisma.acquisitionProspect.findMany({
            select: { domain: true },
          })
        ).map((p) => p.domain)
      );
      const fresh = candidates.filter((c) => !existingDomains.has(normalizeDomain(c.website)));
      const pool = [...fresh, ...candidates.filter((c) => existingDomains.has(normalizeDomain(c.website)))];
      // Prefer better-performing segments (~70%) while keeping exploration (~30%)
      let ordered = pool;
      try {
        const { getPreferredDiscoveryBias } = await import(
          "@/lib/acquisition/conversion-optimize"
        );
        const bias = await getPreferredDiscoveryBias();
        if (bias.categories.length) {
          const preferred = pool.filter((c) => bias.categories.includes(c.category));
          const other = pool.filter((c) => !bias.categories.includes(c.category));
          const exploreN = Math.max(1, Math.floor(limit * 0.3));
          ordered = [
            ...preferred.slice(0, Math.max(0, limit - exploreN)),
            ...other.slice(0, exploreN),
            ...preferred.slice(Math.max(0, limit - exploreN)),
            ...other.slice(exploreN),
          ];
          // de-dupe by website while preserving order
          const seen = new Set<string>();
          ordered = ordered.filter((c) => {
            const d = normalizeDomain(c.website);
            if (seen.has(d)) return false;
            seen.add(d);
            return true;
          });
        }
      } catch {
        /* bias optional */
      }
      batch = ordered.slice(0, limit);
      source = `osm_overpass:${byMarket.map((m) => `${m.city}:${m.count}`).join(",")}`;
    } catch (err) {
      console.warn("[acquisition] continuous discovery failed, falling back to seed", err);
      // Bootstrap only — fill gaps, do not rely on seed as the sole source long-term
      batch = ACQUISITION_SEED_CATALOG.slice(0, Math.min(10, limit));
      source = "seed_fallback";
    }

    // If continuous returned nothing usable, try seed once as bootstrap
    if (batch.length === 0) {
      batch = ACQUISITION_SEED_CATALOG.slice(0, Math.min(15, limit));
      source = "seed_bootstrap";
    }
  }

  let upserted = 0;
  let newDomains = 0;
  let qualified = 0;
  let needsEmail = 0;
  let skipped = 0;
  const prospects: DiscoverSummary["prospects"] = [];

  for (const seed of batch) {
    try {
      const r = await upsertCandidate(seed, enrich);
      if (!r) {
        skipped++;
        continue;
      }
      upserted++;
      if (r.isNew) newDomains++;
      if (r.status === "QUALIFIED") qualified++;
      if (r.status === "NEEDS_EMAIL") needsEmail++;
      const full = await prisma.acquisitionProspect.findUnique({ where: { id: r.id } });
      if (full) {
        prospects.push({
          id: full.id,
          businessName: full.businessName,
          domain: full.domain,
          score: full.score,
          status: full.status,
          hasEmail: Boolean(full.contactEmail),
          city: full.city,
          category: full.category,
          sourceKind: full.sourceKind,
        });
      }
    } catch (err) {
      skipped++;
      console.warn("[acquisition] discover candidate failed", seed.website, err);
    }
  }

  await prisma.acquisitionEvent.create({
    data: {
      type: "discovery_run",
      meta: {
        source,
        markets,
        attempted: batch.length,
        upserted,
        newDomains,
        qualified,
        needsEmail,
        skipped,
      },
    },
  });

  // Owner alert when continuous discovery yields zero NEW domains while inventory starved
  // (48h qualified drought is handled by autofill.maybeAlertDiscoveryStarved)
  if (newDomains === 0 && !opts.seedOnly) {
    const health = await getInventoryHealth();
    if (health.status === "STARVED" && health.sendableInventory === 0) {
      const since = new Date(Date.now() - 20 * 60 * 60 * 1000);
      const recent = await prisma.acquisitionEvent.findFirst({
        where: { type: "discovery_starved_alert", createdAt: { gte: since } },
      });
      if (!recent) {
        await alertOwnerException(
          "SendFable acquisition discovery STARVED",
          `Continuous discovery found 0 new domains.\nSource: ${source}\nMarkets: ${markets.join("; ") || "—"}\nSendable inventory: ${health.sendableInventory}\n\nCheck Overpass connectivity and inventory on /admin/acquisition.`
        );
        await prisma.acquisitionEvent.create({
          data: { type: "discovery_starved_alert", meta: { source, markets } },
        });
      }
    }
  }

  return {
    attempted: batch.length,
    upserted,
    newDomains,
    qualified,
    needsEmail,
    skipped,
    source,
    markets,
    prospects,
  };
}

function emptySummary(source: string): DiscoverSummary {
  return {
    attempted: 0,
    upserted: 0,
    newDomains: 0,
    qualified: 0,
    needsEmail: 0,
    skipped: 0,
    source,
    markets: [],
    prospects: [],
  };
}

export { INVENTORY_MIN_QUALIFIED } from "@/lib/acquisition/discovery/inventory";
export { shouldRunDiscoveryNow, runInventoryAutofill } from "@/lib/acquisition/discovery/autofill";
export type { OsmCandidate };
