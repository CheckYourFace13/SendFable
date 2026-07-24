import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext, getWorkspaceOwner } from "@/lib/session";
import { checkLaunchQuota } from "@/lib/quota";
import { countAudience } from "@/lib/audience";
import { launchCampaign } from "@/lib/campaign-send";
import { compileEmailHtml, type EmailDesign } from "@/lib/email-compiler";
import { PLANS } from "@/lib/plans";
import { sanitizeEmailHtml } from "@/lib/html-sanitize";
import { maybeAwardReferralSignupCredit } from "@/lib/referrals";
import { externalEmailActive, isEarlyLaunch } from "@/lib/early-launch";
import {
  CAMPAIGN_SEND_DISABLED_MESSAGE,
  CampaignSendDisabledError,
  isCampaignSendEnabled,
} from "@/lib/campaign-send-gate";

const schema = z.object({
  when: z.enum(["now", "schedule"]),
  scheduledAt: z.string().datetime().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isCampaignSendEnabled()) {
    return NextResponse.json({ error: CAMPAIGN_SEND_DISABLED_MESSAGE }, { status: 403 });
  }

  if (isEarlyLaunch() && !externalEmailActive()) {
    return NextResponse.json(
      {
        error:
          "External email delivery is not activated yet. Use Test send (local .eml outbox) while SES stays unconfigured. Campaigns are not delivered to real inboxes.",
      },
      { status: 403 }
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, workspaceId: ctx.workspace.id },
    include: { senderIdentity: true },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!ctx.user.emailVerified) {
    return NextResponse.json({ error: "Verify your email before sending" }, { status: 403 });
  }
  if (!ctx.workspace.mailingAddress?.trim()) {
    return NextResponse.json(
      { error: "Add a physical mailing address in Settings before sending (CAN-SPAM)." },
      { status: 400 }
    );
  }
  if (!campaign.senderIdentity || campaign.senderIdentity.status !== "VERIFIED") {
    return NextResponse.json({ error: "Select a verified sender identity" }, { status: 400 });
  }
  if (!campaign.subject?.trim()) {
    return NextResponse.json({ error: "Subject line is required" }, { status: 400 });
  }
  if (!campaign.compiledHtml && !campaign.designJson) {
    return NextResponse.json({ error: "Campaign has no content" }, { status: 400 });
  }

  const owner = await getWorkspaceOwner(ctx.workspace.id);

  // Ensure compiled HTML is fresh; sanitize raw HTML mode before send
  if (campaign.rawHtmlMode && campaign.compiledHtml) {
    const html = sanitizeEmailHtml(campaign.compiledHtml);
    if (html !== campaign.compiledHtml) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { compiledHtml: html },
      });
    }
  } else if (campaign.designJson && !campaign.rawHtmlMode) {
    const html = compileEmailHtml(campaign.designJson as unknown as EmailDesign, {
      mailingAddress: ctx.workspace.mailingAddress,
      showSendfableBadge: PLANS[owner.plan].badge,
      previewText: campaign.previewText,
    });
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { compiledHtml: html },
    });
  }

  const recipientCount = await countAudience(ctx.workspace.id, {
    audienceType: campaign.audienceType as "all" | "tags" | "segment",
    audienceTagIds: (campaign.audienceTagIds as string[]) ?? [],
    audienceSegmentId: campaign.audienceSegmentId,
  });

  if (recipientCount === 0) {
    return NextResponse.json({ error: "Audience is empty" }, { status: 400 });
  }

  const quota = await checkLaunchQuota(owner, ctx.workspace.id, recipientCount);
  if (!quota.ok) {
    return NextResponse.json(
      { error: quota.error, upgradeRequired: quota.upgradeRequired },
      { status: 402 }
    );
  }

  if (parsed.data.when === "schedule") {
    if (!parsed.data.scheduledAt) {
      return NextResponse.json({ error: "scheduledAt required" }, { status: 400 });
    }
    const at = new Date(parsed.data.scheduledAt);
    if (at.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Schedule time must be in the future" }, { status: 400 });
    }
    const updated = await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "SCHEDULED", scheduledAt: at, recipientCount },
    });
    return NextResponse.json({ campaign: updated });
  }

  try {
    const result = await launchCampaign(campaign.id);
    const updated = await prisma.campaign.findUnique({ where: { id: campaign.id } });
    // Placeholder referral credit on first successful launch
    void maybeAwardReferralSignupCredit(ctx.user.id, "first_campaign");
    return NextResponse.json({ campaign: updated, ...result });
  } catch (err) {
    if (err instanceof CampaignSendDisabledError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Launch failed" },
      { status: 400 }
    );
  }
}
