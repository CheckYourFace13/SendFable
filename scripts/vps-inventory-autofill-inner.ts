/**
 * Production inventory status + forced autofill bootstrap.
 * Run inside worker: npx tsx scripts/vps-inventory-autofill-inner.ts
 */
import { prisma } from "../src/lib/prisma";
import {
  getInventoryHealth,
  inventoryTargetForStage,
} from "../src/lib/acquisition/discovery/inventory";
import { runDiscovery } from "../src/lib/acquisition/discovery/discover";
import { autoApproveAndQueue } from "../src/lib/acquisition/auto-approve";
import { checkAcquisitionDeliveryAttribution } from "../src/lib/acquisition/delivery-health";
import { getStageCaps } from "../src/lib/acquisition/ramp";
import { acquisitionDiscoveryEnabled } from "../src/lib/acquisition/flags";

async function main() {
  const caps = await getStageCaps();
  const targets = inventoryTargetForStage(caps.stage);
  const before = await getInventoryHealth();

  console.log(
    JSON.stringify(
      {
        phase: "before",
        stage: caps.stage,
        newPerDay: caps.newPerDay,
        status: before.status,
        qualifiedUnsent: before.qualifiedUnsent,
        queuedUnsent: before.queuedUnsent,
        sendableInventory: before.sendableInventory,
        daysOfInventory: Number(before.daysOfInventory.toFixed(2)),
        targetMin: targets.targetMin,
        preferredTarget: targets.preferredTarget,
        attemptsToday: before.attemptsToday,
        dailyCeiling: before.dailyCeiling,
        discoveryEnabled: acquisitionDiscoveryEnabled(),
      },
      null,
      2
    )
  );

  let batches = 0;
  let attempted = 0;
  let newDomains = 0;
  let qualified = 0;
  let approved = 0;

  if (acquisitionDiscoveryEnabled() && before.sendableInventory < before.preferredTarget) {
    const maxBatches = before.status === "STARVED" ? 5 : 4;
    for (let i = 0; i < maxBatches; i++) {
      const health = await getInventoryHealth();
      if (health.sendableInventory >= health.preferredTarget) break;
      if (!health.canDiscoverMoreToday) break;
      const remaining = health.dailyCeiling - health.attemptsToday;
      if (remaining <= 0) break;
      const limit =
        health.status === "STARVED"
          ? Math.min(40, remaining)
          : Math.min(30, remaining);
      const disc = await runDiscovery({
        limit,
        enrich: true,
        marketCount: health.status === "STARVED" ? 5 : 4,
        marketOffset: i + new Date().getUTCHours() + Math.floor(Date.now() / 60000),
      });
      batches++;
      attempted += disc.attempted;
      newDomains += disc.newDomains;
      qualified += disc.qualified;
      const ap = await autoApproveAndQueue({ limit: 30 });
      approved += ap.approved;
      if (disc.newDomains === 0 && disc.qualified === 0 && disc.upserted === 0) break;
    }
  }

  const after = await getInventoryHealth();
  const delivery = await checkAcquisitionDeliveryAttribution();

  console.log(
    JSON.stringify(
      {
        phase: "after",
        autofill: { batches, attempted, newDomains, qualified, approved },
        inventory: {
          status: after.status,
          qualifiedUnsent: after.qualifiedUnsent,
          queuedUnsent: after.queuedUnsent,
          sendableInventory: after.sendableInventory,
          daysOfInventory: Number(after.daysOfInventory.toFixed(2)),
          attemptsToday: after.attemptsToday,
        },
        delivery: {
          pendingStuckSentGt4h: delivery.pending,
          alerted: delivery.alerted,
        },
        autofillPass:
          after.sendableInventory >= after.targetMin ||
          (batches > 0 && after.attemptsToday > 0),
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
