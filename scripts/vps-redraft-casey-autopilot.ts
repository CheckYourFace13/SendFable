/**
 * Re-draft pending INITIAL Casey messages onto Autopilot pitch + landing.
 * Gate: REDRAFT_CASEY_AUTOPILOT=1
 */
import { prisma } from "../src/lib/prisma";
import { draftMessageForProspect } from "../src/lib/acquisition/send";

async function main() {
  if (process.env.REDRAFT_CASEY_AUTOPILOT !== "1") {
    throw new Error("Set REDRAFT_CASEY_AUTOPILOT=1");
  }
  const pending = await prisma.acquisitionMessage.findMany({
    where: { step: "INITIAL", status: { in: ["DRAFT", "SCHEDULED"] }, dryRun: false },
    select: { id: true, prospectId: true, status: true, bodyText: true, ctaPath: true },
    take: 200,
  });
  let redrafted = 0;
  let skipped = 0;
  for (const m of pending) {
    const already =
      /Nothing goes out unless you approve/i.test(m.bodyText || "") &&
      m.ctaPath === "/automated-email-marketing";
    if (already) {
      skipped++;
      continue;
    }
    // Reset to DRAFT so draftMessageForProspect can overwrite
    await prisma.acquisitionMessage.update({
      where: { id: m.id },
      data: { status: "DRAFT" },
    });
    // Clear landing so default Autopilot path applies on draft
    await prisma.acquisitionProspect.update({
      where: { id: m.prospectId },
      data: { landingPagePath: "/automated-email-marketing" },
    });
    const r = await draftMessageForProspect(m.prospectId, "INITIAL");
    if (r.ok) {
      // Restore SCHEDULED if it was queued
      if (m.status === "SCHEDULED") {
        await prisma.acquisitionMessage.update({
          where: { id: r.messageId! },
          data: { status: "SCHEDULED" },
        });
      }
      redrafted++;
      console.error(`REDRAFT ${m.id} → ${r.messageId}`);
    } else {
      console.error(`FAIL ${m.id} ${r.reason}`);
    }
  }
  console.log(JSON.stringify({ pending: pending.length, redrafted, skipped }, null, 2));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
