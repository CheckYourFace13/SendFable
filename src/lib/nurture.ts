/**
 * Nurture engine — test-mode only until NURTURE_GENERAL_ENABLED=true (owner approval).
 *
 * Hard rules:
 * - General activation stays false by default
 * - Test sends require NURTURE_TEST_MODE=true + allowlist
 * - Max recipients / max emails enforced per process invocation
 * - No cross-workspace marketing blasts
 * - Fail closed on missing consent for marketing-classified sequences
 */

import { platformFrom, sendEmail } from "@/lib/mailer";
import { appUrl } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { NURTURE_SEQUENCES, type NurtureSequence } from "@/data/content-pipeline";

export function nurtureGeneralEnabled(): boolean {
  return process.env.NURTURE_GENERAL_ENABLED === "true";
}

export function nurtureTestMode(): boolean {
  return process.env.NURTURE_TEST_MODE === "true";
}

export function nurtureTestAllowlist(): string[] {
  const raw = process.env.NURTURE_TEST_ALLOWLIST || "";
  return [
    ...new Set(
      raw
        .split(/[,;\s]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes("@"))
    ),
  ].slice(0, 2);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.toLowerCase().split("@");
  if (!domain) return "***";
  const keep = local.slice(0, 2) || "*";
  return `${keep}***@${domain}`;
}

export function getSequence(id: string): NurtureSequence | undefined {
  return NURTURE_SEQUENCES.find((s) => s.id === id);
}

function marketingFooter(unsubUrl: string, physicalAddress: string): string {
  return `<p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#9ca3af;">
  SendFable · ${physicalAddress}<br/>
  <a href="${unsubUrl}" style="color:#9ca3af;">Unsubscribe</a>
  · <a href="${appUrl("/privacy")}" style="color:#9ca3af;">Privacy</a>
</p>`;
}

function shell(title: string, body: string, footer: string): string {
  return `<!DOCTYPE html><html><body style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:24px;">
  <table width="480" style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;">
  <tr><td>
  <p style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">SendFable · QA nurture</p>
  <h1 style="font-size:18px;color:#111827;">${title}</h1>
  ${body}
  ${footer}
  </td></tr></table></body></html>`;
}

export type NurtureSendRequest = {
  sequenceId: string;
  stepDay: number;
  to: string;
  /** Compressed test: ignore day delays */
  compressed?: boolean;
  /** Admin hold blocks send */
  held?: boolean;
  /** Marketing consent present */
  marketingConsent: boolean;
  /** Already enrolled+sent this step */
  alreadySentStep?: boolean;
  physicalAddress?: string;
};

export type NurtureSendResult = {
  ok: boolean;
  status: "sent" | "blocked" | "failed";
  reason?: string;
  messageId?: string;
  masked?: string;
};

/**
 * Send one nurture step under strict gates. Does not activate general nurture.
 */
export async function sendNurtureStep(req: NurtureSendRequest): Promise<NurtureSendResult> {
  const seq = getSequence(req.sequenceId);
  if (!seq) return { ok: false, status: "blocked", reason: "unknown_sequence" };

  if (req.held) return { ok: false, status: "blocked", reason: "admin_hold" };
  if (req.alreadySentStep) return { ok: false, status: "blocked", reason: "duplicate_step" };

  const step = seq.emails.find((e) => e.day === req.stepDay);
  if (!step) return { ok: false, status: "blocked", reason: "unknown_step" };

  // General activation is intentionally separate and default-off.
  if (!nurtureTestMode() && !nurtureGeneralEnabled()) {
    return { ok: false, status: "blocked", reason: "nurture_inactive" };
  }

  if (nurtureTestMode() || !nurtureGeneralEnabled()) {
    const allow = nurtureTestAllowlist();
    if (!allow.includes(req.to.toLowerCase())) {
      return { ok: false, status: "blocked", reason: "not_on_allowlist" };
    }
  }

  if (seq.consentRequired && !req.marketingConsent) {
    return { ok: false, status: "blocked", reason: "consent_required" };
  }

  const masked = maskEmail(req.to);
  const unsub = appUrl(`/unsubscribe?qa=nurture&seq=${encodeURIComponent(seq.id)}`);
  const address =
    req.physicalAddress ||
    process.env.NURTURE_TEST_PHYSICAL_ADDRESS ||
    "SendFable, see Privacy Policy for mailing address";

  const classification = seq.consentRequired ? "marketing" : "product_onboarding";
  const html = shell(
    step.subject,
    `<p style="font-size:14px;line-height:1.6;color:#374151;">${step.purpose}</p>
     <p style="font-size:14px;line-height:1.6;color:#374151;">Sequence <strong>${seq.name}</strong> · day ${step.day} · ${classification} · testMode=${nurtureTestMode()}</p>
     <p style="font-size:14px;line-height:1.6;color:#374151;"><a href="${appUrl("/pricing")}">Pricing</a> · <a href="${appUrl("/migrate/mailchimp")}">Mailchimp migration</a></p>`,
    marketingFooter(unsub, address)
  );

  try {
    const result = await sendEmail({
      from: platformFrom("SendFable"),
      to: req.to,
      replyTo: process.env.OWNER_ALERT_EMAIL || process.env.PLATFORM_OWNER_EMAIL,
      subject: `[QA nurture] ${step.subject}`,
      html,
      tags: {
        kind: "nurture_qa",
        sequence: seq.id,
        day: String(step.day),
      },
      headers: {
        "List-Unsubscribe": `<${unsub}>`,
        "X-SendFable-Nurture": seq.id,
      },
    });

    await prisma.nurtureSendLog.create({
      data: {
        sequenceId: seq.id,
        stepDay: step.day,
        recipientMask: masked,
        status: "sent",
        testMode: true,
        meta: { classification, messageId: result.messageId, compressed: !!req.compressed },
      },
    });

    return { ok: true, status: "sent", messageId: result.messageId, masked };
  } catch (err) {
    await prisma.nurtureSendLog.create({
      data: {
        sequenceId: seq.id,
        stepDay: step.day,
        recipientMask: masked,
        status: "failed",
        testMode: true,
        meta: { error: err instanceof Error ? err.message.slice(0, 200) : "send_failed" },
      },
    });
    return { ok: false, status: "failed", reason: "send_failed", masked };
  }
}
