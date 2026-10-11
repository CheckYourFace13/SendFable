/**
 * Opt-in automatic welcome for workspaces with Workspace.autoWelcomeEnabled.
 * One welcome per contact subscribe cycle; uses campaign queue + SES.
 */
import { prisma } from "@/lib/prisma";
import { launchCampaign } from "@/lib/campaign-send";
import { isCampaignSendEnabled } from "@/lib/campaign-send-gate";
import { isSuppressed } from "@/lib/suppression";
import { compileEmailHtml, type EmailDesign } from "@/lib/email-compiler";
import { showSendfableBadgeFor } from "@/lib/internal-entitlement";
import { getWorkspaceOwner } from "@/lib/workspace-owner";
import { randomToken } from "@/lib/utils";
import { theDrinkPlaceWelcomeHtml } from "@/lib/newsletter/welcome-html";
import {
  enqueueAutomationSend,
  welcomeIdempotencyKey,
  MAX_ATTEMPTS,
  nextBackoff,
} from "@/lib/newsletter/ledger";

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

export async function maybeEnqueueAutoWelcome(opts: {
  workspaceId: string;
  contactId: string;
  /** True when this accept transitioned the contact into SUBSCRIBED. */
  becameSubscribed: boolean;
  test?: boolean;
}): Promise<{ enqueued: boolean; reason: string }> {
  if (opts.test) return { enqueued: false, reason: "test_submit" };
  if (!opts.becameSubscribed) return { enqueued: false, reason: "not_new_subscribe" };

  const ws = await prisma.workspace.findUnique({
    where: { id: opts.workspaceId },
    select: {
      id: true,
      name: true,
      autoWelcomeEnabled: true,
      isInternal: true,
      disabledAt: true,
      mailingAddress: true,
    },
  });
  if (!ws?.autoWelcomeEnabled) {
    return { enqueued: false, reason: "auto_welcome_disabled" };
  }
  if (!isCampaignSendEnabled()) {
    return { enqueued: false, reason: "campaign_send_disabled" };
  }

  const contact = await prisma.contact.findFirst({
    where: { id: opts.contactId, workspaceId: opts.workspaceId },
    select: { id: true, email: true, status: true },
  });
  if (!contact?.email || contact.status !== "SUBSCRIBED") {
    return { enqueued: false, reason: "contact_not_subscribed" };
  }

  const { enqueued } = await enqueueAutomationSend({
    workspaceId: opts.workspaceId,
    kind: "welcome",
    idempotencyKey: welcomeIdempotencyKey(contact.id),
    contactId: contact.id,
  });
  return { enqueued, reason: enqueued ? "enqueued" : "duplicate_key" };
}

export async function processWelcomeLedgerJob(jobId: string): Promise<{
  ok: boolean;
  status: string;
  detail?: string;
  campaignId?: string;
}> {
  const job = await prisma.automationSendLedger.findUnique({ where: { id: jobId } });
  if (!job || job.kind !== "welcome") {
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
  if (!claimed.count) {
    return { ok: true, status: "busy_or_not_due" };
  }

  const ws = await prisma.workspace.findUnique({ where: { id: job.workspaceId } });
  if (!ws?.autoWelcomeEnabled) {
    await prisma.automationSendLedger.update({
      where: { id: jobId },
      data: { status: "SKIPPED", lastError: "auto_welcome_disabled", updatedAt: new Date() },
    });
    return { ok: true, status: "SKIPPED", detail: "auto_welcome_disabled" };
  }
  if (!isCampaignSendEnabled()) {
    await failOrRetry(jobId, job.attempts, "campaign_send_disabled");
    return { ok: false, status: "retry", detail: "campaign_send_disabled" };
  }
  if (!ws.mailingAddress?.trim()) {
    await failOrRetry(jobId, job.attempts, "mailing_address_required");
    return { ok: false, status: "retry", detail: "mailing_address_required" };
  }

  const contact = job.contactId
    ? await prisma.contact.findFirst({
        where: { id: job.contactId, workspaceId: job.workspaceId },
      })
    : null;
  if (!contact?.email || contact.status !== "SUBSCRIBED") {
    await prisma.automationSendLedger.update({
      where: { id: jobId },
      data: { status: "SKIPPED", lastError: "not_subscribed", updatedAt: new Date() },
    });
    return { ok: true, status: "SKIPPED", detail: "not_subscribed" };
  }

  if (await isSuppressed(job.workspaceId, contact.email)) {
    await prisma.automationSendLedger.update({
      where: { id: jobId },
      data: { status: "SKIPPED", lastError: "suppressed", updatedAt: new Date() },
    });
    return { ok: true, status: "SKIPPED", detail: "suppressed" };
  }

  // Per-contact audience tag so welcome never fans out to the full list.
  const tagName = `auto-welcome:${contact.id}`;
  const tag = await prisma.tag.upsert({
    where: { workspaceId_name: { workspaceId: job.workspaceId, name: tagName } },
    create: { workspaceId: job.workspaceId, name: tagName, color: "#1B4332" },
    update: {},
  });
  await prisma.contactTag.deleteMany({ where: { tagId: tag.id } });
  await prisma.contactTag.create({
    data: { contactId: contact.id, tagId: tag.id },
  });

  const identity = await prisma.senderIdentity.findFirst({
    where: { workspaceId: job.workspaceId, status: "VERIFIED" },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  if (!identity) {
    await failOrRetry(jobId, job.attempts, "no_verified_sender");
    return { ok: false, status: "retry", detail: "no_verified_sender" };
  }

  const owner = await getWorkspaceOwner(job.workspaceId);
  // Content pack is TheDrinkPlace-only until other brands opt in with their own templates.
  if (ws.name !== "TheDrinkPlace") {
    await prisma.automationSendLedger.update({
      where: { id: jobId },
      data: {
        status: "SKIPPED",
        lastError: "no_welcome_template_for_workspace",
        updatedAt: new Date(),
      },
    });
    return { ok: true, status: "SKIPPED", detail: "no_welcome_template_for_workspace" };
  }
  const html = theDrinkPlaceWelcomeHtml();
  const design = designFromHtmlBody(html);
  const compiledHtml = compileEmailHtml(design, {
    businessName: ws.name,
    mailingAddress: ws.mailingAddress,
    showSendfableBadge: showSendfableBadgeFor({
      isInternal: ws.isInternal,
      disabledAt: ws.disabledAt,
      plan: owner.plan,
    }),
    previewText: "Discover your next great drink—close to home or somewhere new.",
  });

  let campaignId = job.campaignId;
  if (!campaignId) {
    const campaign = await prisma.campaign.create({
      data: {
        workspaceId: job.workspaceId,
        name: `Auto welcome ${contact.email}`,
        subject: `Welcome to ${ws.name}`,
        previewText: "Explore drinks, destinations, and happy hours",
        status: "DRAFT",
        channel: "EMAIL",
        goal: "welcome",
        audienceType: "tags",
        audienceTagIds: [tag.id],
        senderIdentityId: identity.id,
        designJson: design as object,
        compiledHtml,
        simpleMode: true,
      },
    });
    campaignId = campaign.id;
    await prisma.automationSendLedger.update({
      where: { id: jobId },
      data: { campaignId, updatedAt: new Date() },
    });
  }

  try {
    const launched = await launchCampaign(campaignId);
    if (launched.recipientCount < 1) {
      await prisma.automationSendLedger.update({
        where: { id: jobId },
        data: {
          status: "SKIPPED",
          lastError: "empty_audience",
          campaignId,
          updatedAt: new Date(),
        },
      });
      return { ok: true, status: "SKIPPED", detail: "empty_audience", campaignId };
    }
    await prisma.automationSendLedger.update({
      where: { id: jobId },
      data: {
        status: "SENT",
        campaignId,
        lastError: null,
        updatedAt: new Date(),
      },
    });
    return { ok: true, status: "SENT", campaignId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/empty|audience|suppress/i.test(message)) {
      await prisma.automationSendLedger.update({
        where: { id: jobId },
        data: {
          status: "SKIPPED",
          lastError: message.slice(0, 500),
          campaignId,
          updatedAt: new Date(),
        },
      });
      return { ok: true, status: "SKIPPED", detail: message, campaignId };
    }
    await failOrRetry(jobId, job.attempts, message);
    return { ok: false, status: "retry", detail: message, campaignId };
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
