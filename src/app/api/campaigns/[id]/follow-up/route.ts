import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { createSimpleDesign } from "@/lib/simple-design";
import { compileEmailHtml } from "@/lib/email-compiler";
import type { Prisma } from "@prisma/client";

const schema = z.object({
  kind: z.enum([
    "delivered_no_engagement",
    "clicked_any",
    "clicked_link",
    "newly_subscribed",
    "exclude_recently_contacted",
  ]),
  linkId: z.string().optional(),
  days: z.number().int().min(1).max(365).optional(),
});

/**
 * Creates a DRAFT follow-up campaign. Never sends automatically.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const source = await prisma.campaign.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let contactIds: string[] = [];
  const { kind } = parsed.data;

  if (kind === "delivered_no_engagement") {
    const rows = await prisma.campaignRecipient.findMany({
      where: {
        campaignId: source.id,
        deliveredAt: { not: null },
        openedAt: null,
        firstClickedAt: null,
      },
      select: { contactId: true },
    });
    contactIds = rows.map((r) => r.contactId);
  } else if (kind === "clicked_any") {
    const rows = await prisma.campaignRecipient.findMany({
      where: { campaignId: source.id, firstClickedAt: { not: null } },
      select: { contactId: true },
    });
    contactIds = rows.map((r) => r.contactId);
  } else if (kind === "clicked_link") {
    if (!parsed.data.linkId) {
      return NextResponse.json({ error: "linkId required" }, { status: 400 });
    }
    const clicks = await prisma.clickEvent.findMany({
      where: { linkId: parsed.data.linkId, link: { campaignId: source.id } },
      select: { recipient: { select: { contactId: true } } },
    });
    contactIds = [...new Set(clicks.map((c) => c.recipient.contactId))];
  } else if (kind === "newly_subscribed") {
    const since = new Date(Date.now() - (parsed.data.days || 30) * 86400000);
    const rows = await prisma.contact.findMany({
      where: {
        workspaceId: ctx.workspace.id,
        status: "SUBSCRIBED",
        createdAt: { gte: since },
      },
      select: { id: true },
    });
    contactIds = rows.map((r) => r.id);
  } else if (kind === "exclude_recently_contacted") {
    const days = parsed.data.days || 30;
    const since = new Date(Date.now() - days * 86400000);
    const recent = await prisma.campaignRecipient.findMany({
      where: {
        sentAt: { gte: since },
        campaign: { workspaceId: ctx.workspace.id },
      },
      select: { contactId: true },
      distinct: ["contactId"],
    });
    const recentIds = new Set(recent.map((r) => r.contactId));
    const all = await prisma.contact.findMany({
      where: { workspaceId: ctx.workspace.id, status: "SUBSCRIBED" },
      select: { id: true },
    });
    contactIds = all.map((c) => c.id).filter((id) => !recentIds.has(id));
  }

  if (!contactIds.length) {
    return NextResponse.json({ error: "No matching recipients for this follow-up" }, { status: 400 });
  }

  // Tag them for audience targeting
  const tagName = `Follow-up: ${source.name.slice(0, 40)} (${kind})`;
  const tag = await prisma.tag.upsert({
    where: { workspaceId_name: { workspaceId: ctx.workspace.id, name: tagName } },
    create: { workspaceId: ctx.workspace.id, name: tagName, color: "#4F46E5" },
    update: {},
  });
  await prisma.contactTag.createMany({
    data: contactIds.map((contactId) => ({ contactId, tagId: tag.id })),
    skipDuplicates: true,
  });

  const design = createSimpleDesign({
    headline: "A quick follow-up",
    messageHtml: "<p>Hi {{first_name|there}},</p><p>We wanted to share one more thing with you.</p>",
    buttonLabel: "Take a look",
    logoUrl: ctx.workspace.logoUrl,
    primaryColor: ctx.workspace.primaryColor,
  });
  const compiledHtml = compileEmailHtml(design, {
    mailingAddress: ctx.workspace.mailingAddress,
  });

  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: ctx.workspace.id,
      name: `Follow-up: ${source.name}`,
      status: "DRAFT",
      goal: "winback",
      simpleMode: true,
      senderIdentityId: source.senderIdentityId,
      subject: `Re: ${source.subject || source.name}`,
      previewText: "A quick note for you",
      designJson: design as unknown as Prisma.InputJsonValue,
      compiledHtml,
      audienceType: "tags",
      audienceTagIds: [tag.id],
    },
  });

  return NextResponse.json({
    campaign,
    recipientEstimate: contactIds.length,
    note: "Draft created — it will not send until you review and launch.",
  });
}
