import { prisma } from "@/lib/prisma";
import { acquisitionAutoApprove, acquisitionSendingEnabled } from "@/lib/acquisition/flags";
import { runQualityGate } from "@/lib/acquisition/quality-gate";
import { draftMessageForProspect, draftWebsiteDemoForProspect } from "@/lib/acquisition/send";
import { websiteDemoDraftRoom } from "@/lib/acquisition/caps";
import {
  isExistingCustomerDomainOrEmail,
  isSuppressed,
} from "@/lib/acquisition/suppression";

/**
 * Auto-approve QUALIFIED prospects that pass the autonomous quality gate.
 * Uncertain prospects are skipped (left QUALIFIED/NEEDS_EMAIL) — never queued for manual review.
 */
export async function autoApproveAndQueue(opts?: { limit?: number }): Promise<{
  approved: number;
  skipped: number;
  reasons: Record<string, number>;
}> {
  if (!acquisitionAutoApprove()) {
    return { approved: 0, skipped: 0, reasons: { auto_approve_off: 1 } };
  }

  const readyWhere = {
    contactEmail: { not: null },
    personalizationClaim: { not: null },
    personalizationEvidence: { not: null },
    personalizationSourceUrl: { not: null },
    activeWebsite: true,
  } as const;
  const limit = opts?.limit ?? 40;
  // QUALIFIED first. High-score DISCOVERED rows often fail email-domain
  // match and used to occupy the entire sample, starving demo + Casey drafts.
  const qualified = await prisma.acquisitionProspect.findMany({
    where: { status: "QUALIFIED", ...readyWhere },
    orderBy: { score: "desc" },
    take: limit,
  });
  const discoveredRoom = Math.max(0, limit - qualified.length);
  const discovered =
    discoveredRoom > 0
      ? await prisma.acquisitionProspect.findMany({
          where: { status: "DISCOVERED", ...readyWhere },
          orderBy: { score: "desc" },
          take: discoveredRoom,
        })
      : [];
  const rows = [...qualified, ...discovered];

  let approved = 0;
  let skipped = 0;
  const reasons: Record<string, number> = {};
  let demoRoom = await websiteDemoDraftRoom();
  let demoAttempts = 0;
  const MAX_DEMO_ATTEMPTS = 6;

  for (const p of rows) {
    if (await isExistingCustomerDomainOrEmail(p.contactEmail, p.domain)) {
      skipped++;
      reasons.customer = (reasons.customer || 0) + 1;
      continue;
    }
    const supp = await isSuppressed(p.contactEmail, p.domain);
    if (supp.suppressed) {
      skipped++;
      reasons.suppressed = (reasons.suppressed || 0) + 1;
      continue;
    }

    const gate = await runQualityGate(p, { autonomous: true, requireFrom: false });
    if (!gate.ok) {
      skipped++;
      for (const f of gate.failures) {
        reasons[f] = (reasons[f] || 0) + 1;
      }
      continue;
    }

    if (demoRoom > 0 && demoAttempts < MAX_DEMO_ATTEMPTS) {
      demoAttempts++;
      const demo = await draftWebsiteDemoForProspect(p.id, {
        dryRun: !acquisitionSendingEnabled(),
      });
      if (demo.ok) {
        demoRoom--;
        await prisma.acquisitionProspect.update({
          where: { id: p.id },
          data: { status: "QUEUED", ownerApproved: true },
        });
        await prisma.acquisitionEvent.create({
          data: {
            prospectId: p.id,
            type: "auto_approved",
            meta: { score: p.score, track: "personalized_website_demo" },
          },
        });
        approved++;
        continue;
      }
      reasons[`demo_${demo.reason || "failed"}`] = (reasons[`demo_${demo.reason || "failed"}`] || 0) + 1;
    }

    const draft = await draftMessageForProspect(p.id, "INITIAL", {
      dryRun: !acquisitionSendingEnabled(),
    });
    if (!draft.ok) {
      skipped++;
      reasons[`draft_${draft.reason}`] = (reasons[`draft_${draft.reason}`] || 0) + 1;
      continue;
    }

    await prisma.acquisitionProspect.update({
      where: { id: p.id },
      data: {
        status: "QUEUED",
        ownerApproved: true, // informational only — auto path
      },
    });
    await prisma.acquisitionEvent.create({
      data: {
        prospectId: p.id,
        type: "auto_approved",
        meta: { score: p.score },
      },
    });
    approved++;
  }

  return { approved, skipped, reasons };
}
