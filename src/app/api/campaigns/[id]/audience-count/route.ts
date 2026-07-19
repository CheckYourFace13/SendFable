import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { countAudience } from "@/lib/audience";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const count = await countAudience(ctx.workspace.id, {
    audienceType: campaign.audienceType as "all" | "tags" | "segment",
    audienceTagIds: (campaign.audienceTagIds as string[]) ?? [],
    audienceSegmentId: campaign.audienceSegmentId,
  });

  return NextResponse.json({ count });
}
