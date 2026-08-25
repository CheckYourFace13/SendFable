import { prisma } from "@/lib/prisma";
import { acquisitionAutoApprove, acquisitionSendingEnabled } from "@/lib/acquisition/flags";
import { runQualityGate } from "@/lib/acquisition/quality-gate";
import { draftMessageForProspect } from "@/lib/acquisition/send";
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

  const rows = await prisma.acquisitionProspect.findMany({
    where: {
      status: { in: ["QUALIFIED", "DISCOVERED"] },
      contactEmail: { not: null },
      personalizationClaim: { not: null },
      personalizationEvidence: { not: null },
      personalizationSourceUrl: { not: null },
      activeWebsite: true,
    },
    orderBy: { score: "desc" },
    take: opts?.limit ?? 40,
  });

  let approved = 0;
  let skipped = 0;
  const reasons: Record<string, number> = {};

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
