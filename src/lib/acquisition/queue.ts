/**
 * Reconcile queued acquisition drafts so the current Autopilot A/B
 * is not starved by older copy. Does not delete prospects.
 */

import { prisma } from "@/lib/prisma";
import { ACQUISITION_AUTOPILOT_LANDING } from "@/lib/acquisition/personalize";
import { draftMessageForProspect } from "@/lib/acquisition/send";
import {
  orderSendCandidates,
  planStaleInitial,
  SENT_INITIAL_STATUSES,
  stableAutopilotVariant,
  WEBSITE_DEMO_COPY_VERSION,
  type QueueMessage,
} from "@/lib/acquisition/queue-policy";

export async function reconcileStaleInitialDrafts(limit = 40): Promise<{
  regenerated: number;
  retired: number;
  cancelled: number;
}> {
  const drafts = await prisma.acquisitionMessage.findMany({
    where: {
      dryRun: false,
      step: "INITIAL",
      status: { in: ["DRAFT", "SCHEDULED"] },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      prospectId: true,
      step: true,
      subject: true,
      ctaPath: true,
      copyVersion: true,
      prospect: { select: { status: true } },
    },
  });

  if (!drafts.length) return { regenerated: 0, retired: 0, cancelled: 0 };

  const sent = await prisma.acquisitionMessage.findMany({
    where: {
      prospectId: { in: drafts.map((d) => d.prospectId) },
      step: "INITIAL",
      status: { in: [...SENT_INITIAL_STATUSES] },
    },
    select: { prospectId: true },
  });
  const sentIds = new Set(sent.map((s) => s.prospectId));

  let regenerated = 0;
  let retired = 0;
  let cancelled = 0;

  for (const draft of drafts) {
    const plan = planStaleInitial(draft, sentIds.has(draft.prospectId));
    if (plan === "keep") continue;

    if (plan === "retire_duplicate") {
      await prisma.acquisitionMessage.update({
        where: { id: draft.id },
        data: { status: "CANCELLED", error: "retired_duplicate_initial" },
      });
      await prisma.acquisitionEvent.create({
        data: {
          prospectId: draft.prospectId,
          type: "initial_retired_duplicate",
          meta: { messageId: draft.id },
        },
      });
      retired++;
      continue;
    }

    const variant = stableAutopilotVariant(draft.prospectId);
    const result = await draftMessageForProspect(draft.prospectId, "INITIAL", {
      dryRun: false,
      copyVersion: variant,
      landingPath: ACQUISITION_AUTOPILOT_LANDING,
      allowScheduledRewrite: true,
    });

    if (!result.ok) {
      await prisma.acquisitionMessage.update({
        where: { id: draft.id },
        data: { status: "CANCELLED", error: `stale_${result.reason || "regenerate_failed"}` },
      });
      if (draft.prospect.status === "QUEUED") {
        await prisma.acquisitionProspect.update({
          where: { id: draft.prospectId },
          data: { status: "QUALIFIED" },
        });
      }
      cancelled++;
      continue;
    }

    await prisma.acquisitionEvent.create({
      data: {
        prospectId: draft.prospectId,
        type: "initial_regenerated_to_current",
        meta: {
          messageId: draft.id,
          previousSubject: draft.subject.slice(0, 180),
          copyVersion: variant,
        },
      },
    });
    regenerated++;
  }

  return { regenerated, retired, cancelled };
}

export async function loadSendCandidates(limit = 30) {
  const [initials, followUps] = await Promise.all([
    prisma.acquisitionMessage.findMany({
      where: {
        dryRun: false,
        status: { in: ["DRAFT", "SCHEDULED"] },
        step: "INITIAL",
        ctaPath: ACQUISITION_AUTOPILOT_LANDING,
        NOT: { copyVersion: WEBSITE_DEMO_COPY_VERSION },
      },
      include: { prospect: true },
      orderBy: { createdAt: "asc" },
      take: 40,
    }),
    prisma.acquisitionMessage.findMany({
      where: {
        dryRun: false,
        status: { in: ["DRAFT", "SCHEDULED"] },
        step: { in: ["FOLLOW_UP_1", "FOLLOW_UP_2"] },
      },
      include: { prospect: true },
      orderBy: { createdAt: "asc" },
      take: 15,
    }),
  ]);

  const ordered = orderSendCandidates(
    [...initials, ...followUps].map((m) => ({
      ...m,
      createdAt: m.createdAt,
    })) as Array<QueueMessage & (typeof initials)[number]>
  );
  return ordered.slice(0, limit);
}

export async function loadWebsiteDemoCandidates(limit = 2) {
  return prisma.acquisitionMessage.findMany({
    where: {
      dryRun: false,
      status: { in: ["DRAFT", "SCHEDULED"] },
      step: "INITIAL",
      copyVersion: WEBSITE_DEMO_COPY_VERSION,
    },
    include: { prospect: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}
