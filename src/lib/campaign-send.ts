import { prisma } from "@/lib/prisma";
import { sendEmail, isTransientSesError } from "@/lib/mailer";
import { resolveFromHeaders } from "@/lib/identities";
import {
  applyLinkIds,
  compileEmailHtml,
  injectTracking,
  type EmailDesign,
} from "@/lib/email-compiler";
import { contactMergeData, renderMergeTags } from "@/lib/merge";
import { appUrl } from "@/lib/utils";
import { signToken } from "@/lib/tokens";
import { PLANS, BOUNCE_PAUSE_THRESHOLD, COMPLAINT_PAUSE_THRESHOLD, maxRampLevel } from "@/lib/plans";
import { getWorkspaceOwner } from "@/lib/session";
import { incrementMonthlySendCount } from "@/lib/quota";
import { sendCampaignAutoPausedAlert } from "@/lib/transactional";
import { enqueueRecipients, drainCampaignJobs } from "@/lib/queue";
import { resolveAudienceContacts } from "@/lib/audience";

/**
 * Snapshot recipients and enqueue (or inline-process) a campaign send.
 */
export async function launchCampaign(campaignId: string): Promise<{ recipientCount: number }> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { workspace: true, senderIdentity: true },
  });
  if (!campaign) throw new Error("Campaign not found");
  if (!["DRAFT", "SCHEDULED", "PAUSED"].includes(campaign.status)) {
    throw new Error(`Cannot launch campaign in status ${campaign.status}`);
  }
  if (!campaign.senderIdentityId || !campaign.senderIdentity) {
    throw new Error("Sender identity required");
  }
  if (campaign.senderIdentity.status !== "VERIFIED") {
    throw new Error("Sender identity must be verified");
  }
  if (!campaign.subject?.trim()) throw new Error("Subject required");
  if (!campaign.workspace.mailingAddress?.trim()) {
    throw new Error("Workspace physical mailing address required before sending");
  }

  const owner = await getWorkspaceOwner(campaign.workspaceId);
  if (!owner.emailVerified) throw new Error("Verify your email before sending");

  const contacts = await resolveAudienceContacts(campaign.workspaceId, {
    audienceType: campaign.audienceType as "all" | "tags" | "segment",
    audienceTagIds: (campaign.audienceTagIds as string[]) ?? [],
    audienceSegmentId: campaign.audienceSegmentId,
  });

  if (!contacts.length) throw new Error("Audience is empty after suppressions");

  // Clear previous snapshot if relaunching from PAUSED with no pending left, or fresh launch
  if (campaign.status === "DRAFT" || campaign.status === "SCHEDULED") {
    await prisma.campaignRecipient.deleteMany({ where: { campaignId } });
    await prisma.campaignLink.deleteMany({ where: { campaignId } });

    await prisma.campaignRecipient.createMany({
      data: contacts.map((c) => ({
        campaignId,
        contactId: c.id,
        email: c.email,
        mergeData: contactMergeData(c),
        status: "PENDING",
      })),
      skipDuplicates: true,
    });
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "SENDING",
      sentAt: campaign.sentAt ?? new Date(),
      pausedAt: null,
      pauseReason: null,
      recipientCount: contacts.length,
    },
  });

  const pending = await prisma.campaignRecipient.findMany({
    where: { campaignId, status: "PENDING" },
    select: { id: true },
  });

  const jobs = pending.map((r) => ({
    campaignId,
    recipientId: r.id,
    workspaceId: campaign.workspaceId,
  }));

  const mode = await enqueueRecipients(jobs);
  if (mode === "inline") {
    // Process sequentially in background-ish chunks without blocking forever
    void processInline(jobs);
  }

  return { recipientCount: contacts.length };
}

async function processInline(
  jobs: Array<{ campaignId: string; recipientId: string; workspaceId: string }>
) {
  for (const job of jobs) {
    try {
      await sendOneRecipient(job.recipientId);
    } catch (err) {
      console.error("[inline-send]", job.recipientId, err);
    }
  }
}

export async function sendOneRecipient(recipientId: string): Promise<void> {
  const recipient = await prisma.campaignRecipient.findUnique({
    where: { id: recipientId },
    include: {
      campaign: {
        include: { workspace: true, senderIdentity: true },
      },
      contact: true,
    },
  });
  if (!recipient) return;

  const { campaign } = recipient;
  if (campaign.status === "PAUSED" || campaign.status === "CANCELLED") {
    return; // leave PENDING for resume, or skip
  }
  if (campaign.status !== "SENDING") return;
  if (recipient.status !== "PENDING") return;

  const identity = campaign.senderIdentity;
  if (!identity) {
    await prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: { status: "FAILED", error: "No sender identity" },
    });
    return;
  }

  const owner = await getWorkspaceOwner(campaign.workspaceId);
  const showBadge = PLANS[owner.plan].badge;

  let html = campaign.compiledHtml ?? "";
  if (!html && campaign.designJson) {
    html = compileEmailHtml(campaign.designJson as unknown as EmailDesign, {
      mailingAddress: campaign.workspace.mailingAddress,
      showSendfableBadge: showBadge,
      previewText: campaign.previewText,
    });
  }

  const unsubToken = await signToken(
    "unsubscribe",
    { recipientId, workspaceId: campaign.workspaceId, email: recipient.email },
    "90d"
  );
  const unsubUrl = appUrl(`/unsubscribe/${unsubToken}`);
  const oneClickUrl = appUrl(`/api/unsubscribe/one-click?token=${encodeURIComponent(unsubToken)}`);
  const mailtoUnsub = `mailto:unsubscribe@${process.env.PLATFORM_SEND_DOMAIN || "send.sendfable.com"}?subject=unsubscribe`;

  // Replace unsubscribe placeholder then merge tags
  html = html.replaceAll("{{unsubscribe_url}}", unsubUrl);
  const mergeData = {
    ...((recipient.mergeData as Record<string, string>) ?? {}),
    unsubscribe_url: unsubUrl,
  };
  html = renderMergeTags(html, mergeData);
  const subject = renderMergeTags(campaign.subject ?? "", mergeData);

  const { html: trackedHtml, links } = injectTracking(html, recipientId, appUrl());

  // Persist campaign links (dedupe by index for this campaign)
  const existingLinks = await prisma.campaignLink.findMany({
    where: { campaignId: campaign.id },
    orderBy: { index: "asc" },
  });
  let linkIds: string[];
  if (existingLinks.length >= links.length && existingLinks.length > 0) {
    linkIds = existingLinks.slice(0, links.length).map((l) => l.id);
  } else {
    // Create missing links
    linkIds = [];
    for (let i = 0; i < links.length; i++) {
      const existing = existingLinks.find((l) => l.index === i);
      if (existing) {
        linkIds.push(existing.id);
      } else {
        const created = await prisma.campaignLink.create({
          data: { campaignId: campaign.id, url: links[i], index: i },
        });
        linkIds.push(created.id);
      }
    }
  }

  const finalHtml = applyLinkIds(trackedHtml, linkIds);
  const { from, replyTo } = resolveFromHeaders(identity);

  try {
    const result = await sendEmail({
      from,
      to: recipient.email,
      replyTo,
      subject,
      html: finalHtml,
      headers: {
        "List-Unsubscribe": `<${mailtoUnsub}>, <${oneClickUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      tags: {
        campaignId: campaign.id,
        recipientId,
        workspaceId: campaign.workspaceId,
      },
    });

    await prisma.$transaction([
      prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: {
          status: "SENT",
          sesMessageId: result.messageId || `local-${recipientId}`,
          sentAt: new Date(),
          attemptCount: { increment: 1 },
        },
      }),
      prisma.campaign.update({
        where: { id: campaign.id },
        data: { sentCount: { increment: 1 } },
      }),
    ]);

    await incrementMonthlySendCount(owner.id, 1);
    await maybeCompleteCampaign(campaign.id);
  } catch (err) {
    const attempts = recipient.attemptCount + 1;
    if (isTransientSesError(err) && attempts < 3) {
      await prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: { attemptCount: attempts, error: String(err) },
      });
      throw err; // let BullMQ retry
    }
    await prisma.$transaction([
      prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: {
          status: "FAILED",
          error: err instanceof Error ? err.message : String(err),
          attemptCount: attempts,
        },
      }),
      prisma.campaign.update({
        where: { id: campaign.id },
        data: { failedCount: { increment: 1 } },
      }),
    ]);
    await maybeCompleteCampaign(campaign.id);
  }
}

export async function maybeCompleteCampaign(campaignId: string): Promise<void> {
  const pending = await prisma.campaignRecipient.count({
    where: { campaignId, status: "PENDING" },
  });
  if (pending > 0) return;

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.status !== "SENDING") return;

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  // Ramp up on clean campaigns
  const sent = Math.max(1, campaign.sentCount);
  const bounceRate = campaign.bounceCount / sent;
  const complaintRate = campaign.complaintCount / sent;
  if (bounceRate < BOUNCE_PAUSE_THRESHOLD && complaintRate < COMPLAINT_PAUSE_THRESHOLD) {
    const owner = await getWorkspaceOwner(campaign.workspaceId);
    const max = maxRampLevel(owner.plan);
    if (owner.accountRampLevel < max) {
      await prisma.user.update({
        where: { id: owner.id },
        data: { accountRampLevel: { increment: 1 } },
      });
    }
  }
}

export async function pauseCampaign(
  campaignId: string,
  reason: "manual" | "auto-bounce" | "auto-complaint" = "manual"
): Promise<void> {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "PAUSED", pausedAt: new Date(), pauseReason: reason },
  });
  // Jobs check status; drain waiting to avoid pointless retries
  await drainCampaignJobs(campaignId);
}

export async function resumeCampaign(campaignId: string): Promise<void> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.status !== "PAUSED") throw new Error("Campaign is not paused");

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "SENDING", pausedAt: null, pauseReason: null },
  });

  const pending = await prisma.campaignRecipient.findMany({
    where: { campaignId, status: "PENDING" },
    select: { id: true },
  });

  const jobs = pending.map((r) => ({
    campaignId,
    recipientId: r.id,
    workspaceId: campaign.workspaceId,
  }));
  const mode = await enqueueRecipients(jobs);
  if (mode === "inline") void processInline(jobs);
}

export async function cancelCampaign(campaignId: string): Promise<void> {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "CANCELLED", completedAt: new Date() },
  });
  await prisma.campaignRecipient.updateMany({
    where: { campaignId, status: "PENDING" },
    data: { status: "SKIPPED" },
  });
  await drainCampaignJobs(campaignId);
}

/** Called from SNS webhook after bounce/complaint counters update. */
export async function checkAutoPause(campaignId: string): Promise<void> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign || campaign.status !== "SENDING") return;

  const denom = Math.max(1, campaign.sentCount);
  const bounceRate = campaign.bounceCount / denom;
  const complaintRate = campaign.complaintCount / denom;

  if (bounceRate > BOUNCE_PAUSE_THRESHOLD || complaintRate > COMPLAINT_PAUSE_THRESHOLD) {
    const reason =
      complaintRate > COMPLAINT_PAUSE_THRESHOLD ? "auto-complaint" : "auto-bounce";
    await pauseCampaign(campaignId, reason);

    const owner = await getWorkspaceOwner(campaign.workspaceId);
    await prisma.user.update({
      where: { id: owner.id },
      data: {
        flaggedAt: new Date(),
        flagReason: `Campaign ${campaign.name} auto-paused (${reason})`,
      },
    });
    await sendCampaignAutoPausedAlert(
      owner.email,
      campaign.name,
      reason === "auto-complaint"
        ? "complaint rate exceeded 0.1%"
        : "bounce rate exceeded 5%",
      campaignId
    );
  }
}
