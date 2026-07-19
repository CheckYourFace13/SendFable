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

  const recipients = await prisma.campaignRecipient.findMany({
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

  return NextResponse.json({ recipients });
}
