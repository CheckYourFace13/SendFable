import { prisma } from "@/lib/prisma";
import { normalizeDomain } from "@/lib/acquisition/normalize";
import { normalizeEmail } from "@/lib/utils";
import { suppressProspect } from "@/lib/acquisition/suppression";

/**
 * When a user signs up, stop outreach for matching email/domain and attribute.
 */
export async function matchSignupToAcquisition(opts: {
  userId: string;
  email: string;
}): Promise<{ matched: boolean; prospectId?: string }> {
  const email = normalizeEmail(opts.email);
  const domain = email.split("@")[1] || "";
  if (!domain) return { matched: false };

  const prospect =
    (await prisma.acquisitionProspect.findFirst({
      where: {
        OR: [{ contactEmail: email }, { domain: normalizeDomain(domain) }],
        status: {
          notIn: ["SIGNED_UP", "PAID", "UNSUBSCRIBED", "COMPLAINT", "REJECTED"],
        },
      },
      orderBy: { discoveredAt: "desc" },
    })) || null;

  if (!prospect) return { matched: false };

  await prisma.acquisitionProspect.update({
    where: { id: prospect.id },
    data: {
      status: "SIGNED_UP",
      signedUpUserId: opts.userId,
      signupAt: new Date(),
      nextFollowUpAt: null,
    },
  });

  await prisma.acquisitionMessage.updateMany({
    where: {
      prospectId: prospect.id,
      status: { in: ["DRAFT", "SCHEDULED"] },
    },
    data: { status: "CANCELLED" },
  });

  await prisma.acquisitionEvent.create({
    data: {
      prospectId: prospect.id,
      type: "signup_matched",
      meta: {
        userId: opts.userId,
        // store domain only — no extra PII in event beyond what we already have
        domain: prospect.domain,
      },
    },
  });

  return { matched: true, prospectId: prospect.id };
}

export async function markAcquisitionPaidForUser(userId: string): Promise<void> {
  await prisma.acquisitionProspect.updateMany({
    where: { signedUpUserId: userId, status: "SIGNED_UP" },
    data: { status: "PAID", paidAt: new Date() },
  });
}

export async function markAcquisitionFirstSendForUser(userId: string): Promise<void> {
  await prisma.acquisitionProspect.updateMany({
    where: {
      signedUpUserId: userId,
      firstSendAt: null,
      status: { in: ["SIGNED_UP", "PAID"] },
    },
    data: { firstSendAt: new Date() },
  });
}

export type ReplyClass =
  | "POSITIVE"
  | "QUESTION"
  | "NOT_NOW"
  | "NOT_INTERESTED"
  | "UNSUBSCRIBE"
  | "OTHER";

export async function recordAcquisitionReply(opts: {
  prospectId: string;
  replyClass: ReplyClass;
}): Promise<void> {
  const status =
    opts.replyClass === "UNSUBSCRIBE"
      ? "UNSUBSCRIBED"
      : opts.replyClass === "NOT_INTERESTED"
        ? "NOT_INTERESTED"
        : opts.replyClass === "POSITIVE" || opts.replyClass === "QUESTION"
          ? "INTERESTED"
          : "REPLIED";

  if (status === "UNSUBSCRIBED" || status === "NOT_INTERESTED") {
    await suppressProspect(opts.prospectId, status, opts.replyClass);
  } else {
    await prisma.acquisitionProspect.update({
      where: { id: opts.prospectId },
      data: {
        status,
        replyClass: opts.replyClass,
        nextFollowUpAt: null,
      },
    });
    await prisma.acquisitionMessage.updateMany({
      where: {
        prospectId: opts.prospectId,
        status: { in: ["DRAFT", "SCHEDULED"] },
      },
      data: { status: "CANCELLED" },
    });
  }

  await prisma.acquisitionEvent.create({
    data: {
      prospectId: opts.prospectId,
      type: "reply",
      meta: { replyClass: opts.replyClass },
    },
  });
}

export async function handleAcquisitionSesEvent(opts: {
  sesMessageId: string;
  eventType: string;
  bounceType?: string;
  emails?: string[];
}): Promise<boolean> {
  const msg = await prisma.acquisitionMessage.findFirst({
    where: {
      OR: [
        { sesMessageId: opts.sesMessageId },
        { sesMessageId: opts.sesMessageId.replace(/^<|>$/g, "") },
      ],
    },
  });
  if (!msg) return false;

  if (opts.eventType === "Delivery") {
    await prisma.acquisitionMessage.update({
      where: { id: msg.id },
      data: { status: "DELIVERED", deliveredAt: new Date() },
    });
    return true;
  }

  if (opts.eventType === "Bounce") {
    const permanent =
      !opts.bounceType ||
      opts.bounceType === "Permanent" ||
      opts.bounceType === "Undetermined";
    if (permanent) {
      await prisma.acquisitionMessage.update({
        where: { id: msg.id },
        data: { status: "BOUNCED", bounceAt: new Date() },
      });
      await suppressProspect(msg.prospectId, "BOUNCED", "hard_bounce");
    }
    return true;
  }

  if (opts.eventType === "Complaint") {
    await prisma.acquisitionMessage.update({
      where: { id: msg.id },
      data: { status: "COMPLAINED", complaintAt: new Date() },
    });
    await suppressProspect(msg.prospectId, "COMPLAINT", "complaint");
    try {
      const { alertOwnerException } = await import("@/lib/acquisition/notify");
      const { hardPauseAcquisition } = await import("@/lib/acquisition/ramp");
      await hardPauseAcquisition("complaint_received");
      await alertOwnerException(
        "SendFable acquisition complaint received",
        `An acquisition outreach complaint was recorded. Pipeline hard-paused.\nMessage: ${msg.id}\nProspect: ${msg.prospectId}`
      );
    } catch {
      /* ignore */
    }
    return true;
  }

  return true;
}
