/**
 * Opt-in Autopilot auto-send (MarketingAutopilotConfig.autoSendEnabled).
 * Skips approval email; launches via existing campaign queue + SES.
 * Other brands keep approval-only behavior when the flag is false.
 */
import { prisma } from "@/lib/prisma";
import { launchCampaign } from "@/lib/campaign-send";
import { isCampaignSendEnabled } from "@/lib/campaign-send-gate";
import {
  autopilotAutoIdempotencyKey,
  enqueueAutomationSend,
  MAX_ATTEMPTS,
  nextBackoff,
} from "@/lib/newsletter/ledger";

export async function enqueueAutopilotAutoSend(opts: {
  workspaceId: string;
  draftId: string;
  campaignId: string;
}): Promise<{ enqueued: boolean }> {
  const { enqueued } = await enqueueAutomationSend({
    workspaceId: opts.workspaceId,
    kind: "autopilot_auto",
    idempotencyKey: autopilotAutoIdempotencyKey(opts.draftId),
    draftId: opts.draftId,
    campaignId: opts.campaignId,
  });
  return { enqueued };
}

export async function processAutopilotAutoLedgerJob(jobId: string): Promise<{
  ok: boolean;
  status: string;
  detail?: string;
  campaignId?: string;
}> {
  const job = await prisma.automationSendLedger.findUnique({ where: { id: jobId } });
  if (!job || job.kind !== "autopilot_auto") {
    return { ok: false, status: "missing" };
  }
  if (job.status === "SENT" || job.status === "SKIPPED") {
    return { ok: true, status: job.status, campaignId: job.campaignId ?? undefined };
  }

  const claimed = await prisma.automationSendLedger.updateMany({
    where: {
      id: jobId,
      status: { in: ["PENDING", "FAILED"] },
      nextAttemptAt: { lte: new Date() },
    },
    data: { status: "PROCESSING", updatedAt: new Date() },
  });
  if (!claimed.count) return { ok: true, status: "busy_or_not_due" };

  if (!isCampaignSendEnabled()) {
    await failOrRetry(jobId, job.attempts, "campaign_send_disabled");
    return { ok: false, status: "retry", detail: "campaign_send_disabled" };
  }

  const draft = job.draftId
    ? await prisma.marketingAutopilotDraft.findUnique({
        where: { id: job.draftId },
        include: { config: true, campaign: true },
      })
    : null;

  if (!draft?.campaignId || !draft.config) {
    await prisma.automationSendLedger.update({
      where: { id: jobId },
      data: { status: "SKIPPED", lastError: "draft_missing", updatedAt: new Date() },
    });
    return { ok: true, status: "SKIPPED", detail: "draft_missing" };
  }

  if (!draft.config.autoSendEnabled || !draft.config.enabled || draft.config.pausedAt) {
    await prisma.automationSendLedger.update({
      where: { id: jobId },
      data: { status: "SKIPPED", lastError: "auto_send_disabled", updatedAt: new Date() },
    });
    return { ok: true, status: "SKIPPED", detail: "auto_send_disabled" };
  }

  if (["SENT", "APPROVED", "REJECTED", "EXPIRED"].includes(draft.status)) {
    await prisma.automationSendLedger.update({
      where: { id: jobId },
      data: {
        status: draft.status === "SENT" || draft.status === "APPROVED" ? "SENT" : "SKIPPED",
        campaignId: draft.campaignId,
        updatedAt: new Date(),
      },
    });
    return { ok: true, status: "already_decided", campaignId: draft.campaignId };
  }

  const campaign = draft.campaign;
  if (!campaign) {
    await failOrRetry(jobId, job.attempts, "campaign_missing");
    return { ok: false, status: "retry", detail: "campaign_missing" };
  }

  if (["SENDING", "COMPLETED"].includes(campaign.status)) {
    await prisma.marketingAutopilotDraft.update({
      where: { id: draft.id },
      data: {
        status: "SENT",
        decidedAt: new Date(),
        decidedAction: "APPROVE",
      },
    });
    await prisma.marketingAutopilotConfig.update({
      where: { id: draft.configId },
      data: { lastAutoSentAt: new Date() },
    });
    await prisma.automationSendLedger.update({
      where: { id: jobId },
      data: {
        status: "SENT",
        campaignId: campaign.id,
        lastError: null,
        updatedAt: new Date(),
      },
    });
    return { ok: true, status: "SENT", campaignId: campaign.id };
  }

  if (!["DRAFT", "SCHEDULED", "PAUSED"].includes(campaign.status)) {
    await prisma.automationSendLedger.update({
      where: { id: jobId },
      data: {
        status: "SKIPPED",
        lastError: `campaign_status_${campaign.status}`,
        updatedAt: new Date(),
      },
    });
    return { ok: true, status: "SKIPPED", detail: campaign.status };
  }

  // Mark approved before launch (mirrors manual approve path; token unused).
  await prisma.marketingAutopilotDraft.update({
    where: { id: draft.id },
    data: {
      status: "APPROVED",
      decidedAt: new Date(),
      decidedAction: "APPROVE",
      approvalTokenVersion: { increment: 1 },
    },
  });

  try {
    const launched = await launchCampaign(campaign.id);
    if (launched.recipientCount < 1) {
      await prisma.marketingAutopilotDraft.update({
        where: { id: draft.id },
        data: {
          status: "REJECTED",
          decidedAction: "REJECT",
          decidedAt: new Date(),
        },
      });
      await prisma.automationSendLedger.update({
        where: { id: jobId },
        data: {
          status: "SKIPPED",
          lastError: "empty_audience",
          campaignId: campaign.id,
          updatedAt: new Date(),
        },
      });
      return { ok: true, status: "SKIPPED", detail: "empty_audience", campaignId: campaign.id };
    }

    await prisma.marketingAutopilotDraft.update({
      where: { id: draft.id },
      data: { status: "SENT" },
    });
    await prisma.marketingAutopilotConfig.update({
      where: { id: draft.configId },
      data: { lastAutoSentAt: new Date() },
    });
    await prisma.automationSendLedger.update({
      where: { id: jobId },
      data: {
        status: "SENT",
        campaignId: campaign.id,
        lastError: null,
        updatedAt: new Date(),
      },
    });
    return { ok: true, status: "SENT", campaignId: campaign.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Roll draft back so retry can relaunch
    await prisma.marketingAutopilotDraft.update({
      where: { id: draft.id },
      data: {
        status: "DRAFTED",
        decidedAt: null,
        decidedAction: null,
      },
    });
    if (/empty|audience|suppress/i.test(message)) {
      await prisma.automationSendLedger.update({
        where: { id: jobId },
        data: {
          status: "SKIPPED",
          lastError: message.slice(0, 500),
          campaignId: campaign.id,
          updatedAt: new Date(),
        },
      });
      return { ok: true, status: "SKIPPED", detail: message, campaignId: campaign.id };
    }
    await failOrRetry(jobId, job.attempts, message);
    return { ok: false, status: "retry", detail: message, campaignId: campaign.id };
  }
}

async function failOrRetry(jobId: string, attempts: number, error: string) {
  const next = attempts + 1;
  if (next >= MAX_ATTEMPTS) {
    await prisma.automationSendLedger.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        attempts: next,
        lastError: error.slice(0, 500),
        updatedAt: new Date(),
      },
    });
    return;
  }
  await prisma.automationSendLedger.update({
    where: { id: jobId },
    data: {
      status: "FAILED",
      attempts: next,
      nextAttemptAt: nextBackoff(next),
      lastError: error.slice(0, 500),
      updatedAt: new Date(),
    },
  });
}
