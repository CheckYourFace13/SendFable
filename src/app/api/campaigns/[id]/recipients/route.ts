import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const q = new URL(req.url).searchParams.get("q")?.trim() || "";
  const channel = campaign.channel || "EMAIL";

  const emailRecipients =
    channel === "SMS"
      ? []
      : await prisma.campaignRecipient.findMany({
          where: {
            campaignId: params.id,
            ...(q ? { email: { contains: q, mode: "insensitive" } } : {}),
          },
          orderBy: { sentAt: "desc" },
          take: 500,
          select: {
            id: true,
            email: true,
            status: true,
            sentAt: true,
            deliveredAt: true,
            openedAt: true,
            firstClickedAt: true,
            bouncedAt: true,
            complainedAt: true,
            unsubscribedAt: true,
          },
        });

  const smsRecipients =
    channel === "EMAIL"
      ? []
      : await prisma.smsRecipient.findMany({
          where: {
            campaignId: params.id,
            ...(q
              ? {
                  OR: [
                    { phoneE164: { contains: q } },
                    { contact: { email: { contains: q, mode: "insensitive" } } },
                  ],
                }
              : {}),
          },
          orderBy: { sentAt: "desc" },
          take: 500,
          select: {
            id: true,
            phoneE164: true,
            status: true,
            sentAt: true,
            deliveredAt: true,
            failedAt: true,
            error: true,
            contact: { select: { email: true, firstName: true } },
          },
        });

  // Opt-outs attributed near this campaign window (best-effort)
  let smsOptOuts = 0;
  if (channel !== "EMAIL" && campaign.sentAt) {
    smsOptOuts = await prisma.smsSuppression.count({
      where: {
        workspaceId: ctx.workspace.id,
        createdAt: { gte: campaign.sentAt },
      },
    });
  }

  return NextResponse.json({
    recipients: emailRecipients,
    smsRecipients,
    smsOptOuts,
    channel,
  });
}
