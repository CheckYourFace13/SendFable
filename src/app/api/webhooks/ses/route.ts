import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleHardBounceOrComplaint } from "@/lib/suppression";
import { checkAutoPause } from "@/lib/campaign-send";
import { verifySnsSignature, type SnsSignedMessage } from "@/lib/sns-verify";

export const dynamic = "force-dynamic";

interface SnsEnvelope extends SnsSignedMessage {
  SubscribeURL?: string;
  Token?: string;
}

interface SesNotification {
  eventType?: string;
  notificationType?: string;
  mail?: {
    messageId?: string;
    tags?: Record<string, string[]>;
    commonHeaders?: { messageId?: string };
  };
  bounce?: {
    bounceType?: string;
    bouncedRecipients?: Array<{ emailAddress: string }>;
  };
  complaint?: {
    complainedRecipients?: Array<{ emailAddress: string }>;
  };
  delivery?: {
    recipients?: string[];
    timestamp?: string;
  };
}

async function alreadyProcessed(externalId: string): Promise<boolean> {
  try {
    await prisma.webhookEvent.create({
      data: { source: "sns", externalId, type: "ses" },
    });
    return false;
  } catch {
    return true;
  }
}

export async function POST(req: Request) {
  const raw = await req.text();
  let envelope: SnsEnvelope;
  try {
    envelope = JSON.parse(raw) as SnsEnvelope;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const verified = await verifySnsSignature(envelope);
  if (!verified.ok) {
    console.warn("[ses-webhook] SNS signature rejected", verified.error);
    return NextResponse.json({ error: "Invalid SNS signature" }, { status: 403 });
  }
  if (verified.skipped) {
    console.warn("[ses-webhook] SNS verify soft-fail", verified.error);
  }

  if (envelope.Type === "SubscriptionConfirmation" && envelope.SubscribeURL) {
    try {
      await fetch(envelope.SubscribeURL);
      console.log("[ses-webhook] SNS subscription confirmed");
    } catch (err) {
      console.error("[ses-webhook] confirm failed", err);
      return NextResponse.json({ error: "Confirm failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (envelope.Type === "UnsubscribeConfirmation") {
    return NextResponse.json({ ok: true });
  }

  if (envelope.Type !== "Notification") {
    return NextResponse.json({ ok: true });
  }

  if (await alreadyProcessed(envelope.MessageId)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  let note: SesNotification;
  try {
    note = JSON.parse(envelope.Message) as SesNotification;
  } catch {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  const eventType = note.eventType || note.notificationType || "";
  const messageId = note.mail?.messageId;
  if (!messageId) return NextResponse.json({ ok: true });

  const recipient = await prisma.campaignRecipient.findUnique({
    where: { sesMessageId: messageId },
    include: { campaign: true },
  });

  // Also try without angle brackets / casing variants
  const recip =
    recipient ||
    (await prisma.campaignRecipient.findFirst({
      where: {
        OR: [
          { sesMessageId: messageId },
          { sesMessageId: messageId.replace(/^<|>$/g, "") },
        ],
      },
      include: { campaign: true },
    }));

  if (!recip) {
    console.warn("[ses-webhook] unknown messageId", messageId, eventType);
    return NextResponse.json({ ok: true });
  }

  const workspaceId = recip.campaign.workspaceId;

  if (eventType === "Delivery") {
    if (!recip.deliveredAt) {
      await prisma.$transaction([
        prisma.campaignRecipient.update({
          where: { id: recip.id },
          data: { deliveredAt: new Date() },
        }),
        prisma.campaign.update({
          where: { id: recip.campaignId },
          data: { deliveredCount: { increment: 1 } },
        }),
      ]);
    }
    return NextResponse.json({ ok: true });
  }

  if (eventType === "Bounce") {
    const bounceType = note.bounce?.bounceType || "Permanent";
    const emails =
      note.bounce?.bouncedRecipients?.map((r) => r.emailAddress) ?? [recip.email];

    if (bounceType === "Permanent" || bounceType === "Undetermined") {
      for (const email of emails) {
        await handleHardBounceOrComplaint(workspaceId, email, "bounce");
      }
      if (!recip.bouncedAt) {
        await prisma.$transaction([
          prisma.campaignRecipient.update({
            where: { id: recip.id },
            data: { bouncedAt: new Date(), status: "FAILED", error: "Hard bounce" },
          }),
          prisma.campaign.update({
            where: { id: recip.campaignId },
            data: { bounceCount: { increment: 1 } },
          }),
        ]);
        await checkAutoPause(recip.campaignId);
      }
    } else {
      await prisma.campaignRecipient.update({
        where: { id: recip.id },
        data: { error: `Soft bounce (${bounceType})` },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (eventType === "Complaint") {
    const emails =
      note.complaint?.complainedRecipients?.map((r) => r.emailAddress) ?? [recip.email];
    for (const email of emails) {
      await handleHardBounceOrComplaint(workspaceId, email, "complaint");
    }
    if (!recip.complainedAt) {
      await prisma.$transaction([
        prisma.campaignRecipient.update({
          where: { id: recip.id },
          data: { complainedAt: new Date() },
        }),
        prisma.campaign.update({
          where: { id: recip.campaignId },
          data: { complaintCount: { increment: 1 } },
        }),
      ]);
      await checkAutoPause(recip.campaignId);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
