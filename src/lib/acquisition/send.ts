import {
  acquisitionFromAddress,
  acquisitionPhysicalAddress,
  acquisitionReplyTo,
  acquisitionSendingEnabled,
} from "@/lib/acquisition/flags";
import {
  buildFollowUp1,
  buildFollowUp2,
  buildInitialEmail,
  isCopyVersionId,
  openerTypeFromProspect,
} from "@/lib/acquisition/personalize";
import { getActiveCopyVersion } from "@/lib/acquisition/conversion-optimize";
import { bodyHasUnsubscribe, runQualityGate } from "@/lib/acquisition/quality-gate";
import {
  canSendAnyToday,
  canSendNewToday,
  canSendWebsiteDemoToday,
  checkOutreachSafetyAndMaybePause,
  isPipelinePaused,
} from "@/lib/acquisition/caps";
import { WEBSITE_DEMO_COPY_VERSION } from "@/lib/acquisition/queue-policy";
import { buildWebsiteDemo } from "@/lib/acquisition/website-demo/build";
import { buildWebsiteDemoEmail } from "@/lib/acquisition/website-demo/email";
import { confirmSameSiteImage } from "@/lib/acquisition/website-demo/image";
import {
  addDays,
  defaultProspectTimeZone,
  FOLLOW_UP_1_DAYS,
  FOLLOW_UP_2_DAYS,
  isWithinSendWindow,
} from "@/lib/acquisition/schedule";
import { verifyAcquisitionSender } from "@/lib/acquisition/sender";
import type { AcquisitionMessageStep } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";
import { appUrl } from "@/lib/utils";
import { signToken } from "@/lib/tokens";

async function unsubUrlFor(prospectId: string, email: string): Promise<string> {
  const token = await signToken(
    "acquisition-unsub",
    { prospectId, email },
    "365d"
  );
  return appUrl(`/api/acquisition/unsubscribe?token=${encodeURIComponent(token)}`);
}

async function clickUrlFor(
  messageId: string,
  path: string,
  copyVersion: string
): Promise<string> {
  const token = await signToken(
    "acquisition-click",
    { messageId, path, v: copyVersion },
    "90d"
  );
  return appUrl(`/api/acquisition/c?t=${encodeURIComponent(token)}`);
}

function plainToHtml(text: string): string {
  const esc = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<pre style="font-family:Georgia,serif;font-size:15px;line-height:1.5;white-space:pre-wrap;">${esc}</pre>
<p style="font-size:11px;color:#6b7280;margin-top:24px;">${acquisitionPhysicalAddress()}</p>`;
}

export async function draftMessageForProspect(
  prospectId: string,
  step: AcquisitionMessageStep,
  opts?: { dryRun?: boolean; copyVersion?: string; landingPath?: string; allowScheduledRewrite?: boolean }
): Promise<{ ok: boolean; messageId?: string; reason?: string }> {
  const p = await prisma.acquisitionProspect.findUnique({ where: { id: prospectId } });
  if (!p || !p.contactEmail) return { ok: false, reason: "missing_prospect_or_email" };

  const existing = await prisma.acquisitionMessage.findFirst({
    where: { prospectId, step, status: { not: "CANCELLED" } },
  });
  const rewritable =
    !existing ||
    existing.status === "DRAFT" ||
    (existing.status === "SCHEDULED" && opts?.allowScheduledRewrite);
  if (existing && !rewritable) {
    return { ok: false, reason: "step_already_exists" };
  }

  const unsub = await unsubUrlFor(p.id, p.contactEmail);
  const requested = opts?.copyVersion;
  const copyVersion =
    requested && isCopyVersionId(requested)
      ? requested
      : step === "INITIAL"
        ? await getActiveCopyVersion()
        : null;
  const openerType = openerTypeFromProspect(p);
  const ctaPath = opts?.landingPath || p.landingPagePath || "/automated-email-marketing";

  let built;
  if (step === "INITIAL") {
    if (!p.personalizationClaim || !p.personalizationEvidence || !p.personalizationSourceUrl) {
      return { ok: false, reason: "missing_personalization" };
    }
    // Placeholder CTA swapped after we have message id for click token
    built = buildInitialEmail(
      {
        businessName: p.businessName,
        firstName: p.firstName,
        claim: p.personalizationClaim,
        evidence: p.personalizationEvidence,
        sourceUrl: p.personalizationSourceUrl,
      },
      {
        unsubUrl: unsub,
        copyVersion: copyVersion || "v1a",
        landingPath: ctaPath,
        ctaUrl: "ACQ_CTA_PLACEHOLDER",
      }
    );
  } else if (step === "FOLLOW_UP_1") {
    built = buildFollowUp1(
      { businessName: p.businessName, firstName: p.firstName },
      {
        unsubUrl: unsub,
        landingPath: ctaPath,
        copyVersion: copyVersion || "v1a",
        ctaUrl: "ACQ_CTA_PLACEHOLDER",
      }
    );
  } else {
    built = buildFollowUp2(
      { firstName: p.firstName, businessName: p.businessName },
      { unsubUrl: unsub }
    );
  }

  if (!bodyHasUnsubscribe(built.bodyText)) {
    return { ok: false, reason: "missing_unsubscribe" };
  }

  const baseData = {
    subject: built.subject,
    bodyText: built.bodyText,
    status: "DRAFT" as const,
    dryRun: opts?.dryRun ?? false,
    copyVersion: copyVersion || null,
    openerType: step === "INITIAL" ? openerType : null,
    ctaPath: step === "INITIAL" || step === "FOLLOW_UP_1" ? ctaPath : null,
  };

  let messageId: string;
  if (existing) {
    await prisma.acquisitionMessage.update({
      where: { id: existing.id },
      data: baseData,
    });
    messageId = existing.id;
  } else {
    const msg = await prisma.acquisitionMessage.create({
      data: {
        prospectId: p.id,
        step,
        ...baseData,
      },
    });
    messageId = msg.id;
  }

  if (
    (step === "INITIAL" || step === "FOLLOW_UP_1") &&
    built.bodyText.includes("ACQ_CTA_PLACEHOLDER")
  ) {
    const cta = await clickUrlFor(messageId, ctaPath, copyVersion || "v1a");
    const bodyText = built.bodyText.replace(/ACQ_CTA_PLACEHOLDER/g, cta);
    await prisma.acquisitionMessage.update({
      where: { id: messageId },
      data: { bodyText, ctaPath },
    });
  }

  return { ok: true, messageId };
}

function htmlToPlain(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Draft one personalized website-demo initial. Never replaces an existing initial,
 * and never creates a customer campaign.
 */
export async function draftWebsiteDemoForProspect(
  prospectId: string,
  opts?: { dryRun?: boolean }
): Promise<{ ok: boolean; messageId?: string; reason?: string }> {
  const p = await prisma.acquisitionProspect.findUnique({ where: { id: prospectId } });
  if (!p || !p.contactEmail || !p.website) return { ok: false, reason: "missing_prospect_or_email" };

  const existing = await prisma.acquisitionMessage.findFirst({
    where: { prospectId, step: "INITIAL", status: { not: "CANCELLED" } },
    select: { id: true },
  });
  if (existing) return { ok: false, reason: "step_already_exists" };

  const ownerPreview = await prisma.acquisitionEvent.findFirst({
    where: {
      type: "owner_personalized_demo",
      prospectId: null,
      meta: { path: ["domain"], equals: p.domain },
    },
    select: { id: true },
  });
  if (ownerPreview) return { ok: false, reason: "owner_preview_only" };

  let built;
  try {
    built = await buildWebsiteDemo({
      website: p.website.startsWith("http") ? p.website : `https://${p.website}`,
      businessName: p.businessName,
    });
  } catch {
    return { ok: false, reason: "demo_fetch_failed" };
  }
  if (!built || built.track !== "personalized_website_demo") {
    return { ok: false, reason: "no_demo" };
  }

  let facts = built.facts;
  if (facts.imageUrl) {
    const check = await confirmSameSiteImage(facts.imageUrl, facts.pageUrl);
    if (check === "reject") facts = { ...facts, imageUrl: null, imageAlt: null };
  }

  const unsub = await unsubUrlFor(p.id, p.contactEmail);
  const mail = buildWebsiteDemoEmail({
    businessName: p.businessName,
    firstName: p.firstName,
    facts,
    unsubUrl: unsub,
    ctaUrl: "ACQ_CTA_PLACEHOLDER",
  });
  if (!bodyHasUnsubscribe(mail.html) || !bodyHasUnsubscribe(mail.text)) {
    return { ok: false, reason: "missing_unsubscribe" };
  }

  const msg = await prisma.acquisitionMessage.create({
    data: {
      prospectId: p.id,
      step: "INITIAL",
      subject: mail.subject,
      bodyText: mail.html,
      status: "DRAFT",
      dryRun: opts?.dryRun ?? false,
      copyVersion: WEBSITE_DEMO_COPY_VERSION,
      openerType: "events",
      ctaPath: "/automated-email-marketing",
    },
  });

  const cta = await clickUrlFor(msg.id, "/automated-email-marketing", WEBSITE_DEMO_COPY_VERSION);
  const bodyText = mail.html.replace(/ACQ_CTA_PLACEHOLDER/g, cta);
  await prisma.acquisitionMessage.update({
    where: { id: msg.id },
    data: { bodyText },
  });
  return { ok: true, messageId: msg.id };
}

/**
 * Send one scheduled/draft acquisition message. Hard-gated by SENDING flag.
 * dryRun messages never call SES.
 */
export async function sendAcquisitionMessage(messageId: string): Promise<{
  ok: boolean;
  reason?: string;
  messageId?: string;
  dryRun?: boolean;
}> {
  const msg = await prisma.acquisitionMessage.findUnique({
    where: { id: messageId },
    include: { prospect: true },
  });
  if (!msg) return { ok: false, reason: "not_found" };
  if (msg.status === "SENT" || msg.status === "DELIVERED") {
    return { ok: false, reason: "already_sent" };
  }
  if (msg.status === "CANCELLED") return { ok: false, reason: "cancelled" };

  const p = msg.prospect;

  // Never send dry-run or when sending disabled
  if (msg.dryRun || !acquisitionSendingEnabled()) {
    return { ok: false, reason: msg.dryRun ? "dry_run" : "sending_disabled" };
  }

  const paused = await isPipelinePaused();
  if (paused.paused) return { ok: false, reason: `pipeline_paused:${paused.reason}` };

  if (msg.step === "INITIAL") {
    const priorInitial = await prisma.acquisitionMessage.findFirst({
      where: {
        prospectId: p.id,
        step: "INITIAL",
        id: { not: msg.id },
        status: { in: ["SENT", "DELIVERED", "BOUNCED", "COMPLAINED"] },
      },
      select: { id: true },
    });
    if (priorInitial) {
      await prisma.acquisitionMessage.update({
        where: { id: msg.id },
        data: { status: "CANCELLED", error: "duplicate_initial" },
      });
      return { ok: false, reason: "duplicate_initial" };
    }
  }

  const safety = await checkOutreachSafetyAndMaybePause();
  if (!safety.ok) return { ok: false, reason: "safety_pause" };

  if (msg.step === "INITIAL" && msg.copyVersion === WEBSITE_DEMO_COPY_VERSION) {
    if (!(await canSendWebsiteDemoToday())) return { ok: false, reason: "daily_demo_cap" };
  } else if (msg.step === "INITIAL") {
    if (!(await canSendNewToday())) return { ok: false, reason: "daily_new_cap" };
  } else if (!(await canSendAnyToday())) {
    return { ok: false, reason: "daily_total_cap" };
  }

  // One email per business per day
  if (p.lastContactedAt) {
    const dayAgo = Date.now() - 20 * 60 * 60 * 1000;
    if (p.lastContactedAt.getTime() > dayAgo) {
      return { ok: false, reason: "one_per_day" };
    }
  }

  const tz = defaultProspectTimeZone(p.state);
  const window = isWithinSendWindow(new Date(), tz);
  if (!window.ok) return { ok: false, reason: window.reason };

  const gate = await runQualityGate(p, { requireFrom: true, autonomous: true });
  if (!gate.ok) return { ok: false, reason: gate.failures.join(",") };
  if (!bodyHasUnsubscribe(msg.bodyText)) return { ok: false, reason: "missing_unsubscribe" };

  const sender = await verifyAcquisitionSender();
  if (!sender.ok) return { ok: false, reason: `sender_not_verified:${sender.detail}` };
  const from = sender.from;

  try {
    const demo = msg.copyVersion === WEBSITE_DEMO_COPY_VERSION;
    const result = await sendEmail({
      from,
      to: p.contactEmail!,
      replyTo: acquisitionReplyTo(),
      subject: msg.subject,
      text: demo ? htmlToPlain(msg.bodyText) : msg.bodyText,
      html: demo ? msg.bodyText : plainToHtml(msg.bodyText),
      tags: {
        kind: "acquisition",
        prospectId: p.id.slice(0, 64),
        step: msg.step,
      },
      headers: {
        "List-Unsubscribe": `<${await unsubUrlFor(p.id, p.contactEmail!)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    const now = new Date();
    const sesId = (result.messageId || "").replace(/^<|>$/g, "").trim();
    await prisma.acquisitionMessage.update({
      where: { id: msg.id },
      data: {
        status: "SENT",
        sentAt: now,
        sesMessageId: sesId || result.messageId,
      },
    });

    let nextStatus = p.status;
    let nextFollowUpAt: Date | null = null;
    if (msg.step === "INITIAL") {
      nextStatus = "CONTACTED";
      nextFollowUpAt = addDays(now, FOLLOW_UP_1_DAYS);
    } else if (msg.step === "FOLLOW_UP_1") {
      nextStatus = "FOLLOW_UP_1";
      nextFollowUpAt = addDays(p.lastContactedAt || now, FOLLOW_UP_2_DAYS - FOLLOW_UP_1_DAYS);
      // Align FU2 to day 10 from initial: use first INITIAL sentAt if present
      const initial = await prisma.acquisitionMessage.findFirst({
        where: { prospectId: p.id, step: "INITIAL", status: { in: ["SENT", "DELIVERED"] } },
        orderBy: { sentAt: "asc" },
      });
      if (initial?.sentAt) {
        nextFollowUpAt = addDays(initial.sentAt, FOLLOW_UP_2_DAYS);
      }
    } else {
      nextStatus = "OUTREACH_COMPLETE";
      nextFollowUpAt = null;
    }

    await prisma.acquisitionProspect.update({
      where: { id: p.id },
      data: {
        status: nextStatus as never,
        lastContactedAt: now,
        nextFollowUpAt,
      },
    });

    await prisma.acquisitionEvent.create({
      data: {
        prospectId: p.id,
        type: "sent",
        meta: { step: msg.step, sesMessageId: sesId || result.messageId, dev: result.dev },
      },
    });
    await prisma.acquisitionEvent.create({
      data: {
        prospectId: p.id,
        type: "ses_accepted",
        meta: { step: msg.step, sesMessageId: sesId || result.messageId, messageId: msg.id },
      },
    });

    return { ok: true, messageId: sesId || result.messageId };
  } catch (err) {
    await prisma.acquisitionMessage.update({
      where: { id: msg.id },
      data: {
        status: "FAILED",
        error: err instanceof Error ? err.message : "send_failed",
      },
    });
    return { ok: false, reason: "send_failed" };
  }
}

/** Queue INITIAL drafts for qualified prospects (does not send). */
export async function queueQualifiedDrafts(opts?: {
  limit?: number;
  dryRun?: boolean;
}): Promise<number> {
  const rows = await prisma.acquisitionProspect.findMany({
    where: {
      status: "QUALIFIED",
      contactEmail: { not: null },
      personalizationClaim: { not: null },
    },
    orderBy: { score: "desc" },
    take: opts?.limit ?? 50,
  });
  let n = 0;
  for (const p of rows) {
    const r = await draftMessageForProspect(p.id, "INITIAL", { dryRun: opts?.dryRun ?? true });
    if (r.ok) {
      await prisma.acquisitionProspect.update({
        where: { id: p.id },
        data: { status: "QUEUED" },
      });
      n++;
    }
  }
  return n;
}
