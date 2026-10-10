import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { compileEmailHtml, type EmailDesign } from "@/lib/email-compiler";
import { randomToken } from "@/lib/utils";
import { showSendfableBadgeFor } from "@/lib/internal-entitlement";
import { getWorkspaceOwner } from "@/lib/session";
import {
  CAMPAIGN_SEND_DISABLED_MESSAGE,
  isCampaignSendEnabled,
} from "@/lib/campaign-send-gate";
import {
  BRIEF_AUDIENCE_TAG,
  ensureAudienceTag,
  requireIntegrationAuth,
} from "@/lib/integration-auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(1).max(200),
  previewText: z.string().max(200).optional().nullable(),
  /** Full email body HTML (sections). Footer/unsub/badge applied by SendFable. */
  htmlBody: z.string().min(20).max(200_000),
  tagName: z.string().max(120).optional(),
  /** ISO datetime — when set, campaign is SCHEDULED */
  scheduledAt: z.string().datetime().optional().nullable(),
  /** If true and scheduledAt omitted, leave as DRAFT */
  draftOnly: z.boolean().optional(),
  senderIdentityId: z.string().cuid().optional(),
});

function designFromHtmlBody(htmlBody: string): EmailDesign {
  return {
    version: 1,
    blocks: [
      {
        id: randomToken(8),
        type: "text",
        props: { html: htmlBody, align: "left" },
      },
      {
        id: randomToken(8),
        type: "footer",
        props: { mailingAddress: "" },
      },
    ],
    settings: {
      backgroundColor: "#f0f7fc",
      contentWidth: 600,
      fontFamily:
        "Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
    },
  };
}

/**
 * Create a Brief campaign (and optionally schedule it).
 * POST /api/v1/campaigns
 */
export async function POST(req: Request) {
  const auth = await requireIntegrationAuth(req);
  if (auth instanceof NextResponse) return auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  if (!auth.workspace.mailingAddress?.trim()) {
    return NextResponse.json(
      { error: "Workspace mailing address required (CAN-SPAM)" },
      { status: 400 }
    );
  }

  const tag = await ensureAudienceTag(auth.workspace.id);
  const tagName = parsed.data.tagName?.trim() || BRIEF_AUDIENCE_TAG;
  const audienceTag =
    tagName === BRIEF_AUDIENCE_TAG
      ? tag
      : await prisma.tag.upsert({
          where: {
            workspaceId_name: { workspaceId: auth.workspace.id, name: tagName },
          },
          create: {
            workspaceId: auth.workspace.id,
            name: tagName,
            color: "#0B3D6B",
          },
          update: {},
        });

  let senderIdentityId = parsed.data.senderIdentityId;
  if (!senderIdentityId) {
    const identity = await prisma.senderIdentity.findFirst({
      where: { workspaceId: auth.workspace.id, status: "VERIFIED" },
      orderBy: { createdAt: "asc" },
    });
    senderIdentityId = identity?.id;
  }
  if (!senderIdentityId) {
    return NextResponse.json(
      { error: "No verified sender identity on workspace" },
      { status: 400 }
    );
  }

  const owner = await getWorkspaceOwner(auth.workspace.id);
  const design = designFromHtmlBody(parsed.data.htmlBody);
  const compiledHtml = compileEmailHtml(design, {
    businessName: auth.workspace.name,
    mailingAddress: auth.workspace.mailingAddress,
    showSendfableBadge: showSendfableBadgeFor({
      isInternal: auth.workspace.isInternal,
      disabledAt: auth.workspace.disabledAt,
      plan: owner.plan,
    }),
    previewText: parsed.data.previewText || undefined,
  });

  const wantSchedule = Boolean(parsed.data.scheduledAt) && !parsed.data.draftOnly;
  if (wantSchedule && !isCampaignSendEnabled()) {
    return NextResponse.json({ error: CAMPAIGN_SEND_DISABLED_MESSAGE }, { status: 403 });
  }

  const scheduledAt = wantSchedule ? new Date(parsed.data.scheduledAt!) : null;
  if (scheduledAt && scheduledAt.getTime() < Date.now() - 60_000) {
    return NextResponse.json(
      { error: "scheduledAt must be in the future" },
      { status: 400 }
    );
  }

  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: auth.workspace.id,
      name: parsed.data.name,
      subject: parsed.data.subject,
      previewText: parsed.data.previewText || null,
      goal: "news",
      simpleMode: true,
      rawHtmlMode: false,
      designJson: design as object,
      compiledHtml,
      senderIdentityId,
      audienceType: "tags",
      audienceTagIds: [audienceTag.id],
      status: wantSchedule ? "SCHEDULED" : "DRAFT",
      scheduledAt,
    },
  });

  return NextResponse.json({
    ok: true,
    campaignId: campaign.id,
    status: campaign.status,
    scheduledAt: campaign.scheduledAt,
    tag: audienceTag.name,
    badge: showSendfableBadgeFor({
      isInternal: auth.workspace.isInternal,
      disabledAt: auth.workspace.disabledAt,
      plan: owner.plan,
    }),
  });
}

/** List recent Brief campaigns for owner status. */
export async function GET(req: Request) {
  const auth = await requireIntegrationAuth(req);
  if (auth instanceof NextResponse) return auth;

  const campaigns = await prisma.campaign.findMany({
    where: {
      workspaceId: auth.workspace.id,
      OR: [
        { name: { contains: "Boating Brief", mode: "insensitive" } },
        { goal: "news" },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
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
      unsubscribeCount: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ campaigns });
}
