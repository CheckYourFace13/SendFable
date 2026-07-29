/**
 * SMS-related email notifications to the business (workspace owner).
 * Rides on the existing transactional mailer; in local/dev with no AWS keys
 * these go to the .eml outbox, never a real mailbox.
 */

import { prisma } from "@/lib/prisma";
import { platformFrom, sendEmail } from "@/lib/mailer";
import { appUrl } from "@/lib/utils";
import { getWorkspaceOwner } from "@/lib/workspace-owner";
import { escapeHtml } from "@/lib/merge";

export interface SmsInboundNotificationInput {
  workspaceId: string;
  messageId: string;
  /** Redacted sender number — full numbers stay out of email/logs */
  fromRedacted: string;
  contactName: string | null;
  preview: string;
}

export async function sendSmsInboundNotification(input: SmsInboundNotificationInput) {
  const owner = await getWorkspaceOwner(input.workspaceId);
  if (!owner?.email) return;
  const who = input.contactName ? `${input.contactName} (${input.fromRedacted})` : input.fromRedacted;
  await sendEmail({
    from: platformFrom(),
    to: owner.email,
    subject: `New text reply from ${who}`,
    html: `<!DOCTYPE html><html><body style="font-family:Inter,Arial,sans-serif;color:#111827;">
<p>You received a new text message reply in your SendFable Inbox.</p>
<p><strong>From:</strong> ${escapeHtml(who)}</p>
<blockquote style="margin:12px 0;padding:12px;background:#f8fafc;border-left:3px solid #4F46E5;">${escapeHtml(input.preview)}</blockquote>
<p><a href="${appUrl("/inbox")}">Open your SendFable Inbox to reply</a></p>
<p style="font-size:12px;color:#9ca3af;">Replies you send from SendFable are billed at your plan's outbound rate.</p>
</body></html>`,
  });
}

export interface SmsAllowanceAlertInput {
  workspaceId: string;
  thresholdPercent: number; // 75 | 90 | 100
  usedSegments: number;
  includedSegments: number;
}

export async function sendSmsAllowanceAlert(input: SmsAllowanceAlertInput) {
  const owner = await getWorkspaceOwner(input.workspaceId);
  if (!owner?.email) return;
  const over = input.thresholdPercent >= 100;
  await sendEmail({
    from: platformFrom(),
    to: owner.email,
    subject: over
      ? "Your included incoming text allowance is used up"
      : `You've used ${input.thresholdPercent}% of your incoming text allowance`,
    html: `<!DOCTYPE html><html><body style="font-family:Inter,Arial,sans-serif;color:#111827;">
<p>Your workspace has received ${input.usedSegments} of ${input.includedSegments} included incoming SMS segments this calendar month.</p>
${over ? "<p>Additional incoming segments this month are billed at $0.025 each.</p>" : ""}
<p><a href="${appUrl("/billing/sms")}">View your SMS usage</a></p>
</body></html>`,
  });
}

/**
 * Record which allowance thresholds have already been alerted this month so
 * each fires at most once (audit-log backed, no schema addition needed).
 */
export async function alreadyAlertedThreshold(
  workspaceId: string,
  month: string,
  thresholdPercent: number
): Promise<boolean> {
  const existing = await prisma.auditLog.findFirst({
    where: {
      workspaceId,
      action: "sms.allowance-alert",
      targetType: "month",
      targetId: `${month}:${thresholdPercent}`,
    },
  });
  if (existing) return true;
  await prisma.auditLog.create({
    data: {
      workspaceId,
      action: "sms.allowance-alert",
      targetType: "month",
      targetId: `${month}:${thresholdPercent}`,
      meta: { thresholdPercent, month },
    },
  });
  return false;
}
