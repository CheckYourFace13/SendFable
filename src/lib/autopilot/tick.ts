/**
 * Marketing Autopilot worker tick.
 * Fetch → hash → deterministic filter → generate only if marketing-worthy → draft → approval email.
 * NO RESPONSE = NO SEND. Never launches a campaign from this tick.
 */

import { prisma } from "@/lib/prisma";
import { fetchPublicText } from "@/lib/ssrf";
import { withAcquisitionLock } from "@/lib/acquisition/lock";
import { htmlToVisibleText } from "@/lib/autopilot/extract";
import { changeFingerprint, changesAreSimilar, contentFingerprint } from "@/lib/autopilot/hash";
import { assessChange } from "@/lib/autopilot/change-filter";
import { generateWithOptionalLlm } from "@/lib/autopilot/generate";
import { createAutopilotCampaignDraft } from "@/lib/autopilot/draft";
import { sendAutopilotApprovalEmail } from "@/lib/autopilot/approval";
import { resolveAutopilotCreation, suggestBrandFromHtml } from "@/lib/autopilot/commercial-account";
import { imageCandidates, pickImage } from "@/lib/acquisition/website-demo/extract";
import { confirmSameSiteImage } from "@/lib/acquisition/website-demo/image";
import {
  AUTOPILOT_MAX_GENERATIONS_PER_DAY,
  AUTOPILOT_REMINDER_AFTER_MS,
  FREQUENCY_INTERVAL_MS,
  type AutopilotFrequency,
} from "@/lib/autopilot/types";
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
    if (["SENT", "APPROVED", "REJECTED", "EXPIRED"].includes(existing.status)) {
      actions.push("dup_already_handled");
      return actions;
    }
  }

  const related = await prisma.marketingAutopilotDraft.findMany({
    where: { workspaceId: config.workspaceId, sourceUrl: finalUrl },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { status: true, changedContent: true },
  });
  for (const prior of related) {
    if (!prior.changedContent || !changesAreSimilar(prior.changedContent, assessment.addedText)) continue;
    if (["AWAITING_APPROVAL", "DRAFTED", "EDITING"].includes(prior.status)) {
      actions.push("dup_similar_open");
      return actions;
    }
    if (["SENT", "APPROVED", "REJECTED", "EXPIRED"].includes(prior.status)) {
      actions.push("dup_similar_handled");
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

  const choice = await resolveAutopilotCreation(config.workspaceId, now);
  if (!choice) {
    actions.push("no_creation_entitlement");
    return actions;
  }

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: config.workspaceId },
  });

  try {
    await suggestBrandFromHtml(config.workspaceId, body, finalUrl);
  } catch {
    /* brand suggestion never blocks a draft */
  }

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

  let imageUrl: string | null = null;
  let imageAlt: string | null = null;
  const picked = pickImage(imageCandidates(body, finalUrl), generated.headline, finalUrl);
  if (picked) {
    const check = await confirmSameSiteImage(picked.src, finalUrl);
    if (check === "ok") {
      imageUrl = picked.src;
      imageAlt = picked.alt || generated.headline;
    }
  }

  let draftId: string;
  try {
    const created = await createAutopilotCampaignDraft({
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
      choice,
      imageUrl,
      imageAlt,
    });
    draftId = created.draftId;
  } catch (err) {
    actions.push(
      `create_blocked:${err instanceof Error ? err.message : "err"}`
    );
    return actions;
  }

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

/** One reminder per waiting draft. A draft with no response stays AWAITING_APPROVAL. */
export async function sendDueAutopilotReminders(now: Date, onlyDraftId?: string): Promise<number> {
  const cutoff = new Date(now.getTime() - AUTOPILOT_REMINDER_AFTER_MS);
  const drafts = await prisma.marketingAutopilotDraft.findMany({
    where: {
      ...(onlyDraftId ? { id: onlyDraftId } : {}),
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
    const reminded = await sendDueAutopilotReminders(now);
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
