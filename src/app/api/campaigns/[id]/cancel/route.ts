import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { cancelCampaign } from "@/lib/campaign-send";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["SENDING", "PAUSED", "SCHEDULED"].includes(campaign.status)) {
    return NextResponse.json({ error: "Cannot cancel this campaign" }, { status: 400 });
  }

  await cancelCampaign(campaign.id);
  return NextResponse.json({ ok: true });
}
