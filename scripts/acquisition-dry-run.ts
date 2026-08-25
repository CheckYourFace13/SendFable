/**
 * Acquisition dry-run — discovers/enriches ≥20 seed businesses, drafts messages,
 * NEVER sends live email (SENDING stays off; all drafts marked dryRun).
 *
 * Usage: npx tsx scripts/acquisition-dry-run.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { runDiscovery } from "../src/lib/acquisition/discovery/discover";
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

  const { autoApproveAndQueue } = await import("../src/lib/acquisition/auto-approve");
  // Force auto-approve path for dry-run inspection without enabling sending
  const prevAA = process.env.SENDFABLE_ACQUISITION_AUTO_APPROVE;
  const prevE = process.env.SENDFABLE_ACQUISITION_ENABLED;
  process.env.SENDFABLE_ACQUISITION_ENABLED = "true";
  process.env.SENDFABLE_ACQUISITION_AUTO_APPROVE = "true";
  const drafted = await autoApproveAndQueue({ limit: 30 });
  if (prevAA === undefined) delete process.env.SENDFABLE_ACQUISITION_AUTO_APPROVE;
  else process.env.SENDFABLE_ACQUISITION_AUTO_APPROVE = prevAA;
  if (prevE === undefined) delete process.env.SENDFABLE_ACQUISITION_ENABLED;
  else process.env.SENDFABLE_ACQUISITION_ENABLED = prevE;

  console.log(`\nAuto-approve: ${drafted.approved} approved, ${drafted.skipped} skipped`);
  console.log("Skip reasons:", drafted.reasons);

  const liveSent = await prisma.acquisitionMessage.count({
    where: { dryRun: false, status: { in: ["SENT", "DELIVERED"] } },
  });
  console.log(`Live acquisition emails sent (should be 0): ${liveSent}`);

  console.log("\nSample prospects (no emails printed in full):");
  for (const p of summary.prospects.slice(0, 15)) {
    const emailBit = p.hasEmail ? "email:yes" : "email:no";
    console.log(
      `  - ${p.businessName} (${p.city || "?"}) · ${p.category} · score ${p.score} · ${p.status} · ${emailBit}`
    );
  }

  if (summary.attempted < 25) {
    console.error("FAIL: attempted fewer than 25 seeds");
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
