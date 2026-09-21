import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import type { Prisma } from "@prisma/client";
import { compileEmailHtml } from "@/lib/email-compiler";
import { createSimpleDesign } from "@/lib/simple-design";
import { isSmsAccountSignupEnabled, isSmsCodeEnabled } from "@/lib/sms/flags";
import { trackEvent } from "@/lib/analytics";
import { ensureAnalyticsPersistence } from "@/lib/analytics-persist";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  goal: z.string().max(40).optional(),
  simpleMode: z.boolean().optional(),
  /** EMAIL (default) | SMS | BOTH. SMS/BOTH require the SMS signup flag. */
  channel: z.enum(["EMAIL", "SMS", "BOTH"]).optional(),
  smsBody: z.string().max(1600).optional().nullable(),
  /** Apply a platform or workspace template design on create. */
  templateId: z.string().cuid().optional(),
  /** Public share slug (e.g. platform-restaurant-special). */
  templateSlug: z.string().max(120).optional(),
});

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaigns = await prisma.campaign.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      subject: true,
      scheduledAt: true,
      sentAt: true,
      completedAt: true,
      recipientCount: true,
      sentCount: true,
      openCount: true,
      clickCount: true,
      bounceCount: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({ campaigns });
}

export async function POST(req: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const channel = parsed.data.channel ?? "EMAIL";
  if (channel !== "EMAIL") {
    if (!isSmsCodeEnabled()) {
      return NextResponse.json(
        { error: "Text campaigns are not available yet" },
        { status: 403 }
      );
    }
    const { isSmsControlledAccessWorkspace } = await import("@/lib/sms/pilot");
    const controlled = await isSmsControlledAccessWorkspace(ctx.workspace.id);
    if (!isSmsAccountSignupEnabled() && !controlled) {
      return NextResponse.json(
        { error: "Text campaigns are not available yet" },
        { status: 403 }
      );
    }
  }

  let design = createSimpleDesign({
    logoUrl: ctx.workspace.logoUrl,
    primaryColor: ctx.workspace.primaryColor,
  });
  let subject: string | null = null;
  let previewText: string | null = null;
  let recommendedSms: string | null = null;

  // Prefer explicit templateId / templateSlug; otherwise pick a platform template matching the goal.
  let templateId = parsed.data.templateId;
  if (!templateId && parsed.data.templateSlug && channel !== "SMS") {
    const bySlug = await prisma.template.findFirst({
      where: {
        shareSlug: parsed.data.templateSlug,
        OR: [{ workspaceId: ctx.workspace.id }, { isPlatform: true, workspaceId: null }],
      },
    });
    if (bySlug) templateId = bySlug.id;
  }
  if (!templateId && parsed.data.goal && channel !== "SMS") {
    const { getGoal } = await import("@/lib/campaign-goals");
    const g = getGoal(parsed.data.goal);
    const cats = g?.templateCategories ?? [];
    if (cats.length) {
      const match = await prisma.template.findFirst({
        where: {
          isPlatform: true,
          workspaceId: null,
          OR: [
            { category: { in: cats } },
            { goal: parsed.data.goal },
          ],
        },
        orderBy: { updatedAt: "desc" },
      });
      if (match) templateId = match.id;
    }
  }

  if (templateId && channel !== "SMS") {
    const tpl = await prisma.template.findFirst({
      where: {
        id: templateId,
        OR: [{ workspaceId: ctx.workspace.id }, { isPlatform: true, workspaceId: null }],
      },
    });
    if (tpl?.designJson) {
      design = tpl.designJson as unknown as typeof design;
      const subjects = Array.isArray(tpl.suggestedSubjects)
        ? (tpl.suggestedSubjects as string[])
        : [];
      subject = subjects[0] || null;
      previewText = tpl.suggestedPreviewText || null;
      if (channel !== "EMAIL" && tpl.recommendedCta) {
        recommendedSms = `${tpl.recommendedCta}. Reply STOP to opt out, HELP for help.`;
      }
    }
  }

  const compiledHtml = compileEmailHtml(design, {
    businessName: ctx.workspace.name,
    mailingAddress: ctx.workspace.mailingAddress,
    showSendfableBadge: true,
  });

  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: ctx.workspace.id,
      name: parsed.data.name,
      goal: parsed.data.goal,
      simpleMode: parsed.data.simpleMode ?? true,
      channel,
      subject: channel === "SMS" ? null : subject,
      previewText: channel === "SMS" ? null : previewText,
      smsBody:
        channel === "EMAIL"
          ? null
          : parsed.data.smsBody ?? recommendedSms,
      designJson: design as unknown as Prisma.InputJsonValue,
      compiledHtml,
    },
  });

  try {
    ensureAnalyticsPersistence();
    trackEvent("campaign_created");
    const prior = await prisma.campaign.count({
      where: { workspaceId: ctx.workspace.id, id: { not: campaign.id } },
    });
    if (prior === 0) {
      const { markAcquisitionFirstCampaignForUser } = await import(
        "@/lib/acquisition/lifecycle"
      );
      await markAcquisitionFirstCampaignForUser(ctx.user.id);
    }
  } catch {
    /* fail open */
  }

  return NextResponse.json({ campaign }, { status: 201 });
}
