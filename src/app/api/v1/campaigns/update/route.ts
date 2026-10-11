import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { compileEmailHtml, type EmailDesign } from "@/lib/email-compiler";
import { randomToken } from "@/lib/utils";
import { showSendfableBadgeFor } from "@/lib/internal-entitlement";
import { getWorkspaceOwner } from "@/lib/session";
import { requireIntegrationAuth } from "@/lib/integration-auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  campaignId: z.string().cuid(),
  name: z.string().trim().min(1).max(160).optional(),
  subject: z.string().trim().min(1).max(200),
  previewText: z.string().max(200).optional().nullable(),
  htmlBody: z.string().min(20).max(200_000),
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
 * Refresh subject/body of a SCHEDULED Brief campaign in place (same id + issue slot).
 * POST /api/v1/campaigns/update
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

  const campaign = await prisma.campaign.findFirst({
    where: { id: parsed.data.campaignId, workspaceId: auth.workspace.id },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  if (campaign.status !== "SCHEDULED") {
    return NextResponse.json(
      {
        error: `Only SCHEDULED campaigns can be refreshed (status=${campaign.status})`,
      },
      { status: 409 }
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

  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      name: parsed.data.name?.trim() || campaign.name,
      subject: parsed.data.subject,
      previewText: parsed.data.previewText || null,
      designJson: design as object,
      compiledHtml,
    },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      issueSlotKey: true,
      subject: true,
      name: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    campaignId: updated.id,
    status: updated.status,
    scheduledAt: updated.scheduledAt,
    issueSlotKey: updated.issueSlotKey,
    subject: updated.subject,
    name: updated.name,
    refreshedAt: updated.updatedAt,
  });
}
