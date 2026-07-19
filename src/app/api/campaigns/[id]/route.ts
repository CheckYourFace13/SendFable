import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { compileEmailHtml, type EmailDesign } from "@/lib/email-compiler";
import { PLANS } from "@/lib/plans";
import { getWorkspaceOwner } from "@/lib/session";
import { sanitizeEmailHtml } from "@/lib/html-sanitize";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  subject: z.string().trim().max(200).optional().nullable(),
  previewText: z.string().trim().max(200).optional().nullable(),
  designJson: z.any().optional(),
  compiledHtml: z.string().optional(),
  rawHtmlMode: z.boolean().optional(),
  simpleMode: z.boolean().optional(),
  goal: z.string().max(40).nullable().optional(),
  audienceType: z.enum(["all", "tags", "segment"]).optional(),
  audienceTagIds: z.array(z.string()).optional(),
  audienceSegmentId: z.string().nullable().optional(),
  senderIdentityId: z.string().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
    include: {
      senderIdentity: true,
      links: { orderBy: { clickCount: "desc" } },
      _count: { select: { recipients: true } },
    },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ campaign });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const existing = await prisma.campaign.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!["DRAFT", "SCHEDULED", "PAUSED"].includes(existing.status) && parsed.data.designJson) {
    return NextResponse.json({ error: "Cannot edit a campaign that has already sent" }, { status: 400 });
  }

  if (parsed.data.senderIdentityId) {
    const identity = await prisma.senderIdentity.findFirst({
      where: {
        id: parsed.data.senderIdentityId,
        workspaceId: ctx.workspace.id,
        type: "ADDRESS",
      },
    });
    if (!identity) {
      return NextResponse.json({ error: "Sender identity not found" }, { status: 400 });
    }
  }

  const owner = await getWorkspaceOwner(ctx.workspace.id);
  const rawHtmlMode = parsed.data.rawHtmlMode ?? existing.rawHtmlMode;
  let compiledHtml = parsed.data.compiledHtml;
  let designJson = parsed.data.designJson;

  if (rawHtmlMode) {
    if (parsed.data.compiledHtml !== undefined) {
      compiledHtml = sanitizeEmailHtml(parsed.data.compiledHtml);
    }
  } else if (designJson) {
    compiledHtml = compileEmailHtml(designJson as EmailDesign, {
      mailingAddress: ctx.workspace.mailingAddress,
      showSendfableBadge: PLANS[owner.plan].badge,
      previewText: parsed.data.previewText ?? existing.previewText,
    });
  }

  const campaign = await prisma.campaign.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name,
      subject: parsed.data.subject === undefined ? undefined : parsed.data.subject,
      previewText: parsed.data.previewText === undefined ? undefined : parsed.data.previewText,
      designJson: designJson === undefined ? undefined : designJson,
      compiledHtml: compiledHtml === undefined ? undefined : compiledHtml,
      rawHtmlMode: parsed.data.rawHtmlMode,
      simpleMode: parsed.data.simpleMode,
      goal: parsed.data.goal === undefined ? undefined : parsed.data.goal,
      audienceType: parsed.data.audienceType,
      audienceTagIds: parsed.data.audienceTagIds,
      audienceSegmentId:
        parsed.data.audienceSegmentId === undefined ? undefined : parsed.data.audienceSegmentId,
      senderIdentityId:
        parsed.data.senderIdentityId === undefined ? undefined : parsed.data.senderIdentityId,
      scheduledAt:
        parsed.data.scheduledAt === undefined
          ? undefined
          : parsed.data.scheduledAt
            ? new Date(parsed.data.scheduledAt)
            : null,
    },
    include: { senderIdentity: true },
  });

  return NextResponse.json({ campaign });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.campaign.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "SENDING") {
    return NextResponse.json({ error: "Pause or cancel before deleting" }, { status: 400 });
  }

  await prisma.campaign.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
