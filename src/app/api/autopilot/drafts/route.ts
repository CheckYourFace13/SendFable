import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const drafts = await prisma.marketingAutopilotDraft.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      status: true,
      subject: true,
      explanation: true,
      sourceUrl: true,
      changeSummary: true,
      campaignId: true,
      detectedAt: true,
      decidedAt: true,
      createdAt: true,
      campaign: {
        select: { audienceType: true, audienceTagIds: true, status: true },
      },
    },
  });

  const tagIds = [
    ...new Set(
      drafts.flatMap((draft) =>
        Array.isArray(draft.campaign?.audienceTagIds)
          ? (draft.campaign.audienceTagIds as string[])
          : []
      )
    ),
  ];
  const tags = tagIds.length
    ? await prisma.tag.findMany({
        where: { workspaceId: ctx.workspace.id, id: { in: tagIds } },
        select: { id: true, name: true },
      })
    : [];
  const tagNames = new Map(tags.map((tag) => [tag.id, tag.name]));

  return NextResponse.json({
    drafts: drafts.map((draft) => {
      const ids = Array.isArray(draft.campaign?.audienceTagIds)
        ? (draft.campaign.audienceTagIds as string[])
        : [];
      const named = ids.map((id) => tagNames.get(id)).filter(Boolean);
      const audience =
        draft.campaign?.audienceType === "tags"
          ? named.join(", ") || "Selected audience"
          : draft.campaign?.audienceType === "segment"
            ? "A segment"
            : "Everyone subscribed";
      return {
        id: draft.id,
        status: draft.status,
        subject: draft.subject,
        explanation: draft.explanation,
        sourceUrl: draft.sourceUrl,
        changeSummary: draft.changeSummary,
        campaignId: draft.campaignId,
        campaignStatus: draft.campaign?.status ?? null,
        detectedAt: draft.detectedAt,
        decidedAt: draft.decidedAt,
        createdAt: draft.createdAt,
        audience,
      };
    }),
  });
}
