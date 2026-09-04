/**
 * Acquisition dry-run — continuous OSM discovery + optional seed bootstrap.
 * NEVER sends live email.
 *
 * Usage: npx tsx scripts/acquisition-dry-run.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { runDiscovery } from "../src/lib/acquisition/discovery/discover";
import { reportAcquisitionFlags } from "../src/lib/acquisition/flags";
import { ACQUISITION_SEED_CATALOG } from "../src/lib/acquisition/discovery/seed-catalog";
import { normalizeDomain } from "../src/lib/acquisition/normalize";

async function main() {
  console.log("=== SendFable Acquisition Dry Run ===\n");
  console.log("Flags:", reportAcquisitionFlags());
  console.log(`Seed catalog size: ${ACQUISITION_SEED_CATALOG.length}`);
  console.log("Live sends: FORBIDDEN in this script.\n");

  const seedDomains = new Set(
    ACQUISITION_SEED_CATALOG.map((s) => normalizeDomain(s.website)).filter(Boolean)
  );

  // Continuous discovery (OSM) — force bypasses discovery flag
  const summary = await runDiscovery({
    force: true,
    enrich: false, // domain inventory proof without hammering every site
    limit: 40,
  });

  console.log("Discovery:");
  console.log(`  source:    ${summary.source}`);
  console.log(`  markets:   ${summary.markets.join("; ") || "—"}`);
  console.log(`  attempted: ${summary.attempted}`);
  console.log(`  upserted:  ${summary.upserted}`);
  console.log(`  newDomains:${summary.newDomains}`);
  console.log(`  qualified: ${summary.qualified}`);
  console.log(`  needsEmail:${summary.needsEmail}`);
  console.log(`  skipped:   ${summary.skipped}`);

  const outside = summary.prospects.filter((p) => !seedDomains.has(p.domain));
  console.log(`\nProspects outside seed catalog: ${outside.length}`);
  for (const p of outside.slice(0, 25)) {
    console.log(`  - ${p.businessName} · ${p.domain} · ${p.city || "?"} · ${p.sourceKind || "?"}`);
  }

  const liveSent = await prisma.acquisitionMessage.count({
    where: { dryRun: false, status: { in: ["SENT", "DELIVERED"] } },
  });
  console.log(`\nLive acquisition emails sent this run: 0 (script does not send)`);
  console.log(`Existing live SENT/DELIVERED in DB (informational): ${liveSent}`);

  if (summary.attempted < 1 && summary.source.startsWith("osm")) {
    console.error("FAIL: continuous discovery returned nothing");
    process.exit(1);
  }

  console.log("\nDRY RUN COMPLETE");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
