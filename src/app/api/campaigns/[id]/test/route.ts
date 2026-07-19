import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext, getWorkspaceOwner } from "@/lib/session";
import { resolveFromHeaders } from "@/lib/identities";
import { sendEmail } from "@/lib/mailer";
import { compileEmailHtml, type EmailDesign } from "@/lib/email-compiler";
import { renderMergeTags } from "@/lib/merge";
import { PLANS } from "@/lib/plans";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { appUrl } from "@/lib/utils";

const schema = z.object({
  email: z.string().email().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit(
    "testSend",
    ctx.user.id,
    RATE_LIMITS.testSend.limit,
    RATE_LIMITS.testSend.windowSec
  );
  if (!rl.ok) {
    return NextResponse.json({ error: "Test send limit reached" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
    include: { senderIdentity: true },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const identity = campaign.senderIdentity;
  if (!identity || identity.status !== "VERIFIED") {
    return NextResponse.json({ error: "Verified sender required for test sends" }, { status: 400 });
  }

  const owner = await getWorkspaceOwner(ctx.workspace.id);
  let html = campaign.compiledHtml ?? "";
  if (!html && campaign.designJson) {
    html = compileEmailHtml(campaign.designJson as unknown as EmailDesign, {
      mailingAddress: ctx.workspace.mailingAddress,
      showSendfableBadge: PLANS[owner.plan].badge,
      previewText: campaign.previewText,
      unsubscribeUrl: appUrl("/unsubscribe/test"),
    });
  }

  const mergeData = {
    first_name: "Alex",
    last_name: "Rivera",
    email: parsed.data.email || ctx.user.email,
    full_name: "Alex Rivera",
    unsubscribe_url: appUrl("/unsubscribe/test"),
  };
  html = renderMergeTags(html.replaceAll("{{unsubscribe_url}}", mergeData.unsubscribe_url), mergeData);
  const subject = `[TEST] ${renderMergeTags(campaign.subject || "Untitled", mergeData)}`;
  const { from, replyTo } = resolveFromHeaders(identity);

  await sendEmail({
    from,
    to: parsed.data.email || ctx.user.email,
    replyTo,
    subject,
    html,
    noConfigurationSet: true,
  });

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { testSentAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
