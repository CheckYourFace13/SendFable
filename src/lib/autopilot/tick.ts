/**
 * Marketing Autopilot worker tick.
 * Fetch → hash → deterministic filter → generate only if marketing-worthy → draft → approval email.
 * NO RESPONSE = NO SEND. Never launches a campaign from this tick.
 */

import { prisma } from "@/lib/prisma";
import { fetchPublicText } from "@/lib/ssrf";
import { withAcquisitionLock } from "@/lib/acquisition/lock";
import { htmlToVisibleText } from "@/lib/autopilot/extract";
import { changeFingerprint, contentFingerprint } from "@/lib/autopilot/hash";
import { assessChange } from "@/lib/autopilot/change-filter";
import { generateWithOptionalLlm } from "@/lib/autopilot/generate";
import { createAutopilotCampaignDraft } from "@/lib/autopilot/draft";
import { sendAutopilotApprovalEmail } from "@/lib/autopilot/approval";
import {
  AUTOPILOT_MAX_GENERATIONS_PER_DAY,
  AUTOPILOT_REMINDER_AFTER_MS,
  FREQUENCY_INTERVAL_MS,
  type AutopilotFrequency,
} from "@/lib/autopilot/types";
import { getWorkspaceEntitlement } from "@/lib/workspace-owner";
import { softwareQuotas } from "@/lib/internal-entitlement";
import { trackEvent } from "@/lib/analytics";
import { ensureAnalyticsPersistence } from "@/lib/analytics-persist";

function isDue(
  lastFetchedAt: Date | null,
  frequency: AutopilotFrequency,
  now: Date
): boolean {
  if (!lastFetchedAt) return true;
  const interval = FREQUENCY_INTERVAL_MS[frequency] ?? FREQUENCY_INTERVAL_MS.DAILY;
  return now.getTime() - lastFetchedAt.getTime() >= interval;
}

async function processConfig(configId: string, now: Date): Promise<string[]> {
  const actions: string[] = [];
  const config = await prisma.marketingAutopilotConfig.findUnique({
    where: { id: configId },
  });
  if (!config || !config.enabled || config.pausedAt) return actions;

  if (!isDue(config.lastFetchedAt, config.checkFrequency, now)) {
    return actions;
  }

  let body: string;
  let finalUrl: string;
  try {
    const fetched = await fetchPublicText(config.pageUrl);
    body = fetched.body;
    finalUrl = fetched.url;
  } catch (err) {
    actions.push(`fetch_fail:${config.id}:${err instanceof Error ? err.message : "err"}`);
    await prisma.marketingAutopilotConfig.update({
      where: { id: config.id },
      data: { lastFetchedAt: now, fetchCount: { increment: 1 } },
    });
    return actions;
  }

  const text = htmlToVisibleText(body);
  const hash = contentFingerprint(text);

  await prisma.marketingAutopilotConfig.update({
    where: { id: config.id },
    data: {
      lastFetchedAt: now,
      fetchCount: { increment: 1 },
      lastContentHash: hash,
    },
  });

  try {
    ensureAnalyticsPersistence();
    trackEvent("autopilot_page_checked");
  } catch {
    /* fail open */
  }

  actions.push(`checked:${config.id}`);

  if (config.lastContentHash && config.lastContentHash === hash) {
    actions.push("unchanged");
    // Still store text for future diffs if missing
    if (!config.lastContentText) {
      await prisma.marketingAutopilotConfig.update({
        where: { id: config.id },
        data: { lastContentText: text },
      });
    }
    return actions;
  }

  const assessment = assessChange(config.lastContentText || "", text);

  // Always update stored text after assessment
  await prisma.marketingAutopilotConfig.update({
    where: { id: config.id },
    data: { lastContentText: text },
  });

  if (!assessment.meaningful) {
    actions.push(`skip:${assessment.reason}`);
    return actions;
  }

  actions.push(`change:${assessment.reason}`);
  try {
    ensureAnalyticsPersistence();
    trackEvent("autopilot_change_detected");
  } catch {
    /* fail open */
  }

  await prisma.marketingAutopilotConfig.update({
    where: { id: config.id },
    data: { meaningfulChangeCount: { increment: 1 } },
  });

  const fp = changeFingerprint(finalUrl, assessment.addedText);

  // Duplicate protection: existing open draft for same change
  const existing = await prisma.marketingAutopilotDraft.findUnique({
    where: {
      workspaceId_changeFingerprint: {
        workspaceId: config.workspaceId,
        changeFingerprint: fp,
      },
    },
  });
  if (existing) {
    if (["AWAITING_APPROVAL", "DRAFTED", "EDITING"].includes(existing.status)) {
      actions.push("dup_open_draft");
      return actions;
    }
    if (["SENT", "APPROVED", "REJECTED"].includes(existing.status)) {
      actions.push("dup_already_handled");
      return actions;
    }
  }

  // Rate limits
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);
  const todayCount = await prisma.marketingAutopilotDraft.count({
    where: { workspaceId: config.workspaceId, createdAt: { gte: dayStart } },
  });
  if (todayCount >= AUTOPILOT_MAX_GENERATIONS_PER_DAY) {
    actions.push("rate_day");
    return actions;
  }

  const ent = await getWorkspaceEntitlement(config.workspaceId);
  const quotas = softwareQuotas({
    isInternal: ent.isInternal,
    disabled: ent.disabled,
    plan: ent.plan,
  });
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthCount = await prisma.marketingAutopilotDraft.count({
    where: { workspaceId: config.workspaceId, createdAt: { gte: monthStart } },
  });
  const monthCap = quotas.autopilotDraftsPerMonth;
  if (monthCap != null && monthCount >= monthCap) {
    actions.push("rate_month");
    return actions;
  }

  // Pending approval already? Don't spam another
  const pending = await prisma.marketingAutopilotDraft.count({
    where: {
      workspaceId: config.workspaceId,
      status: { in: ["AWAITING_APPROVAL", "DRAFTED"] },
    },
  });
  if (pending >= 2) {
    actions.push("pending_cap");
    return actions;
  }

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: config.workspaceId },
  });

  const generated = await generateWithOptionalLlm({
    addedText: assessment.addedText,
    sourceUrl: finalUrl,
    workspaceName: workspace.name,
    reason: assessment.reason,
  });

  if (!generated) {
    actions.push("insufficient_info");
    return actions;
  }

  const { draftId } = await createAutopilotCampaignDraft({
    workspaceId: config.workspaceId,
    configId: config.id,
    sourceUrl: finalUrl,
    changeFingerprint: fp,
    changeSummary: assessment.reason,
    changedContent: assessment.addedText,
    generated,
    audienceType: config.audienceType,
    audienceTagIds: (config.audienceTagIds as string[]) ?? [],
    audienceSegmentId: config.audienceSegmentId,
  });

  actions.push(`drafted:${draftId}`);

  try {
    await sendAutopilotApprovalEmail(draftId);
    actions.push(`approval_email:${draftId}`);
  } catch (err) {
    actions.push(
      `approval_email_fail:${err instanceof Error ? err.message : "err"}`
    );
  }

  return actions;
}

async function expireStale(now: Date): Promise<number> {
  const res = await prisma.marketingAutopilotDraft.updateMany({
    where: {
      status: "AWAITING_APPROVAL",
      expiresAt: { lt: now },
    },
    data: { status: "EXPIRED" },
  });
  return res.count;
}

async function sendReminders(now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - AUTOPILOT_REMINDER_AFTER_MS);
  const drafts = await prisma.marketingAutopilotDraft.findMany({
    where: {
      status: "AWAITING_APPROVAL",
      reminderSentAt: null,
      approvalEmailSentAt: { lte: cutoff },
      config: { remindersEnabled: true, enabled: true },
    },
    take: 10,
    include: { workspace: true },
  });

  let sent = 0;
  for (const d of drafts) {
    try {
      // One reminder max — resend approval email (still never auto-sends)
      await sendAutopilotApprovalEmail(d.id);
      await prisma.marketingAutopilotDraft.update({
        where: { id: d.id },
        data: { reminderSentAt: now },
      });
      sent++;
    } catch {
      /* fail open */
    }
  }
  return sent;
}

export async function runAutopilotTick(now = new Date()): Promise<{
  ran: boolean;
  actions: string[];
}> {
  const lock = await withAcquisitionLock("autopilot-tick", 55, async () => {
    const actions: string[] = [];
    const expired = await expireStale(now);
    if (expired) actions.push(`expired:${expired}`);

    const reminded = await sendReminders(now);
    if (reminded) actions.push(`reminders:${reminded}`);

    const configs = await prisma.marketingAutopilotConfig.findMany({
      where: { enabled: true, pausedAt: null },
      orderBy: { lastFetchedAt: "asc" },
      take: 20,
    });

    for (const c of configs) {
      if (!isDue(c.lastFetchedAt, c.checkFrequency, now)) continue;
      try {
        const a = await processConfig(c.id, now);
        actions.push(...a);
      } catch (err) {
        actions.push(`err:${c.id}:${err instanceof Error ? err.message : "err"}`);
      }
    }

    return actions;
  });

  if (!lock.acquired) return { ran: false, actions: ["lock_busy"] };
  return { ran: true, actions: lock.result || [] };
}
