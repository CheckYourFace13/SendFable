import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { pauseCampaign } from "@/lib/campaign-send";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (campaign.status !== "SENDING") {
    return NextResponse.json({ error: "Only sending campaigns can be paused" }, { status: 400 });
  }

  await pauseCampaign(campaign.id, "manual");
  return NextResponse.json({ ok: true });
}
