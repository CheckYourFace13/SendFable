import { prisma } from "@/lib/prisma";
import { signToken, verifyToken } from "@/lib/tokens";
import { appUrl } from "@/lib/utils";
import { platformFrom, sendEmail } from "@/lib/mailer";
import { getWorkspaceOwner } from "@/lib/workspace-owner";
import { countAudience } from "@/lib/audience";
import type { AutopilotAction } from "@/lib/autopilot/types";
import { formatScheduledWhen, parseAutopilotSchedule } from "@/lib/autopilot/schedule";
import { trackEvent } from "@/lib/analytics";
import { ensureAnalyticsPersistence } from "@/lib/analytics-persist";

function shell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
<tr><td style="padding-bottom:24px;text-align:center;">
  <span style="font-size:20px;font-weight:700;color:#111827;letter-spacing:-0.02em;">Send<span style="color:#4F46E5;">fable</span></span>
</td></tr>
<tr><td style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;">
  <h1 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#111827;">${title}</h1>
  ${bodyHtml}
</td></tr>
<tr><td style="padding-top:24px;text-align:center;font-size:12px;color:#9ca3af;">
  If you do nothing, nothing sends. The draft stays waiting for you.
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function actionBtn(href: string, label: string, bg: string): string {
  return `<td style="padding:0 6px 12px 0;">
  <a href="${href}" style="display:inline-block;padding:12px 18px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;background-color:${bg};">${label}</a>
</td>`;
}

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
  if (!["approve", "reject", "edit"].includes(payload.action)) return null;
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
  const [approveTok, rejectTok, editTok] = await Promise.all([
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

  const approveUrl = appUrl(`/autopilot/review?t=${encodeURIComponent(approveTok)}`);
  const rejectUrl = appUrl(`/autopilot/review?t=${encodeURIComponent(rejectTok)}`);
  const editUrl = appUrl(`/autopilot/review?t=${encodeURIComponent(editTok)}`);

  const previewSnippet = (draft.campaign.compiledHtml || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);

  const body =
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;"><strong>What changed:</strong> ${escape(
      draft.explanation || draft.changeSummary
    )}</p>` +
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;"><strong>Campaign subject:</strong> ${escape(
      draft.subject || "(no subject)"
    )}</p>` +
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;"><strong>Audience:</strong> ${escape(
      draft.campaign.audienceType === "all" ? "Everyone subscribed" : draft.campaign.audienceType
    )} · <strong>Estimated recipients:</strong> ${recipients}</p>` +
    `<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#6b7280;background:#f9fafb;border-radius:8px;padding:12px;">${escape(
      previewSnippet
    )}…</p>` +
    `<table role="presentation" cellpadding="0" cellspacing="0"><tr>` +
    actionBtn(approveUrl, "Approve &amp; schedule", "#059669") +
    actionBtn(editUrl, "Edit", "#4F46E5") +
    actionBtn(rejectUrl, "Skip this campaign", "#6b7280") +
    `</tr></table>` +
    `<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#9ca3af;">These links open a confirmation page. Opening a link does not send the campaign. If you do nothing, the draft stays waiting in SendFable.</p>`;

  await sendEmail({
    from: platformFrom(),
    to: draft.workspace.approvalEmail?.trim() || owner.email,
    subject: "Your next campaign is ready to review",
    html: shell("Your next campaign is ready to review", body),
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

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function loadAutopilotReview(token: string) {
  const verified = await verifyAutopilotActionToken(token);
  if (!verified) return { error: "invalid_token" as const };

  const draft = await prisma.marketingAutopilotDraft.findFirst({
    where: { id: verified.draftId, workspaceId: verified.workspaceId },
    include: { campaign: true, workspace: true },
  });
  if (!draft) return { error: "not_found" as const };
  if (draft.approvalTokenVersion !== verified.version) {
    return { error: "token_used" as const };
  }
  if (!["AWAITING_APPROVAL", "DRAFTED", "EDITING"].includes(draft.status)) {
    return { error: "already_decided" as const, draft, action: verified.action };
  }

  const recipients = draft.campaign
    ? await countAudience(draft.workspaceId, {
        audienceType: (draft.campaign.audienceType as "all" | "tags" | "segment") || "all",
        audienceTagIds: (draft.campaign.audienceTagIds as string[]) ?? [],
        audienceSegmentId: draft.campaign.audienceSegmentId,
      })
    : 0;

  return { draft, action: verified.action, recipients, token };
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
}): Promise<
  | { ok: true; result: "scheduled" | "rejected" | "edit"; campaignId?: string; scheduledLabel?: string }
  | { ok: false; error: string }
> {
  const verified = await verifyAutopilotActionToken(opts.token);
  if (!verified) return { ok: false, error: "invalid_token" };

  const draft = await prisma.marketingAutopilotDraft.findFirst({
    where: { id: verified.draftId, workspaceId: verified.workspaceId },
    include: { campaign: true },
  });
  if (!draft) return { ok: false, error: "not_found" };
  if (draft.approvalTokenVersion !== verified.version) {
    return { ok: false, error: "token_used" };
  }

  if (verified.action === "approve") {
    return scheduleAutopilotDraft({
      draftId: draft.id,
      workspaceId: draft.workspaceId,
      confirm: opts.confirm,
      date: opts.date,
      time: opts.time,
      timezone: opts.timezone,
    });
  }

  return applyAutopilotDecision({
    draftId: draft.id,
    workspaceId: draft.workspaceId,
    action: verified.action,
    confirm: opts.confirm,
  });
}

export async function applyAutopilotDecision(opts: {
  draftId: string;
  workspaceId: string;
  action: AutopilotAction;
  confirm: boolean;
}): Promise<
  | { ok: true; result: "scheduled" | "rejected" | "edit"; campaignId?: string; scheduledLabel?: string }
  | { ok: false; error: string }
> {
  const draft = await prisma.marketingAutopilotDraft.findFirst({
    where: { id: opts.draftId, workspaceId: opts.workspaceId },
    include: { campaign: true },
  });
  if (!draft) return { ok: false, error: "not_found" };
  const open = ["AWAITING_APPROVAL", "DRAFTED", "EDITING"].includes(draft.status);
  if (!open) return { ok: false, error: "already_decided" };

  if (opts.action === "edit") {
    if (!opts.confirm) return { ok: false, error: "confirm_required" };
    if (!draft.campaignId) return { ok: false, error: "no_campaign" };
    await prisma.marketingAutopilotDraft.update({
      where: { id: draft.id },
      data: {
        status: "EDITING",
        decidedAt: new Date(),
        decidedAction: "EDIT",
        approvalTokenVersion: { increment: 1 },
      },
    });
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
    await prisma.marketingAutopilotDraft.update({
      where: { id: draft.id },
      data: {
        status: "REJECTED",
        decidedAt: new Date(),
        decidedAction: "REJECT",
        approvalTokenVersion: { increment: 1 },
      },
    });
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
  if (["SENDING", "SENT"].includes(draft.campaign.status)) {
    return { ok: false, error: "already_decided" };
  }
  const open = ["AWAITING_APPROVAL", "DRAFTED", "EDITING", "APPROVED"].includes(draft.status);
  if (!open) return { ok: false, error: "already_decided" };

  await prisma.$transaction([
    prisma.campaign.update({
      where: { id: draft.campaignId },
      data: { status: "SCHEDULED", scheduledAt: when.at },
    }),
    prisma.marketingAutopilotDraft.update({
      where: { id: draft.id },
      data: {
        status: "APPROVED",
        decidedAt: new Date(),
        decidedAction: "SCHEDULE",
        scheduledFor: when.at,
        scheduleTimezone: when.timezone,
        approvalTokenVersion: { increment: 1 },
      },
    }),
  ]);

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
    scheduledLabel: formatScheduledWhen(when.at, when.timezone),
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
