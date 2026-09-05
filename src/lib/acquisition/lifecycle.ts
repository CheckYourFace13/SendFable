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
  const rows = await prisma.acquisitionProspect.findMany({
    where: { signedUpUserId: userId, paidAt: null },
    select: { id: true },
  });
  if (!rows.length) return;
  await prisma.acquisitionProspect.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data: { status: "PAID", paidAt: new Date() },
  });
  for (const r of rows) {
    await prisma.acquisitionEvent.create({
      data: { prospectId: r.id, type: "paid", meta: { userId } },
    });
  }
}

export async function markAcquisitionFirstSendForUser(userId: string): Promise<void> {
  const rows = await prisma.acquisitionProspect.findMany({
    where: {
      signedUpUserId: userId,
      firstSendAt: null,
      status: { in: ["SIGNED_UP", "PAID"] },
    },
    select: { id: true },
  });
  if (!rows.length) return;
  await prisma.acquisitionProspect.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data: { firstSendAt: new Date() },
  });
  for (const r of rows) {
    await prisma.acquisitionEvent.create({
      data: { prospectId: r.id, type: "first_send", meta: { userId } },
    });
  }
}

export async function markAcquisitionEmailVerifiedForUser(userId: string): Promise<void> {
  const rows = await prisma.acquisitionProspect.findMany({
    where: { signedUpUserId: userId, emailVerifiedAt: null },
    select: { id: true },
  });
  if (!rows.length) return;
  await prisma.acquisitionProspect.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data: { emailVerifiedAt: new Date() },
  });
  for (const r of rows) {
    await prisma.acquisitionEvent.create({
      data: { prospectId: r.id, type: "email_verified", meta: { userId } },
    });
  }
}

export async function markAcquisitionFirstCampaignForUser(userId: string): Promise<void> {
  const rows = await prisma.acquisitionProspect.findMany({
    where: {
      signedUpUserId: userId,
      firstCampaignAt: null,
      status: { in: ["SIGNED_UP", "PAID"] },
    },
    select: { id: true },
  });
  if (!rows.length) return;
  await prisma.acquisitionProspect.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data: { firstCampaignAt: new Date() },
  });
  for (const r of rows) {
    await prisma.acquisitionEvent.create({
      data: { prospectId: r.id, type: "first_campaign", meta: { userId } },
    });
  }
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
  /** Optional SES mail tags for fallback attribution */
  tags?: Record<string, string[] | string | undefined>;
}): Promise<boolean> {
  const normalizedId = opts.sesMessageId.replace(/^<|>$/g, "").trim();
  let msg = await prisma.acquisitionMessage.findFirst({
    where: {
      OR: [
        { sesMessageId: opts.sesMessageId },
        { sesMessageId: normalizedId },
        { sesMessageId: `<${normalizedId}>` },
      ],
    },
  });

  // Fallback: match by acquisition tags (kind + prospectId) when MessageId casing/format drifts
  if (!msg && opts.tags) {
    const kind = tagValue(opts.tags, "kind");
    const prospectId = tagValue(opts.tags, "prospectId");
    if (kind === "acquisition" && prospectId) {
      msg = await prisma.acquisitionMessage.findFirst({
        where: {
          prospectId: { startsWith: prospectId },
          dryRun: false,
          sentAt: { not: null },
          status: { in: ["SENT", "DELIVERED", "BOUNCED", "COMPLAINED"] },
        },
        orderBy: { sentAt: "desc" },
      });
    }
  }

  // Fallback: recipient email + recent SENT acquisition message
  if (!msg && opts.emails?.length) {
    const emails = opts.emails.map((e) => e.toLowerCase());
    const since = new Date(Date.now() - 14 * 24 * 3600_000);
    const candidates = await prisma.acquisitionMessage.findMany({
      where: {
        dryRun: false,
        sentAt: { gte: since },
        status: { in: ["SENT", "DELIVERED"] },
        prospect: { contactEmail: { in: emails, mode: "insensitive" } },
      },
      orderBy: { sentAt: "desc" },
      take: 5,
    });
    msg = candidates[0] || null;
  }

  if (!msg) return false;

  // Backfill canonical MessageId if we matched via fallback
  if (msg.sesMessageId !== normalizedId && normalizedId) {
    await prisma.acquisitionMessage.update({
      where: { id: msg.id },
      data: { sesMessageId: normalizedId },
    });
  }

  if (opts.eventType === "Delivery") {
    await prisma.acquisitionMessage.update({
      where: { id: msg.id },
      data: { status: "DELIVERED", deliveredAt: new Date() },
    });
    await prisma.acquisitionEvent.create({
      data: {
        prospectId: msg.prospectId,
        type: "delivered",
        meta: { sesMessageId: normalizedId, messageId: msg.id },
      },
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
      await prisma.acquisitionEvent.create({
        data: {
          prospectId: msg.prospectId,
          type: "bounced",
          meta: { sesMessageId: normalizedId, bounceType: opts.bounceType || null },
        },
      });
    }
    return true;
  }

  if (opts.eventType === "Complaint") {
    await prisma.acquisitionMessage.update({
      where: { id: msg.id },
      data: { status: "COMPLAINED", complaintAt: new Date() },
    });
    await suppressProspect(msg.prospectId, "COMPLAINT", "complaint");
    await prisma.acquisitionEvent.create({
      data: {
        prospectId: msg.prospectId,
        type: "complained",
        meta: { sesMessageId: normalizedId },
      },
    });
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

function tagValue(
  tags: Record<string, string[] | string | undefined>,
  key: string
): string | undefined {
  const raw = tags[key] ?? tags[key.toLowerCase()];
  if (Array.isArray(raw)) return raw[0];
  return typeof raw === "string" ? raw : undefined;
}
