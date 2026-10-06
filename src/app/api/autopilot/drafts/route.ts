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
      campaignId: true,
      detectedAt: true,
      decidedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ drafts });
}
