import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireIntegrationAuth } from "@/lib/integration-auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  campaignId: z.string().cuid(),
});

/**
 * Cancel a SCHEDULED campaign (back to DRAFT).
 * POST /api/v1/campaigns/cancel
 */
export async function POST(req: Request) {
  const auth = await requireIntegrationAuth(req);
  if (auth instanceof NextResponse) return auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: parsed.data.campaignId, workspaceId: auth.workspace.id },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  if (campaign.status !== "SCHEDULED") {
    return NextResponse.json(
      { error: `Cannot cancel campaign in status ${campaign.status}` },
      { status: 400 }
    );
  }

  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: "DRAFT", scheduledAt: null },
  });

  return NextResponse.json({
    ok: true,
    campaignId: updated.id,
    status: updated.status,
  });
}
