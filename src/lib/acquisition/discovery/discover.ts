import { prisma } from "@/lib/prisma";
import { acquisitionDiscoveryEnabled, acquisitionMinScore } from "@/lib/acquisition/flags";
import {
  ACQUISITION_SEED_CATALOG,
  type SeedBusiness,
} from "@/lib/acquisition/discovery/seed-catalog";
import { enrichWebsite } from "@/lib/acquisition/discovery/enrich";
import {
  isRepeatCustomerCategory,
  scoreProspect,
} from "@/lib/acquisition/scoring";
import { claimFromEvidence } from "@/lib/acquisition/personalize";
import { normalizeDomain, normalizeWebsite } from "@/lib/acquisition/normalize";
import {
  isExistingCustomerDomainOrEmail,
  isSuppressed,
} from "@/lib/acquisition/suppression";

export type DiscoverOptions = {
  limit?: number;
  /** Skip live fetch — use fixture HTML analyzer only (tests) */
  enrich?: boolean;
  seed?: SeedBusiness[];
  dryRunTag?: boolean;
};

export type DiscoverSummary = {
  attempted: number;
  upserted: number;
  qualified: number;
  needsEmail: number;
  skipped: number;
  prospects: Array<{
    id: string;
    businessName: string;
    domain: string;
    score: number;
    status: string;
    hasEmail: boolean;
    city?: string | null;
    category: string;
  }>;
};

async function upsertFromSeed(
  seed: SeedBusiness,
  enrich: boolean
): Promise<{ id: string; status: string; score: number; hasEmail: boolean } | null> {
  const domain = normalizeDomain(seed.website);
  if (!domain || domain === "example.com") {
    return null; // skip placeholder
  }

  const existing = await prisma.acquisitionProspect.findUnique({ where: { domain } });
  if (existing && ["CONTACTED", "FOLLOW_UP_1", "FOLLOW_UP_2", "OUTREACH_COMPLETE", "SIGNED_UP", "PAID", "UNSUBSCRIBED", "BOUNCED", "COMPLAINT", "SUPPRESSED", "NOT_INTERESTED"].includes(existing.status)) {
    return null;
  }

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
    contactEmail = en.bestEmail;
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

  const signals = {
    newsletterPresent,
    eventsPromotionsPresent,
    repeatCustomerBusiness:
      seed.hints?.repeatCustomer ?? isRepeatCustomerCategory(seed.category),
    publicBusinessEmail: Boolean(contactEmail),
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
  else if (score >= min && claim) status = "QUALIFIED";
  else status = "DISCOVERED";

  const fitSignals = Object.entries(signals)
    .filter(([, v]) => v)
    .map(([k]) => k);

  const data = {
    businessName: seed.businessName,
    website: normalizeWebsite(seed.website),
    domain,
    city: seed.city,
    state: seed.state,
    category: seed.category,
    tier: seed.tier,
    sourceUrl: normalizeWebsite(seed.website),
    sourceKind: "seed_catalog",
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
    landingPagePath:
      seed.category === "brewery" || seed.category === "taproom"
        ? "/solutions/breweries"
        : seed.category === "restaurant" || seed.category === "cafe" || seed.category === "bakery"
          ? "/solutions/restaurants"
          : "/pricing",
  };

  const row = existing
    ? await prisma.acquisitionProspect.update({ where: { id: existing.id }, data })
    : await prisma.acquisitionProspect.create({ data });

  await prisma.acquisitionEvent.create({
    data: {
      prospectId: row.id,
      type: "discovered",
      meta: { score, status: row.status, enriched: enrich },
    },
  });

  return {
    id: row.id,
    status: row.status,
    score: row.score,
    hasEmail: Boolean(row.contactEmail),
  };
}

/**
 * Discover prospects from the seed catalog (+ optional live enrich).
 * Gated by discovery flag unless force=true (dry-run script).
 */
export async function runDiscovery(
  opts: DiscoverOptions & { force?: boolean } = {}
): Promise<DiscoverSummary> {
  if (!opts.force && !acquisitionDiscoveryEnabled()) {
    return {
      attempted: 0,
      upserted: 0,
      qualified: 0,
      needsEmail: 0,
      skipped: 0,
      prospects: [],
    };
  }

  const seeds = (opts.seed || ACQUISITION_SEED_CATALOG).slice(0, opts.limit ?? 40);
  const enrich = opts.enrich !== false;
  let upserted = 0;
  let qualified = 0;
  let needsEmail = 0;
  let skipped = 0;
  const prospects: DiscoverSummary["prospects"] = [];

  for (const seed of seeds) {
    try {
      const r = await upsertFromSeed(seed, enrich);
      if (!r) {
        skipped++;
        continue;
      }
      upserted++;
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
        });
      }
    } catch (err) {
      skipped++;
      console.warn("[acquisition] discover seed failed", seed.website, err);
    }
  }

  return {
    attempted: seeds.length,
    upserted,
    qualified,
    needsEmail,
    skipped,
    prospects,
  };
}
