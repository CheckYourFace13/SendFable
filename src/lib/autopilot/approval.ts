import { prisma } from "@/lib/prisma";
import { signToken, verifyToken } from "@/lib/tokens";
import { appUrl } from "@/lib/utils";
import { platformFrom, sendEmail } from "@/lib/mailer";
import { getWorkspaceOwner } from "@/lib/workspace-owner";
import { countAudience } from "@/lib/audience";
import type { AutopilotAction } from "@/lib/autopilot/types";
import {
  formatScheduledWhen,
  parseAutopilotSchedule,
  resolveDefaultTimezone,
} from "@/lib/autopilot/schedule";
import { trackEvent } from "@/lib/analytics";
import { ensureAnalyticsPersistence } from "@/lib/analytics-persist";
import { humanizeScribeChange, renderAutopilotApprovalEmail } from "@/lib/autopilot/approval-copy";
import {
  AUDIENCE_MISSING,
  campaignAudienceIsSendable,
  labelCampaignAudience,
} from "@/lib/autopilot/audience";
import {
  resolveAutopilotReviewOutcome,
  type AutopilotReviewOutcome,
} from "@/lib/autopilot/review-outcome";
import { launchCampaign } from "@/lib/campaign-send";

export { humanizeScribeChange, renderAutopilotApprovalEmail } from "@/lib/autopilot/approval-copy";
export { resolveAutopilotReviewOutcome, type AutopilotReviewOutcome } from "@/lib/autopilot/review-outcome";

export async function signAutopilotActionToken(opts: {
  draftId: string;
  workspaceId: string;
  action: AutopilotAction;
  version: number;
}): Promise<string> {
  return signToken(
    "autopilot-action",
    {
      draftId: opts.draftId,
      workspaceId: opts.workspaceId,
      action: opts.action,
      v: String(opts.version),
    },
    "7d"
  );
}

export async function verifyAutopilotActionToken(token: string): Promise<{
  draftId: string;
  workspaceId: string;
  action: AutopilotAction;
  version: number;
} | null> {
  const payload = await verifyToken("autopilot-action", token);
  if (!payload?.draftId || !payload.workspaceId || !payload.action || !payload.v) return null;
  if (!["approve", "reject", "edit", "send"].includes(payload.action)) return null;
  return {
    draftId: payload.draftId,
    workspaceId: payload.workspaceId,
    action: payload.action as AutopilotAction,
    version: Number(payload.v),
  };
}

export async function sendAutopilotApprovalEmail(draftId: string): Promise<void> {
  const draft = await prisma.marketingAutopilotDraft.findUnique({
    where: { id: draftId },
    include: {
      workspace: true,
      campaign: true,
      config: true,
    },
  });
  if (!draft || !draft.campaign) throw new Error("Draft not found");
  if (!["DRAFTED", "AWAITING_APPROVAL"].includes(draft.status)) {
    throw new Error(`Cannot send approval for status ${draft.status}`);
  }

  const owner = await getWorkspaceOwner(draft.workspaceId);
  const recipients = await countAudience(draft.workspaceId, {
    audienceType: (draft.campaign.audienceType as "all" | "tags" | "segment") || "all",
    audienceTagIds: (draft.campaign.audienceTagIds as string[]) ?? [],
    audienceSegmentId: draft.campaign.audienceSegmentId,
  });

  const v = draft.approvalTokenVersion;
  const [sendTok, approveTok, rejectTok, editTok] = await Promise.all([
    signAutopilotActionToken({
      draftId: draft.id,
      workspaceId: draft.workspaceId,
      action: "send",
      version: v,
    }),
    signAutopilotActionToken({
      draftId: draft.id,
      workspaceId: draft.workspaceId,
      action: "approve",
      version: v,
    }),
    signAutopilotActionToken({
      draftId: draft.id,
      workspaceId: draft.workspaceId,
      action: "reject",
      version: v,
    }),
    signAutopilotActionToken({
      draftId: draft.id,
      workspaceId: draft.workspaceId,
      action: "edit",
      version: v,
    }),
  ]);

  const sendNowUrl = appUrl(`/autopilot/review?t=${encodeURIComponent(sendTok)}`);
  const scheduleUrl = appUrl(`/autopilot/review?t=${encodeURIComponent(approveTok)}`);
  const rejectUrl = appUrl(`/autopilot/review?t=${encodeURIComponent(rejectTok)}`);
  const editUrl = appUrl(`/autopilot/review?t=${encodeURIComponent(editTok)}`);

  const previewSnippet = (draft.campaign.compiledHtml || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);

  const changeLine = humanizeScribeChange(
    draft.explanation || draft.changeSummary,
    draft.subject || draft.campaign.subject
  );
  const brandName = draft.workspace.name?.trim() || "your workspace";
  const audienceTagIds = (draft.campaign.audienceTagIds as string[]) ?? [];
  const audienceTags = audienceTagIds.length
    ? await prisma.tag.findMany({
        where: { workspaceId: draft.workspaceId, id: { in: audienceTagIds } },
        select: { id: true, name: true },
      })
    : [];
  const audienceLabel = labelCampaignAudience({
    audienceType: draft.campaign.audienceType,
    audienceTagIds,
    audiences: audienceTags,
  });
  const rendered = renderAutopilotApprovalEmail({
    brandName,
    changeLine,
    subject: draft.subject || "(no subject)",
    audienceLabel,
    recipients,
    previewSnippet,
    sendNowUrl,
    scheduleUrl,
    editUrl,
    rejectUrl,
    imageUrl: draft.imageUrl,
  });

  await sendEmail({
    from: platformFrom("SendFable"),
    to: draft.workspace.approvalEmail?.trim() || owner.email,
    subject: "Your next campaign is ready to review",
    html: rendered.html,
    text: rendered.text,
  });

  await prisma.marketingAutopilotDraft.update({
    where: { id: draft.id },
    data: {
      status: "AWAITING_APPROVAL",
      approvalEmailSentAt: new Date(),
    },
  });

  try {
    ensureAnalyticsPersistence();
    trackEvent("autopilot_approval_email_sent");
  } catch {
    /* fail open */
  }
}

export async function loadAutopilotReview(token: string) {
  const verified = await verifyAutopilotActionToken(token);
  if (!verified) return { error: "invalid_token" as const };

  const draft = await prisma.marketingAutopilotDraft.findFirst({
    where: { id: verified.draftId, workspaceId: verified.workspaceId },
    include: { campaign: true, workspace: true },
  });
  if (!draft) return { error: "not_found" as const };

  const audienceTagIds = (draft.campaign?.audienceTagIds as string[]) ?? [];
  const audienceTags = audienceTagIds.length
    ? await prisma.tag.findMany({
        where: { workspaceId: draft.workspaceId, id: { in: audienceTagIds } },
        select: { id: true, name: true },
      })
    : [];
  const audienceLabel = draft.campaign
    ? labelCampaignAudience({
        audienceType: draft.campaign.audienceType,
        audienceTagIds,
        audiences: audienceTags,
      })
    : "Everyone subscribed";
  const recipients = draft.campaign
    ? await countAudience(draft.workspaceId, {
        audienceType: (draft.campaign.audienceType as "all" | "tags" | "segment") || "all",
        audienceTagIds,
        audienceSegmentId: draft.campaign.audienceSegmentId,
      })
    : 0;
  const defaultTimezone = resolveDefaultTimezone({
    workspaceTimezone: draft.workspace.timezone,
  });

  const tokenMatches = draft.approvalTokenVersion === verified.version;
  const open =
    tokenMatches && ["AWAITING_APPROVAL", "DRAFTED", "EDITING"].includes(draft.status);

  if (!open) {
    // Token may be stale after a successful decide — never show a bare "already used"
    // when we can report the real campaign/draft state.
    const resolved = resolveAutopilotReviewOutcome(draft);
    return {
      draft,
      action: verified.action,
      recipients,
      audienceLabel,
      defaultTimezone,
      outcome: resolved.outcome,
      scheduledLabel: resolved.scheduledLabel,
    };
  }

  return {
    draft,
    action: verified.action,
    recipients,
    token,
    audienceLabel,
    defaultTimezone,
    outcome: "open" as const,
  };
}

/**
 * Execute owner decision. Approve requires confirm=true from the confirmation POST.
 * GET never sends.
 */
export async function executeAutopilotAction(opts: {
  token: string;
  confirm: boolean;
  date?: string | null;
  time?: string | null;
  timezone?: string | null;
  mode?: "send_now" | "schedule" | null;
}): Promise<
  | {
      ok: true;
      result: "scheduled" | "rejected" | "edit" | "sent";
      campaignId?: string;
      scheduledLabel?: string;
    }
  | { ok: false; error: string }
> {
  const verified = await verifyAutopilotActionToken(opts.token);
  if (!verified) return { ok: false, error: "invalid_token" };

  const draft = await prisma.marketingAutopilotDraft.findFirst({
    where: { id: verified.draftId, workspaceId: verified.workspaceId },
    include: { campaign: true },
  });
  if (!draft) return { ok: false, error: "not_found" };

  // Idempotent replay: stale token after a successful decide returns the real state.
  if (draft.approvalTokenVersion !== verified.version) {
    const resolved = resolveAutopilotReviewOutcome(draft);
    if (resolved.outcome === "scheduled") {
      return {
        ok: true,
        result: "scheduled",
        campaignId: draft.campaignId ?? undefined,
        scheduledLabel: resolved.scheduledLabel || "the time you chose",
      };
    }
    if (resolved.outcome === "sent") {
      return {
        ok: true,
        result: "sent",
        campaignId: draft.campaignId ?? undefined,
        scheduledLabel: "already sent",
      };
    }
    if (resolved.outcome === "rejected") {
      return { ok: true, result: "rejected" };
    }
    if (resolved.outcome === "editing") {
      return { ok: true, result: "edit", campaignId: draft.campaignId ?? undefined };
    }
    return { ok: false, error: "already_decided" };
  }

  const wantsSendNow =
    verified.action === "send" ||
    (verified.action === "approve" && opts.mode === "send_now");

  if (wantsSendNow) {
    return sendNowAutopilotDraft({
      draftId: draft.id,
      workspaceId: draft.workspaceId,
      expectedTokenVersion: verified.version,
      confirm: opts.confirm,
    });
  }

  if (verified.action === "approve") {
    return scheduleAutopilotDraft({
      draftId: draft.id,
      workspaceId: draft.workspaceId,
      expectedTokenVersion: verified.version,
      confirm: opts.confirm,
      date: opts.date,
      time: opts.time,
      timezone: opts.timezone,
    });
  }

  return applyAutopilotDecision({
    draftId: draft.id,
    workspaceId: draft.workspaceId,
    expectedTokenVersion: verified.version,
    action: verified.action,
    confirm: opts.confirm,
  });
}

/**
 * Explicit SEND NOW after confirmation POST.
 * GET never reaches this path. Duplicate launches are idempotent via launchCampaign.
 */
export async function sendNowAutopilotDraft(opts: {
  draftId: string;
  workspaceId: string;
  expectedTokenVersion: number;
  confirm: boolean;
}): Promise<
  | { ok: true; result: "sent"; campaignId?: string; scheduledLabel?: string }
  | { ok: false; error: string }
> {
  if (!opts.confirm) return { ok: false, error: "confirm_required" };

  const draft = await prisma.marketingAutopilotDraft.findFirst({
    where: { id: opts.draftId, workspaceId: opts.workspaceId },
    include: { campaign: true },
  });
  if (!draft?.campaignId || !draft.campaign) return { ok: false, error: "no_campaign" };
  if (["SENDING", "COMPLETED"].includes(draft.campaign.status)) {
    return {
      ok: true,
      result: "sent",
      campaignId: draft.campaignId,
      scheduledLabel: "already sent",
    };
  }
  const open = ["AWAITING_APPROVAL", "DRAFTED", "EDITING", "APPROVED"].includes(draft.status);
  if (!open) return { ok: false, error: "already_decided" };

  const sendTagIds = (draft.campaign.audienceTagIds as string[]) ?? [];
  const sendTags = sendTagIds.length
    ? await prisma.tag.findMany({
        where: { workspaceId: draft.workspaceId, id: { in: sendTagIds } },
        select: { id: true },
      })
    : [];
  const audienceOk = campaignAudienceIsSendable({
    audienceType: draft.campaign.audienceType,
    audienceTagIds: sendTagIds,
    existingTagIds: sendTags.map((tag) => tag.id),
  });
  if (!audienceOk.ok) {
    return {
      ok: false,
      error: `${AUDIENCE_MISSING}. Choose another audience before sending.`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.marketingAutopilotDraft.updateMany({
        where: {
          id: draft.id,
          workspaceId: opts.workspaceId,
          approvalTokenVersion: opts.expectedTokenVersion,
          status: { in: ["AWAITING_APPROVAL", "DRAFTED", "EDITING", "APPROVED"] },
        },
        data: {
          status: "APPROVED",
          decidedAt: new Date(),
          decidedAction: "SEND_NOW",
          scheduledFor: null,
          scheduleTimezone: null,
          approvalTokenVersion: { increment: 1 },
        },
      });
      if (claimed.count !== 1) {
        throw new Error("ALREADY_DECIDED");
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_DECIDED") {
      const again = await prisma.marketingAutopilotDraft.findFirst({
        where: { id: draft.id },
        include: { campaign: true },
      });
      if (again) {
        const resolved = resolveAutopilotReviewOutcome(again);
        if (resolved.outcome === "sent") {
          return {
            ok: true,
            result: "sent",
            campaignId: again.campaignId ?? undefined,
            scheduledLabel: "already sent",
          };
        }
      }
      return { ok: false, error: "already_decided" };
    }
    throw err;
  }

  try {
    const launched = await launchCampaign(draft.campaignId);
    await prisma.marketingAutopilotDraft.update({
      where: { id: draft.id },
      data: { status: "SENT" },
    });
    try {
      ensureAnalyticsPersistence();
      trackEvent("autopilot_approved");
    } catch {
      /* fail open */
    }
    return {
      ok: true,
      result: "sent",
      campaignId: draft.campaignId,
      scheduledLabel: launched.alreadyLaunched ? "already sent" : "sent just now",
    };
  } catch (err) {
    // Roll draft back to waiting so the owner can retry; token already incremented.
    await prisma.marketingAutopilotDraft.update({
      where: { id: draft.id },
      data: {
        status: "AWAITING_APPROVAL",
        decidedAt: null,
        decidedAction: null,
      },
    });
    return {
      ok: false,
      error: err instanceof Error ? err.message : "send_failed",
    };
  }
}

export async function applyAutopilotDecision(opts: {
  draftId: string;
  workspaceId: string;
  expectedTokenVersion: number;
  action: AutopilotAction;
  confirm: boolean;
}): Promise<
  | { ok: true; result: "scheduled" | "rejected" | "edit" | "sent"; campaignId?: string; scheduledLabel?: string }
  | { ok: false; error: string }
> {
  const draft = await prisma.marketingAutopilotDraft.findFirst({
    where: { id: opts.draftId, workspaceId: opts.workspaceId },
    include: { campaign: true },
  });
  if (!draft) return { ok: false, error: "not_found" };
  const open = ["AWAITING_APPROVAL", "DRAFTED", "EDITING"].includes(draft.status);
  if (!open) return { ok: false, error: "already_decided" };

  if (opts.action === "send") {
    return sendNowAutopilotDraft({
      draftId: opts.draftId,
      workspaceId: opts.workspaceId,
      expectedTokenVersion: opts.expectedTokenVersion,
      confirm: opts.confirm,
    });
  }

  if (opts.action === "edit") {
    if (!opts.confirm) return { ok: false, error: "confirm_required" };
    if (!draft.campaignId) return { ok: false, error: "no_campaign" };
    const claimed = await prisma.marketingAutopilotDraft.updateMany({
      where: {
        id: draft.id,
        workspaceId: opts.workspaceId,
        approvalTokenVersion: opts.expectedTokenVersion,
        status: { in: ["AWAITING_APPROVAL", "DRAFTED", "EDITING"] },
      },
      data: {
        status: "EDITING",
        decidedAt: new Date(),
        decidedAction: "EDIT",
        approvalTokenVersion: { increment: 1 },
      },
    });
    if (claimed.count !== 1) return { ok: false, error: "already_decided" };
    try {
      ensureAnalyticsPersistence();
      trackEvent("autopilot_edit_clicked");
    } catch {
      /* fail open */
    }
    return { ok: true, result: "edit", campaignId: draft.campaignId };
  }

  if (opts.action === "reject") {
    if (!opts.confirm) return { ok: false, error: "confirm_required" };
    const claimed = await prisma.marketingAutopilotDraft.updateMany({
      where: {
        id: draft.id,
        workspaceId: opts.workspaceId,
        approvalTokenVersion: opts.expectedTokenVersion,
        status: { in: ["AWAITING_APPROVAL", "DRAFTED", "EDITING"] },
      },
      data: {
        status: "REJECTED",
        decidedAt: new Date(),
        decidedAction: "REJECT",
        approvalTokenVersion: { increment: 1 },
      },
    });
    if (claimed.count !== 1) return { ok: false, error: "already_decided" };
    try {
      ensureAnalyticsPersistence();
      trackEvent("autopilot_rejected");
    } catch {
      /* fail open */
    }
    return { ok: true, result: "rejected" };
  }

  // Approve never sends immediately. Scheduling is a separate confirmed action.
  return { ok: false, error: "schedule_required" };
}

export async function scheduleAutopilotDraft(opts: {
  draftId: string;
  workspaceId: string;
  expectedTokenVersion: number;
  confirm: boolean;
  date?: string | null;
  time?: string | null;
  timezone?: string | null;
}): Promise<
  | { ok: true; result: "scheduled"; campaignId?: string; scheduledLabel: string }
  | { ok: false; error: string }
> {
  if (!opts.confirm) return { ok: false, error: "confirm_required" };
  const when = parseAutopilotSchedule({
    date: opts.date,
    time: opts.time,
    timezone: opts.timezone,
  });
  if (!when.ok) return when;

  const draft = await prisma.marketingAutopilotDraft.findFirst({
    where: { id: opts.draftId, workspaceId: opts.workspaceId },
    include: { campaign: true },
  });
  if (!draft?.campaignId || !draft.campaign) return { ok: false, error: "no_campaign" };
  // Campaign enum uses COMPLETED (not SENT) after delivery.
  if (["SENDING", "COMPLETED"].includes(draft.campaign.status)) {
    return { ok: false, error: "already_decided" };
  }
  const open = ["AWAITING_APPROVAL", "DRAFTED", "EDITING", "APPROVED"].includes(draft.status);
  if (!open) return { ok: false, error: "already_decided" };
  const scheduledTagIds = (draft.campaign.audienceTagIds as string[]) ?? [];
  const scheduledTags = scheduledTagIds.length
    ? await prisma.tag.findMany({
        where: { workspaceId: draft.workspaceId, id: { in: scheduledTagIds } },
        select: { id: true },
      })
    : [];
  const audienceOk = campaignAudienceIsSendable({
    audienceType: draft.campaign.audienceType,
    audienceTagIds: scheduledTagIds,
    existingTagIds: scheduledTags.map((tag) => tag.id),
  });
  if (!audienceOk.ok) {
    return {
      ok: false,
      error: `${AUDIENCE_MISSING}. Choose another audience before scheduling.`,
    };
  }

  // Claim the token version and schedule in one transaction. Token version only
  // increments when both campaign + draft writes succeed — so a failed schedule
  // leaves the link usable. Concurrent POSTs: only one claim wins.
  const scheduledLabel = formatScheduledWhen(when.at, when.timezone);
  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.marketingAutopilotDraft.updateMany({
        where: {
          id: draft.id,
          workspaceId: opts.workspaceId,
          approvalTokenVersion: opts.expectedTokenVersion,
          status: { in: ["AWAITING_APPROVAL", "DRAFTED", "EDITING", "APPROVED"] },
        },
        data: {
          status: "APPROVED",
          decidedAt: new Date(),
          decidedAction: "SCHEDULE",
          scheduledFor: when.at,
          scheduleTimezone: when.timezone,
          approvalTokenVersion: { increment: 1 },
        },
      });
      if (claimed.count !== 1) {
        throw new Error("ALREADY_DECIDED");
      }
      const camp = await tx.campaign.updateMany({
        where: {
          id: draft.campaignId!,
          status: { in: ["DRAFT", "SCHEDULED", "PAUSED"] },
        },
        data: { status: "SCHEDULED", scheduledAt: when.at },
      });
      if (camp.count !== 1) {
        throw new Error("ALREADY_DECIDED");
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_DECIDED") {
      const again = await prisma.marketingAutopilotDraft.findFirst({
        where: { id: draft.id },
        include: { campaign: true },
      });
      if (again) {
        const resolved = resolveAutopilotReviewOutcome(again);
        if (resolved.outcome === "scheduled" || resolved.outcome === "sent") {
          return {
            ok: true,
            result: "scheduled",
            campaignId: again.campaignId ?? undefined,
            scheduledLabel: resolved.scheduledLabel || scheduledLabel,
          };
        }
      }
      return { ok: false, error: "already_decided" };
    }
    throw err;
  }

  try {
    ensureAnalyticsPersistence();
    trackEvent("autopilot_approved");
  } catch {
    /* fail open */
  }

  return {
    ok: true,
    result: "scheduled",
    campaignId: draft.campaignId,
    scheduledLabel,
  };
}

export async function cancelAutopilotSchedule(opts: {
  draftId: string;
  workspaceId: string;
  confirm: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!opts.confirm) return { ok: false, error: "confirm_required" };
  const draft = await prisma.marketingAutopilotDraft.findFirst({
    where: { id: opts.draftId, workspaceId: opts.workspaceId },
    include: { campaign: true },
  });
  if (!draft?.campaign) return { ok: false, error: "not_found" };
  if (draft.campaign.status !== "SCHEDULED") {
    return { ok: false, error: "not_scheduled" };
  }
  await prisma.$transaction([
    prisma.campaign.update({
      where: { id: draft.campaign.id },
      data: { status: "DRAFT", scheduledAt: null },
    }),
    prisma.marketingAutopilotDraft.update({
      where: { id: draft.id },
      data: {
        status: "AWAITING_APPROVAL",
        decidedAt: null,
        decidedAction: null,
        scheduledFor: null,
        scheduleTimezone: null,
        approvalTokenVersion: { increment: 1 },
      },
    }),
  ]);
  return { ok: true };
}
