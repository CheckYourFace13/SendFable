import { prisma } from "@/lib/prisma";
import { signToken, verifyToken } from "@/lib/tokens";
import { appUrl } from "@/lib/utils";
import { platformFrom, sendEmail } from "@/lib/mailer";
import { getWorkspaceOwner } from "@/lib/workspace-owner";
import { countAudience } from "@/lib/audience";
import { launchCampaign } from "@/lib/campaign-send";
import type { AutopilotAction } from "@/lib/autopilot/types";
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
  Nothing sends until you approve. No response means no send.
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
    actionBtn(approveUrl, "Approve &amp; send", "#059669") +
    actionBtn(editUrl, "Edit before sending", "#4F46E5") +
    actionBtn(rejectUrl, "Do not send", "#6b7280") +
    `</tr></table>` +
    `<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#9ca3af;">These links open a confirmation page. Opening a link does not send the campaign.</p>`;

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
  if (draft.expiresAt && draft.expiresAt.getTime() < Date.now()) {
    if (draft.status === "AWAITING_APPROVAL") {
      await prisma.marketingAutopilotDraft.update({
        where: { id: draft.id },
        data: { status: "EXPIRED" },
      });
    }
    return { error: "expired" as const };
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
}): Promise<
  | { ok: true; result: "approved_sent" | "rejected" | "edit"; campaignId?: string }
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
  if (draft.expiresAt && draft.expiresAt.getTime() < Date.now()) {
    await prisma.marketingAutopilotDraft.update({
      where: { id: draft.id },
      data: { status: "EXPIRED" },
    });
    return { ok: false, error: "expired" };
  }

  if (verified.action === "edit") {
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

  if (verified.action === "reject") {
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

  // approve
  if (!opts.confirm) return { ok: false, error: "confirm_required" };
  if (!draft.campaignId) return { ok: false, error: "no_campaign" };
  if (!["AWAITING_APPROVAL", "DRAFTED", "EDITING"].includes(draft.status)) {
    return { ok: false, error: "already_decided" };
  }

  // Mark approved first (single-use token), then launch — never auto from GET
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
    await launchCampaign(draft.campaignId);
  } catch (err) {
    // Roll status back to AWAITING so owner can retry after fixing sender/audience
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
      error: err instanceof Error ? err.message : "launch_failed",
    };
  }

  await prisma.marketingAutopilotDraft.update({
    where: { id: draft.id },
    data: { status: "SENT" },
  });

  try {
    ensureAnalyticsPersistence();
    trackEvent("autopilot_approved");
    trackEvent("autopilot_campaign_sent");
  } catch {
    /* fail open */
  }

  return { ok: true, result: "approved_sent", campaignId: draft.campaignId };
}
