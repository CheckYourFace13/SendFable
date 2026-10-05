import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PLANS } from "@/lib/plans";
import { getWorkspaceOwner } from "@/lib/session";
import { isCampaignSendEnabled } from "@/lib/campaign-send-gate";
import {
  BRIEF_AUDIENCE_TAG,
  ensureAudienceTag,
  getIntegrationSecret,
  getIntegrationWorkspaceId,
  requireIntegrationAuth,
} from "@/lib/integration-auth";

export const dynamic = "force-dynamic";

/**
 * Integration health + Brief audience stats.
 * GET /api/v1/status
 */
export async function GET(req: Request) {
  const auth = await requireIntegrationAuth(req);
  if (auth instanceof NextResponse) return auth;

  const tag = await ensureAudienceTag(auth.workspace.id);
  const [subscribed, totalTagged, lastSent] = await Promise.all([
    prisma.contactTag.count({
      where: {
        tagId: tag.id,
        contact: { workspaceId: auth.workspace.id, status: "SUBSCRIBED" },
      },
    }),
    prisma.contactTag.count({ where: { tagId: tag.id } }),
    prisma.campaign.findFirst({
      where: {
        workspaceId: auth.workspace.id,
        status: { in: ["COMPLETED", "SENDING"] },
        OR: [
          { name: { contains: "Boating Brief", mode: "insensitive" } },
          { goal: "news" },
        ],
      },
      orderBy: { sentAt: "desc" },
      select: {
        id: true,
        name: true,
        subject: true,
        status: true,
        sentAt: true,
        recipientCount: true,
        sentCount: true,
        openCount: true,
        clickCount: true,
      },
    }),
  ]);

  const nextScheduled = await prisma.campaign.findFirst({
    where: {
      workspaceId: auth.workspace.id,
      status: "SCHEDULED",
    },
    orderBy: { scheduledAt: "asc" },
    select: {
      id: true,
      name: true,
      subject: true,
      scheduledAt: true,
    },
  });

  const owner = await getWorkspaceOwner(auth.workspace.id);

  return NextResponse.json({
    ok: true,
    configured: Boolean(getIntegrationSecret() && getIntegrationWorkspaceId()),
    campaignSendEnabled: isCampaignSendEnabled(),
    workspaceId: auth.workspace.id,
    workspaceName: auth.workspace.name,
    mailingAddressSet: Boolean(auth.workspace.mailingAddress?.trim()),
    plan: owner.plan,
    badge: PLANS[owner.plan].badge,
    audience: {
      name: BRIEF_AUDIENCE_TAG,
      tagId: tag.id,
      subscribed,
      totalTagged,
    },
    lastSent,
    nextScheduled,
  });
}
