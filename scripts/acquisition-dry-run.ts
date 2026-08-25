/**
 * Acquisition dry-run — discovers/enriches ≥20 seed businesses, drafts messages,
 * NEVER sends live email (SENDING stays off; all drafts marked dryRun).
 *
 * Usage: npx tsx scripts/acquisition-dry-run.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { runDiscovery } from "../src/lib/acquisition/discovery/discover";
import { queueQualifiedDrafts } from "../src/lib/acquisition/send";
import { reportAcquisitionFlags } from "../src/lib/acquisition/flags";
import { ACQUISITION_SEED_CATALOG } from "../src/lib/acquisition/discovery/seed-catalog";

async function main() {
  console.log("=== SendFable Acquisition Dry Run ===\n");
  console.log("Flags:", reportAcquisitionFlags());
  console.log(`Seed catalog size: ${ACQUISITION_SEED_CATALOG.length}`);
  console.log("Live sends: FORBIDDEN in this script.\n");

  // force bypasses discovery flag so we can QA offline of production flags
  const summary = await runDiscovery({
    force: true,
    enrich: true,
    limit: 30,
  });

  console.log("Discovery:");
  console.log(`  attempted: ${summary.attempted}`);
  console.log(`  upserted:  ${summary.upserted}`);
  console.log(`  qualified: ${summary.qualified}`);
  console.log(`  needsEmail:${summary.needsEmail}`);
  console.log(`  skipped:   ${summary.skipped}`);

  const drafted = await queueQualifiedDrafts({ limit: 30, dryRun: true });
  console.log(`\nDry-run drafts queued: ${drafted}`);

  const liveSent = await prisma.acquisitionMessage.count({
    where: { dryRun: false, status: { in: ["SENT", "DELIVERED"] } },
  });
  console.log(`Live acquisition emails sent (should be 0): ${liveSent}`);

  console.log("\nSample prospects (no emails printed in full):");
  for (const p of summary.prospects.slice(0, 12)) {
    const emailBit = p.hasEmail ? "email:yes" : "email:no";
    console.log(
      `  - ${p.businessName} (${p.city || "?"}) · ${p.category} · score ${p.score} · ${p.status} · ${emailBit}`
    );
  }

  if (summary.attempted < 20) {
    console.error("FAIL: attempted fewer than 20 seeds");
    process.exit(1);
  }
  if (liveSent > 0) {
    console.error("FAIL: live sends detected during dry-run");
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
