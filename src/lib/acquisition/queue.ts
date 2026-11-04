/**
 * Reconcile queued acquisition drafts so the current Autopilot A/B
 * is not starved by older copy. Does not delete prospects.
 */

import { prisma } from "@/lib/prisma";
import { draftMessageForProspect } from "@/lib/acquisition/send";
import {
  isCurrentAutopilotInitial,
  orderSendCandidates,
  planStaleInitial,
  SENT_INITIAL_STATUSES,
  WEBSITE_DEMO_COPY_VERSION,
  type QueueMessage,
} from "@/lib/acquisition/queue-policy";
import { UTILITY_SIGNUP_COPY_VERSION, UTILITY_SIGNUP_LANDING } from "@/lib/try-signup/config";

export async function reconcileStaleInitialDrafts(limit = 40): Promise<{
  regenerated: number;
  retired: number;
  cancelled: number;
}> {
  // Only pull non-current drafts. Taking "oldest N of all drafts" stalls once
  // the oldest batch is already utility_signup (plan=keep) while newer Autopilot
  // drafts remain unsent.
  const candidates = await prisma.acquisitionMessage.findMany({
    where: {
      dryRun: false,
      step: "INITIAL",
      status: { in: ["DRAFT", "SCHEDULED"] },
      NOT: {
        AND: [
          { copyVersion: UTILITY_SIGNUP_COPY_VERSION },
          { ctaPath: { startsWith: UTILITY_SIGNUP_LANDING } },
        ],
      },
    },
    orderBy: { createdAt: "asc" },
    take: Math.max(limit * 3, 120),
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

  const drafts = candidates
    .filter((d) => !isCurrentAutopilotInitial(d))
    .slice(0, limit);

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

    const result = await draftMessageForProspect(draft.prospectId, "INITIAL", {
      dryRun: false,
      copyVersion: UTILITY_SIGNUP_COPY_VERSION,
      landingPath: UTILITY_SIGNUP_LANDING,
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
          copyVersion: UTILITY_SIGNUP_COPY_VERSION,
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
        NOT: { copyVersion: WEBSITE_DEMO_COPY_VERSION },
      },
      include: { prospect: true },
      orderBy: { createdAt: "asc" },
      take: 80,
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

  // Prefer Autopilot landing drafts, but also allow utility_signup / try-builder
  // currents that isCurrentAutopilotInitial accepts (orderSendCandidates filters).
  const currentInitials = initials.filter((m) => isCurrentAutopilotInitial(m));
  const ordered = orderSendCandidates(
    [...currentInitials, ...followUps].map((m) => ({
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
