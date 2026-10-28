import { prisma } from "@/lib/prisma";
import { isSuppressed } from "@/lib/acquisition/suppression";
import { canSendAnyToday } from "@/lib/acquisition/caps";
import { defaultProspectTimeZone, isWithinSendWindow } from "@/lib/acquisition/schedule";
import { draftMessageForProspect, sendAcquisitionMessage } from "@/lib/acquisition/send";
import {
  scheduleTryFollowUpAt,
  UTILITY_SIGNUP_COPY_VERSION,
  UTILITY_SIGNUP_LANDING,
} from "@/lib/try-signup/config";

export async function markTryIntent(opts: {
  token: string;
  event: "builder_started" | "builder_previewed" | "activation_clicked" | "signup_started";
}): Promise<void> {
  const draft = await prisma.trySignupDraft.findUnique({ where: { token: opts.token } });
  if (!draft || draft.claimedAt) return;
  const events = (draft.events && typeof draft.events === "object" ? draft.events : {}) as Record<
    string,
    string
  >;
  if (!events[opts.event]) events[opts.event] = new Date().toISOString();

  const shouldFollow =
    !draft.followUpSentAt &&
    !draft.followUpCancelledAt &&
    (opts.event === "activation_clicked" ||
      opts.event === "builder_previewed" ||
      opts.event === "signup_started");

  let followUpAt = draft.followUpAt;
  if (shouldFollow && !followUpAt && draft.prospectId) {
    const prospect = await prisma.acquisitionProspect.findUnique({
      where: { id: draft.prospectId },
      select: { state: true, status: true },
    });
    const tz = defaultProspectTimeZone(prospect?.state);
    followUpAt = scheduleTryFollowUpAt(new Date(), tz);
    if (prospect && ["CONTACTED", "FOLLOW_UP_1", "QUEUED"].includes(prospect.status)) {
      await prisma.acquisitionProspect.update({
        where: { id: draft.prospectId },
        data: { nextFollowUpAt: followUpAt },
      });
      await prisma.acquisitionMessage.updateMany({
        where: {
          prospectId: draft.prospectId,
          step: { in: ["FOLLOW_UP_1", "FOLLOW_UP_2"] },
          status: { in: ["DRAFT", "SCHEDULED"] },
        },
        data: { status: "CANCELLED", error: "replaced_by_try_followup" },
      });
    }
    await prisma.acquisitionEvent.create({
      data: {
        prospectId: draft.prospectId,
        type: opts.event,
        meta: { token: draft.token.slice(0, 8) },
      },
    });
  }

  await prisma.trySignupDraft.update({
    where: { id: draft.id },
    data: { events, followUpAt },
  });
}

export async function cancelTryFollowUpsForProspect(prospectId: string): Promise<void> {
  await prisma.trySignupDraft.updateMany({
    where: { prospectId, claimedAt: null, followUpSentAt: null },
    data: { followUpCancelledAt: new Date(), followUpAt: null },
  });
}

export async function sendDueTryFollowUps(now = new Date()): Promise<number> {
  if (!(await canSendAnyToday())) return 0;
  const due = await prisma.trySignupDraft.findMany({
    where: {
      followUpAt: { lte: now },
      followUpSentAt: null,
      followUpCancelledAt: null,
      claimedAt: null,
      prospectId: { not: null },
    },
    take: 10,
  });
  let sent = 0;
  for (const draft of due) {
    if (!draft.prospectId) continue;
    const prospect = await prisma.acquisitionProspect.findUnique({
      where: { id: draft.prospectId },
    });
    if (!prospect?.contactEmail) continue;
    if (["SIGNED_UP", "PAID", "UNSUBSCRIBED", "COMPLAINT", "REJECTED"].includes(prospect.status)) {
      await prisma.trySignupDraft.update({
        where: { id: draft.id },
        data: { followUpCancelledAt: new Date(), followUpAt: null },
      });
      continue;
    }
    const supp = await isSuppressed(prospect.contactEmail, prospect.domain);
    if (supp.suppressed) {
      await prisma.trySignupDraft.update({
        where: { id: draft.id },
        data: { followUpCancelledAt: new Date(), followUpAt: null },
      });
      continue;
    }
    const tz = defaultProspectTimeZone(prospect.state);
    if (!isWithinSendWindow(now, tz).ok) continue;

    const drafted = await draftMessageForProspect(prospect.id, "FOLLOW_UP_1", {
      dryRun: false,
      copyVersion: UTILITY_SIGNUP_COPY_VERSION,
      landingPath: `${UTILITY_SIGNUP_LANDING}?try=${encodeURIComponent(draft.token)}`,
    });
    if (!drafted.ok || !drafted.messageId) continue;
    const result = await sendAcquisitionMessage(drafted.messageId);
    if (!result.ok) continue;
    await prisma.trySignupDraft.update({
      where: { id: draft.id },
      data: { followUpSentAt: new Date(), followUpAt: null },
    });
    sent++;
  }
  return sent;
}
