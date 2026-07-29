import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext } from "@/lib/session";
import { isSmsAccountSignupEnabled, isSmsCodeEnabled } from "@/lib/sms/flags";
import { emailToText, textToEmail } from "@/lib/sms/convert";

const schema = z.object({
  direction: z.enum(["email-to-text", "text-to-email"]),
});

/**
 * Deterministic Email ⇄ Text conversion. Output is ALWAYS a draft — never
 * auto-sent. Flag-gated so the feature is invisible until SMS signup opens.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isSmsCodeEnabled() || !isSmsAccountSignupEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
    include: {
      links: { orderBy: { index: "asc" }, take: 1 },
      workspace: { select: { name: true } },
    },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.direction === "email-to-text") {
    const draft = emailToText({
      subject: campaign.subject,
      previewText: campaign.previewText,
      compiledHtml: campaign.compiledHtml,
      businessName: campaign.workspace.name,
      ctaUrl: campaign.links[0]?.url ?? null,
    });
    // Save as DRAFT smsBody only — never changes status, never sends.
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        smsBody: draft.body,
        smsEncoding: draft.encoding,
        smsSegmentsPerMessage: draft.segments,
        channel: campaign.channel === "EMAIL" ? "BOTH" : campaign.channel,
      },
    });
    return NextResponse.json({ draft, autoSent: false });
  }

  if (!campaign.smsBody?.trim()) {
    return NextResponse.json({ error: "No text body to convert" }, { status: 400 });
  }
  const draft = textToEmail({
    smsBody: campaign.smsBody,
    businessName: campaign.workspace.name,
  });
  // Suggested email fields only — never auto-send.
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      subject: campaign.subject || draft.suggestedSubject,
      previewText: campaign.previewText || draft.previewText,
      channel: campaign.channel === "SMS" ? "BOTH" : campaign.channel,
    },
  });
  return NextResponse.json({ draft, autoSent: false });
}
