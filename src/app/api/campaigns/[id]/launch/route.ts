import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApiContext, getWorkspaceOwner } from "@/lib/session";
import { checkLaunchQuota } from "@/lib/quota";
import { countAudience } from "@/lib/audience";
import { launchCampaign } from "@/lib/campaign-send";
import { launchSmsCampaign, resolveSmsAudienceContacts } from "@/lib/sms/campaign";
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
import {
  isSmsAccountSignupEnabled,
  isSmsCodeEnabled,
  isSmsLiveSendingEnabled,
} from "@/lib/sms/flags";

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

  const channel = campaign.channel || "EMAIL";
  const needsEmail = channel === "EMAIL" || channel === "BOTH";
  const needsSms = channel === "SMS" || channel === "BOTH";

  if (!ctx.user.emailVerified) {
    return NextResponse.json({ error: "Verify your email before sending" }, { status: 403 });
  }

  if (needsEmail) {
    if (isEarlyLaunch() && !externalEmailActive()) {
      return NextResponse.json(
        {
          error:
            "External email delivery is not activated yet. Use Test send (local .eml outbox) while SES stays unconfigured. Campaigns are not delivered to real inboxes.",
        },
        { status: 403 }
      );
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
      return NextResponse.json({ error: "Campaign has no email content" }, { status: 400 });
    }
  }

  if (needsSms) {
    if (!isSmsCodeEnabled()) {
      return NextResponse.json(
        { error: "Text messaging is not activated for this account." },
        { status: 403 }
      );
    }
    const { isSmsControlledAccessWorkspace, isOwnerPilotLiveSendingAllowed } = await import(
      "@/lib/sms/pilot"
    );
    const controlled = await isSmsControlledAccessWorkspace(ctx.workspace.id);
    if (!isSmsAccountSignupEnabled() && !controlled) {
      return NextResponse.json(
        { error: "Text messaging is not activated for this account." },
        { status: 403 }
      );
    }
    if (!campaign.smsBody?.trim()) {
      return NextResponse.json({ error: "Text message body is required" }, { status: 400 });
    }
    const liveOk =
      isSmsLiveSendingEnabled() || (await isOwnerPilotLiveSendingAllowed(ctx.workspace.id));
    if (parsed.data.when === "now" && !liveOk) {
      return NextResponse.json(
        {
          error:
            "Live text sending is not enabled yet (provider / compliance gate). You can still draft and save Text text.",
        },
        { status: 403 }
      );
    }
  }

  const owner = await getWorkspaceOwner(ctx.workspace.id);

  if (needsEmail) {
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
        businessName: ctx.workspace.name,
        mailingAddress: ctx.workspace.mailingAddress,
        showSendfableBadge: PLANS[owner.plan].badge,
        previewText: campaign.previewText,
      });
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { compiledHtml: html },
      });
    }
  }

  let emailRecipients = 0;
  let smsRecipients = 0;
  if (needsEmail) {
    emailRecipients = await countAudience(ctx.workspace.id, {
      audienceType: campaign.audienceType as "all" | "tags" | "segment",
      audienceTagIds: (campaign.audienceTagIds as string[]) ?? [],
      audienceSegmentId: campaign.audienceSegmentId,
    });
  }
  if (needsSms) {
    const smsAudience = await resolveSmsAudienceContacts(ctx.workspace.id, {
      audienceType: campaign.audienceType as "all" | "tags" | "segment",
      audienceTagIds: (campaign.audienceTagIds as string[]) ?? [],
      audienceSegmentId: campaign.audienceSegmentId,
    });
    smsRecipients = smsAudience.length;
  }

  if (needsEmail && emailRecipients === 0) {
    return NextResponse.json({ error: "Email audience is empty" }, { status: 400 });
  }
  if (needsSms && smsRecipients === 0) {
    return NextResponse.json(
      { error: "Text audience is empty after consent and suppression filters" },
      { status: 400 }
    );
  }

  const recipientCount = Math.max(emailRecipients, smsRecipients);
  if (needsEmail) {
    const quota = await checkLaunchQuota(owner, ctx.workspace.id, emailRecipients);
    if (!quota.ok) {
      return NextResponse.json(
        { error: quota.error, upgradeRequired: quota.upgradeRequired },
        { status: 402 }
      );
    }
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
    const prior = await prisma.campaign.count({
      where: {
        workspaceId: ctx.workspace.id,
        status: { in: ["COMPLETED", "SCHEDULED", "SENDING"] },
        id: { not: campaign.id },
      },
    });
    if (prior === 0) {
      const { trackEvent } = await import("@/lib/analytics");
      trackEvent("first_campaign_scheduled");
    }
    return NextResponse.json({ campaign: updated });
  }

  try {
    let emailResult: { recipientCount: number } | null = null;
    let smsResult: { recipientCount: number } | null = null;
    if (needsEmail) {
      emailResult = await launchCampaign(campaign.id);
    }
    if (needsSms) {
      smsResult = await launchSmsCampaign(campaign.id);
    }
    const updated = await prisma.campaign.findUnique({ where: { id: campaign.id } });
    void maybeAwardReferralSignupCredit(ctx.user.id, "first_campaign");
    const priorSends = await prisma.campaign.count({
      where: {
        workspaceId: ctx.workspace.id,
        status: "COMPLETED",
        id: { not: campaign.id },
      },
    });
    const { trackEvent } = await import("@/lib/analytics");
    if (priorSends === 0) {
      trackEvent("first_campaign_sent");
      try {
        const { markAcquisitionFirstSendForUser } = await import(
          "@/lib/acquisition/lifecycle"
        );
        await markAcquisitionFirstSendForUser(ctx.user.id);
      } catch {
        /* non-blocking */
      }
    } else if (priorSends === 1) {
      trackEvent("second_campaign_sent");
    }
    return NextResponse.json({
      campaign: updated,
      emailRecipientCount: emailResult?.recipientCount ?? 0,
      smsRecipientCount: smsResult?.recipientCount ?? 0,
      recipientCount: (emailResult?.recipientCount ?? 0) + (smsResult?.recipientCount ?? 0),
    });
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
