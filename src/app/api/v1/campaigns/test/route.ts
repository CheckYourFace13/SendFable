import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, isValidEmail, appUrl } from "@/lib/utils";
import { resolveFromHeaders } from "@/lib/identities";
import { sendEmail } from "@/lib/mailer";
import { compileEmailHtml, type EmailDesign } from "@/lib/email-compiler";
import { renderMergeTags } from "@/lib/merge";
import { PLANS } from "@/lib/plans";
import { getWorkspaceOwner } from "@/lib/session";
import {
  CAMPAIGN_SEND_DISABLED_MESSAGE,
  isCampaignSendEnabled,
} from "@/lib/campaign-send-gate";
import { requireIntegrationAuth } from "@/lib/integration-auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  campaignId: z.string().cuid(),
  email: z.string().email().max(200),
});

/**
 * Send a test copy of a campaign to one address (owner/test).
 * POST /api/v1/campaigns/test
 */
export async function POST(req: Request) {
  const auth = await requireIntegrationAuth(req);
  if (auth instanceof NextResponse) return auth;

  if (!isCampaignSendEnabled()) {
    return NextResponse.json({ error: CAMPAIGN_SEND_DISABLED_MESSAGE }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: parsed.data.campaignId, workspaceId: auth.workspace.id },
    include: { senderIdentity: true },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const identity = campaign.senderIdentity;
  if (!identity || identity.status !== "VERIFIED") {
    return NextResponse.json(
      { error: "Verified sender required for test sends" },
      { status: 400 }
    );
  }

  const owner = await getWorkspaceOwner(auth.workspace.id);
  let html = campaign.compiledHtml ?? "";
  if (!html && campaign.designJson) {
    html = compileEmailHtml(campaign.designJson as unknown as EmailDesign, {
      businessName: auth.workspace.name,
      mailingAddress: auth.workspace.mailingAddress,
      showSendfableBadge: PLANS[owner.plan].badge,
      previewText: campaign.previewText,
      unsubscribeUrl: appUrl("/unsubscribe/test"),
    });
  }
  if (!html) {
    return NextResponse.json({ error: "Campaign has no compiled HTML" }, { status: 400 });
  }

  const mergeData = {
    first_name: "Test",
    last_name: "Reader",
    email,
    full_name: "Test Reader",
    unsubscribe_url: appUrl("/unsubscribe/test"),
  };
  html = renderMergeTags(
    html.replaceAll("{{unsubscribe_url}}", mergeData.unsubscribe_url),
    mergeData
  );
  const subject = `[TEST] ${renderMergeTags(campaign.subject || "Untitled", mergeData)}`;
  const { from, replyTo } = resolveFromHeaders(identity);

  await sendEmail({
    from,
    to: email,
    replyTo,
    subject,
    html,
    noConfigurationSet: true,
  });

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { testSentAt: new Date() },
  });

  return NextResponse.json({ ok: true, testEmail: email, campaignId: campaign.id });
}
