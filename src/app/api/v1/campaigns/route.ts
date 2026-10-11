import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
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
  briefIssueIdempotencyKey,
  briefIssueSlotKey,
  isActiveBriefSlotStatus,
  isRecoverableBriefSlotStatus,
} from "@/lib/brief-issue-slot";
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
  /** Optional client-supplied slot; server derives canonical key from scheduledAt when scheduling Brief. */
  issueSlotKey: z.string().trim().min(8).max(120).optional().nullable(),
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

function requestHash(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 32);
}

function campaignResponse(campaign: {
  id: string;
  status: string;
  scheduledAt: Date | null;
  issueSlotKey: string | null;
}, badge: boolean, tagName: string, already = false) {
  return {
    ok: true,
    campaignId: campaign.id,
    status: campaign.status,
    scheduledAt: campaign.scheduledAt,
    issueSlotKey: campaign.issueSlotKey,
    tag: tagName,
    badge,
    alreadyScheduled: already,
  };
}

/**
 * Create a Brief campaign (and optionally schedule it).
 * POST /api/v1/campaigns
 *
 * When scheduling a non-test Brief, acquires an atomic America/Chicago issue-slot
 * lock via IntegrationIdempotency + Campaign.issueSlotKey uniqueness so cron and
 * owner schedule cannot double-queue the same Thursday.
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
  const badge = showSendfableBadgeFor({
    isInternal: auth.workspace.isInternal,
    disabledAt: auth.workspace.disabledAt,
    plan: owner.plan,
  });
  const design = designFromHtmlBody(parsed.data.htmlBody);
  const compiledHtml = compileEmailHtml(design, {
    businessName: auth.workspace.name,
    mailingAddress: auth.workspace.mailingAddress,
    showSendfableBadge: badge,
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

  const isBrief =
    /Boating Brief/i.test(parsed.data.name) && !/\[TEST\]/i.test(parsed.data.name);
  const issueSlotKey =
    wantSchedule && isBrief && scheduledAt
      ? parsed.data.issueSlotKey?.trim() || briefIssueSlotKey(scheduledAt)
      : null;
  const idemKey =
    wantSchedule && isBrief && scheduledAt
      ? briefIssueIdempotencyKey(scheduledAt)
      : null;

  if (idemKey && issueSlotKey && scheduledAt) {
    const existingBySlot = await prisma.campaign.findFirst({
      where: {
        workspaceId: auth.workspace.id,
        issueSlotKey,
        status: { in: ["SCHEDULED", "SENDING", "PAUSED", "COMPLETED"] },
      },
      select: {
        id: true,
        status: true,
        scheduledAt: true,
        issueSlotKey: true,
      },
    });
    if (existingBySlot) {
      return NextResponse.json(
        campaignResponse(existingBySlot, badge, audienceTag.name, true)
      );
    }

    const hash = requestHash({
      name: parsed.data.name,
      subject: parsed.data.subject,
      scheduledAt: scheduledAt.toISOString(),
      issueSlotKey,
    });

    try {
      await prisma.integrationIdempotency.create({
        data: {
          workspaceId: auth.workspace.id,
          key: idemKey,
          requestHash: hash,
          statusCode: 202,
          responseJson: { pending: true, issueSlotKey },
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        const lock = await prisma.integrationIdempotency.findUnique({
          where: {
            workspaceId_key: {
              workspaceId: auth.workspace.id,
              key: idemKey,
            },
          },
        });
        if (lock?.campaignId) {
          const existing = await prisma.campaign.findFirst({
            where: { id: lock.campaignId, workspaceId: auth.workspace.id },
            select: {
              id: true,
              status: true,
              scheduledAt: true,
              issueSlotKey: true,
            },
          });
          if (existing && isActiveBriefSlotStatus(existing.status)) {
            return NextResponse.json(
              campaignResponse(existing, badge, audienceTag.name, true)
            );
          }
          if (existing && isRecoverableBriefSlotStatus(existing.status)) {
            await prisma.campaign.update({
              where: { id: existing.id },
              data: { issueSlotKey: null },
            });
            await prisma.integrationIdempotency.delete({
              where: { id: lock.id },
            });
            // Fall through to create a fresh campaign for this slot
          } else if (!existing) {
            await prisma.integrationIdempotency.delete({
              where: { id: lock.id },
            });
          } else {
            return NextResponse.json(
              campaignResponse(existing, badge, audienceTag.name, true)
            );
          }
        } else if (lock) {
          // Lock held without campaign yet — another request in flight
          return NextResponse.json(
            {
              error: "Brief issue slot is being scheduled; retry shortly",
              issueSlotKey,
            },
            { status: 409 }
          );
        }
        // Retry lock after recoverable cleanup
        try {
          await prisma.integrationIdempotency.create({
            data: {
              workspaceId: auth.workspace.id,
              key: idemKey,
              requestHash: hash,
              statusCode: 202,
              responseJson: { pending: true, issueSlotKey },
            },
          });
        } catch {
          return NextResponse.json(
            {
              error: "Brief issue slot is being scheduled; retry shortly",
              issueSlotKey,
            },
            { status: 409 }
          );
        }
      } else {
        throw err;
      }
    }
  }

  let campaign;
  try {
    campaign = await prisma.campaign.create({
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
        issueSlotKey,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      issueSlotKey
    ) {
      const existing = await prisma.campaign.findFirst({
        where: { workspaceId: auth.workspace.id, issueSlotKey },
        select: {
          id: true,
          status: true,
          scheduledAt: true,
          issueSlotKey: true,
        },
      });
      if (existing) {
        return NextResponse.json(
          campaignResponse(existing, badge, audienceTag.name, true)
        );
      }
    }
    if (idemKey) {
      await prisma.integrationIdempotency
        .deleteMany({
          where: { workspaceId: auth.workspace.id, key: idemKey, campaignId: null },
        })
        .catch(() => undefined);
    }
    throw err;
  }

  if (idemKey) {
    await prisma.integrationIdempotency.update({
      where: {
        workspaceId_key: { workspaceId: auth.workspace.id, key: idemKey },
      },
      data: {
        campaignId: campaign.id,
        statusCode: 200,
        responseJson: campaignResponse(campaign, badge, audienceTag.name),
      },
    });
  }

  return NextResponse.json(campaignResponse(campaign, badge, audienceTag.name));
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
      issueSlotKey: true,
      recipientCount: true,
      sentCount: true,
      deliveredCount: true,
      openCount: true,
      clickCount: true,
      bounceCount: true,
      failedCount: true,
      unsubscribeCount: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ campaigns });
}
