import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  CAMPAIGN_SEND_DISABLED_MESSAGE,
  isCampaignSendEnabled,
} from "@/lib/campaign-send-gate";
import { requireIntegrationAuth } from "@/lib/integration-auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  campaignId: z.string().cuid(),
  scheduledAt: z.string().datetime(),
});

/**
 * Schedule an existing DRAFT campaign.
 * POST /api/v1/campaigns/schedule
 */
export async function POST(req: Request) {
  const auth = await requireIntegrationAuth(req);
  if (auth instanceof NextResponse) return auth;

  if (!isCampaignSendEnabled()) {
    return NextResponse.json({ error: CAMPAIGN_SEND_DISABLED_MESSAGE }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() - 60_000) {
    return NextResponse.json({ error: "scheduledAt must be in the future" }, { status: 400 });
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: parsed.data.campaignId, workspaceId: auth.workspace.id },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED") {
    return NextResponse.json(
      { error: `Cannot schedule campaign in status ${campaign.status}` },
      { status: 400 }
    );
  }
  if (!campaign.compiledHtml) {
    return NextResponse.json({ error: "Campaign has no compiled HTML" }, { status: 400 });
  }

  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: "SCHEDULED", scheduledAt },
  });

  return NextResponse.json({
    ok: true,
    campaignId: updated.id,
    status: updated.status,
    scheduledAt: updated.scheduledAt,
  });
}
