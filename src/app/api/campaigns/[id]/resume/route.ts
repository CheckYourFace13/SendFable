import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { resumeCampaign } from "@/lib/campaign-send";
import {
  CAMPAIGN_SEND_DISABLED_MESSAGE,
  CampaignSendDisabledError,
  isCampaignSendEnabled,
} from "@/lib/campaign-send-gate";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isCampaignSendEnabled()) {
    return NextResponse.json({ error: CAMPAIGN_SEND_DISABLED_MESSAGE }, { status: 403 });
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await resumeCampaign(campaign.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CampaignSendDisabledError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Resume failed" },
      { status: 400 }
    );
  }
}
