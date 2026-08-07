import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import type { Prisma } from "@prisma/client";
import { trackEvent } from "@/lib/analytics";
import { ensureAnalyticsPersistence } from "@/lib/analytics-persist";

/**
 * Clone a campaign into a new DRAFT for second-send reuse.
 * Copies design, subject, sender, and audience — never auto-sends.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const source = await prisma.campaign.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: ctx.workspace.id,
      name: `${source.name} (copy)`,
      subject: source.subject,
      previewText: source.previewText,
      goal: source.goal,
      simpleMode: source.simpleMode,
      channel: source.channel,
      smsBody: source.smsBody,
      designJson: (source.designJson ?? {}) as Prisma.InputJsonValue,
      compiledHtml: source.compiledHtml,
      rawHtmlMode: source.rawHtmlMode,
      senderIdentityId: source.senderIdentityId,
      audienceType: source.audienceType,
      audienceTagIds: (source.audienceTagIds ?? []) as Prisma.InputJsonValue,
      audienceSegmentId: source.audienceSegmentId,
      status: "DRAFT",
    },
  });

  try {
    ensureAnalyticsPersistence();
    trackEvent("campaign_created", { source: "duplicate" });
  } catch {
    /* fail open */
  }

  return NextResponse.json({ campaign }, { status: 201 });
}
