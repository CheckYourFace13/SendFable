import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiContext, getWorkspaceOwner } from "@/lib/session";
import { countAudience } from "@/lib/audience";
import { computeSendConfidence } from "@/lib/send-confidence";
import { normalizeEmail } from "@/lib/utils";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
    include: { senderIdentity: true },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const owner = await getWorkspaceOwner(ctx.workspace.id);
  const audienceSize = await countAudience(ctx.workspace.id, {
    audienceType: campaign.audienceType as "all" | "tags" | "segment",
    audienceTagIds: (campaign.audienceTagIds as string[]) ?? [],
    audienceSegmentId: campaign.audienceSegmentId,
  });

  // Approximate suppressed among subscribed
  const subscribed = await prisma.contact.findMany({
    where: { workspaceId: ctx.workspace.id, status: "SUBSCRIBED" },
    select: { email: true },
    take: 50_000,
  });
  const emails = subscribed.map((c) => normalizeEmail(c.email));
  const [local, global] = await Promise.all([
    prisma.suppressionEntry.count({
      where: { workspaceId: ctx.workspace.id, email: { in: emails } },
    }),
    prisma.globalSuppression.count({ where: { email: { in: emails } } }),
  ]);

  const completed = await prisma.campaign.aggregate({
    where: { workspaceId: ctx.workspace.id, status: "COMPLETED" },
    _sum: { sentCount: true, bounceCount: true, complaintCount: true },
  });
  const sent = Math.max(1, completed._sum.sentCount ?? 0);

  const result = computeSendConfidence({
    campaign,
    sender: campaign.senderIdentity,
    workspace: ctx.workspace,
    owner,
    audienceSize,
    suppressedCount: local + global,
    recentBounceRate: (completed._sum.bounceCount ?? 0) / sent,
    recentComplaintRate: (completed._sum.complaintCount ?? 0) / sent,
  });

  return NextResponse.json(result);
}
