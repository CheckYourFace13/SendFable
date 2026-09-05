/**
 * Production conversion optimization status.
 * npx tsx scripts/vps-conversion-status.ts
 */
import { prisma } from "../src/lib/prisma";
import { getConversionOptimizationSnapshot } from "../src/lib/acquisition/conversion-optimize";
import {
  canRampGiven,
  getStageCaps,
  ratesOverDays,
} from "../src/lib/acquisition/ramp";
import { acquisitionAutoRamp } from "../src/lib/acquisition/flags";
import { ensurePipelineControl } from "../src/lib/acquisition/caps";

async function main() {
  const snap = await getConversionOptimizationSnapshot();
  const caps = await getStageCaps();
  const rates = await ratesOverDays(7);
  const control = await ensurePipelineControl();
  const entered = control.stageEnteredAt || control.updatedAt;
  const bizDays = Math.max(
    0,
    Math.floor((Date.now() - entered.getTime()) / 86400000)
  );
  const ramp = canRampGiven({
    autoRamp: acquisitionAutoRamp(),
    stage: caps.stage,
    businessDaysInStage: bizDays,
    sent: rates.sent,
    bounceRate: rates.bounceRate,
    complaintRate: rates.complaintRate,
    unsubRate: rates.unsubRate,
  });
  const deliveredTotal = await prisma.acquisitionMessage.count({
    where: { dryRun: false, deliveredAt: { not: null } },
  });
  const clicks = await prisma.acquisitionMessage.count({
    where: { dryRun: false, clickedAt: { not: null } },
  });
  const replies = await prisma.acquisitionEvent.count({ where: { type: "reply" } });
  const signups = await prisma.acquisitionEvent.count({
    where: { type: "signup_matched" },
  });
  const firstSends = await prisma.acquisitionProspect.count({
    where: { firstSendAt: { not: null } },
  });
  const paid = await prisma.acquisitionProspect.count({
    where: { paidAt: { not: null } },
  });
  console.log(
    JSON.stringify(
      {
        deliveredTotal,
        clicks,
        replies,
        signups,
        firstSends,
        paid,
        stage: caps.stage,
        nextRamp: ramp.eligible
          ? `eligible → ${Math.min(4, caps.stage + 1)}`
          : ramp.reason,
        bestSegment: snap.bestSegment
          ? `${snap.bestSegment.vertical} + ${snap.bestSegment.signal}`
          : null,
        autoOptStatus: snap.status,
        copyVersion: snap.currentCopyVersion,
        nextAuto: snap.nextAutoOptimization,
        sampleNote: snap.sampleNote,
        last25: snap.last25,
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
