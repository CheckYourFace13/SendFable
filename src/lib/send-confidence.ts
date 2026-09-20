import type { Campaign, SenderIdentity, User, Workspace } from "@prisma/client";
import { PLANS, BOUNCE_PAUSE_THRESHOLD, COMPLAINT_PAUSE_THRESHOLD } from "@/lib/plans";
import type { EmailDesign } from "@/lib/email-compiler";

export type ConfidenceLevel = "error" | "warning" | "ok";

export interface ConfidenceCheck {
  id: string;
  level: ConfidenceLevel;
  label: string;
  detail: string;
  /** Plain-language “why this matters” for non-marketers. */
  why?: string;
  /** In-app path to fix the issue (one-click). */
  fixHref?: string;
  blocksSend: boolean;
}

export interface ConfidenceResult {
  score: number;
  checks: ConfidenceCheck[];
  canSend: boolean;
  disclaimer: string;
}

export interface ConfidenceInput {
  campaign: Pick<
    Campaign,
    | "subject"
    | "previewText"
    | "compiledHtml"
    | "designJson"
    | "rawHtmlMode"
    | "senderIdentityId"
    | "testSentAt"
    | "audienceType"
    | "channel"
    | "smsBody"
  >;
  sender: Pick<SenderIdentity, "status" | "type" | "rewriteRequired" | "value"> | null;
  workspace: Pick<Workspace, "mailingAddress" | "name">;
  owner: Pick<User, "emailVerified" | "plan" | "monthlySendCount" | "sendingHeldAt" | "flaggedAt">;
  audienceSize: number;
  suppressedCount: number;
  recentBounceRate: number;
  recentComplaintRate: number;
  /** SMS-eligible audience after consent filters (when channel needs SMS). */
  smsAudienceSize?: number;
  hasActiveSmsNumber?: boolean;
  hasActiveSmsSubscription?: boolean;
}

function hasUnsubscribe(html: string): boolean {
  return /unsubscribe/i.test(html) || /\{\{\s*unsubscribe_url/.test(html);
}

function linkIssues(html: string): string[] {
  const issues: string[] = [];
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
  for (const h of hrefs) {
    if (h === "#" || h === "" || h.toLowerCase().startsWith("javascript:")) {
      issues.push(`Weak or invalid link: ${h || "(empty)"}`);
    }
  }
  return issues.slice(0, 5);
}

function missingAlts(html: string): number {
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)];
  return imgs.filter((m) => !/\balt=/i.test(m[0])).length;
}

function textLength(html: string): number {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;
}

function mergeTagsWithoutFallback(html: string): string[] {
  const tags = [...html.matchAll(/\{\{\s*([a-zA-Z0-9_.]+)(\s*\|[^}]*)?\s*\}\}/g)];
  return tags.filter((t) => !t[2]).map((t) => t[1]).slice(0, 5);
}

/**
 * Pre-send review score. Not a spam filter guarantee — plain-language readiness.
 */
export function computeSendConfidence(input: ConfidenceInput): ConfidenceResult {
  const checks: ConfidenceCheck[] = [];
  const channel = (input.campaign as { channel?: string }).channel || "EMAIL";
  const needsEmail = channel === "EMAIL" || channel === "BOTH";
  const needsSms = channel === "SMS" || channel === "BOTH";
  const html = input.campaign.compiledHtml || "";
  const subject = (input.campaign.subject || "").trim();
  const plan = PLANS[input.owner.plan];
  const smsBody = ((input.campaign as { smsBody?: string | null }).smsBody || "").trim();

  if (!input.owner.emailVerified) {
    checks.push({
      id: "email-verified",
      level: "error",
      label: "Verify your login email",
      detail: "You must verify your account email before sending campaigns.",
      blocksSend: true,
    });
  }

  if (input.owner.sendingHeldAt) {
    checks.push({
      id: "admin-hold",
      level: "error",
      label: "Sending is on hold",
      detail: "This account cannot launch campaigns until the hold is cleared.",
      blocksSend: true,
    });
  }

  if (needsSms) {
    if (!smsBody) {
      checks.push({
        id: "sms-body",
        level: "error",
        label: "Text message is empty",
        detail: "Add the text you want to send before launching.",
        blocksSend: true,
      });
    } else if (smsBody.length > 1600) {
      checks.push({
        id: "sms-body",
        level: "error",
        label: "Text message is too long",
        detail: "Keep the message under 1,600 characters.",
        blocksSend: true,
      });
    } else {
      checks.push({
        id: "sms-body",
        level: "ok",
        label: "Text message ready",
        detail: `${smsBody.length} characters`,
        blocksSend: false,
      });
    }

    if (input.hasActiveSmsNumber === false) {
      checks.push({
        id: "sms-number",
        level: "error",
        label: "No active text number",
        detail: "Finish text messaging setup so a number can send for this workspace.",
        fixHref: "/settings/text-messaging",
        blocksSend: true,
      });
    } else if (input.hasActiveSmsNumber) {
      checks.push({
        id: "sms-number",
        level: "ok",
        label: "Text number ready",
        detail: "An active number is assigned to this workspace.",
        blocksSend: false,
      });
    }

    if (input.hasActiveSmsSubscription === false) {
      checks.push({
        id: "sms-subscription",
        level: "error",
        label: "Text plan not active",
        detail: "An active text messaging plan is required to send texts.",
        fixHref: "/billing/sms",
        blocksSend: true,
      });
    }

    if (typeof input.smsAudienceSize === "number" && input.smsAudienceSize <= 0) {
      checks.push({
        id: "sms-audience",
        level: "error",
        label: "No SMS-eligible contacts",
        detail: "Add contacts with phone numbers and SMS consent, or clear suppressions.",
        fixHref: "/contacts",
        blocksSend: true,
      });
    } else if (typeof input.smsAudienceSize === "number") {
      checks.push({
        id: "sms-audience",
        level: "ok",
        label: "SMS audience ready",
        detail: `${input.smsAudienceSize} opted-in contact(s)`,
        blocksSend: false,
      });
    }
  }

  // Email-leg checks — skip hard email content requirements for SMS-only
  if (!needsEmail) {
    const errors = checks.filter((c) => c.level === "error").length;
    const warnings = checks.filter((c) => c.level === "warning").length;
    const oks = checks.filter((c) => c.level === "ok").length;
    let score = 100 - errors * 25 - warnings * 8;
    score = Math.max(0, Math.min(100, score + Math.min(10, oks)));
    return {
      score,
      checks,
      canSend: checks.every((c) => !c.blocksSend),
      disclaimer:
        "This is a readiness checklist, not a carrier guarantee. Delivery depends on consent, number quality, and carrier rules.",
    };
  }

  if (!input.sender || input.sender.status !== "VERIFIED") {
    checks.push({
      id: "sender",
      level: "error",
      label: "Verified sender required",
      detail: "Choose a verified From address before sending.",
      blocksSend: true,
    });
  } else if (input.sender.rewriteRequired) {
    checks.push({
      id: "rewrite",
      level: "warning",
      label: "From address will be rewritten",
      detail: `We'll send as yourname@platform domain with Reply-To ${input.sender.value} so mail can pass DMARC.`,
      blocksSend: false,
    });
  } else {
    checks.push({
      id: "sender",
      level: "ok",
      label: "Sender verified",
      detail: input.sender.value,
      blocksSend: false,
    });
  }

  if (!input.workspace.mailingAddress?.trim()) {
    checks.push({
      id: "address",
      level: "error",
      label: "Physical mailing address missing",
      detail: "CAN-SPAM requires a postal address in every campaign. Add it in Settings.",
      blocksSend: true,
    });
  } else {
    checks.push({
      id: "address",
      level: "ok",
      label: "Mailing address present",
      detail: "Required footer content can be injected.",
      blocksSend: false,
    });
  }

  if (!subject) {
    checks.push({
      id: "subject",
      level: "error",
      label: "Subject line missing",
      detail: "Add a clear subject before sending.",
      blocksSend: true,
    });
  } else if (subject.length > 78) {
    checks.push({
      id: "subject",
      level: "warning",
      label: "Subject is long",
      detail: `${subject.length} characters — many inboxes truncate around 60–70.`,
      blocksSend: false,
    });
  } else if (subject === subject.toUpperCase() && subject.length > 8) {
    checks.push({
      id: "subject-caps",
      level: "warning",
      label: "Subject is all caps",
      detail: "ALL CAPS subjects often look spammy.",
      blocksSend: false,
    });
  } else {
    checks.push({
      id: "subject",
      level: "ok",
      label: "Subject looks reasonable",
      detail: `${subject.length} characters`,
      blocksSend: false,
    });
  }

  if (!input.campaign.previewText?.trim()) {
    checks.push({
      id: "preview",
      level: "warning",
      label: "Preview text missing",
      detail: "Inbox preview text helps people decide to open.",
      blocksSend: false,
    });
  }

  if (!html.trim()) {
    checks.push({
      id: "content",
      level: "error",
      label: "Email has no content",
      detail: "Design or paste content before sending.",
      blocksSend: true,
    });
  } else {
    if (!hasUnsubscribe(html) && !input.campaign.rawHtmlMode) {
      // Compiler injects footer — ok
      checks.push({
        id: "unsub",
        level: "ok",
        label: "Unsubscribe will be included",
        detail: "Footer injection adds an unsubscribe link at send time.",
        blocksSend: false,
      });
    } else if (input.campaign.rawHtmlMode && !hasUnsubscribe(html)) {
      checks.push({
        id: "unsub",
        level: "error",
        label: "Unsubscribe link missing",
        detail: "Raw HTML must include an unsubscribe link or {{unsubscribe_url}}.",
        blocksSend: true,
      });
    }

    const links = linkIssues(html);
    if (links.length) {
      checks.push({
        id: "links",
        level: "warning",
        label: "Some links look incomplete",
        detail: links.join("; "),
        blocksSend: false,
      });
    }

    const alts = missingAlts(html);
    if (alts > 0) {
      checks.push({
        id: "alt",
        level: "warning",
        label: `${alts} image(s) missing alt text`,
        detail: "Alt text helps accessibility and some filters.",
        blocksSend: false,
      });
    }

    const tl = textLength(html);
    if (tl < 40) {
      checks.push({
        id: "text",
        level: "warning",
        label: "Very little text content",
        detail: "Image-heavy emails can look empty or promotional.",
        blocksSend: false,
      });
    }

    const noFb = mergeTagsWithoutFallback(html);
    if (noFb.length) {
      checks.push({
        id: "merge",
        level: "warning",
        label: "Merge tags without fallbacks",
        detail: `Consider {{tag|fallback}} for: ${noFb.join(", ")}`,
        blocksSend: false,
      });
    }
  }

  if (input.audienceSize <= 0) {
    checks.push({
      id: "audience",
      level: "error",
      label: "Audience is empty",
      detail: "No subscribed, non-suppressed recipients match this audience.",
      blocksSend: true,
    });
  } else {
    checks.push({
      id: "audience",
      level: "ok",
      label: `${input.audienceSize.toLocaleString()} recipients`,
      detail:
        input.suppressedCount > 0
          ? `${input.suppressedCount} suppressed addresses excluded`
          : "Suppression list applied",
      blocksSend: false,
    });
  }

  if (input.owner.monthlySendCount + input.audienceSize > plan.emailsPerMonth) {
    checks.push({
      id: "quota",
      level: "error",
      label: "Over monthly email quota",
      detail: `Plan allows ${plan.emailsPerMonth.toLocaleString()}/month.`,
      blocksSend: true,
    });
  }

  if (input.recentBounceRate > BOUNCE_PAUSE_THRESHOLD) {
    checks.push({
      id: "bounce-health",
      level: "error",
      label: "Recent bounce rate is too high",
      detail: "Clean your list before sending more.",
      blocksSend: true,
    });
  } else if (input.recentBounceRate > BOUNCE_PAUSE_THRESHOLD / 2) {
    checks.push({
      id: "bounce-health",
      level: "warning",
      label: "Bounce rate elevated",
      detail: "Monitor list quality closely.",
      blocksSend: false,
    });
  }

  if (input.recentComplaintRate > COMPLAINT_PAUSE_THRESHOLD) {
    checks.push({
      id: "complaint-health",
      level: "error",
      label: "Complaint rate exceeds safe threshold",
      detail: "Pause marketing until you fix list consent.",
      blocksSend: true,
    });
  }

  if (!input.campaign.testSentAt) {
    checks.push({
      id: "test",
      level: "warning",
      label: "No test email sent yet",
      detail: "Send a test to yourself before the full blast.",
      blocksSend: false,
    });
  } else {
    checks.push({
      id: "test",
      level: "ok",
      label: "Test email recorded",
      detail: "You sent at least one test for this campaign.",
      blocksSend: false,
    });
  }

  const withFixes = checks.map((c) => enrichCheck(c));

  const errors = withFixes.filter((c) => c.level === "error").length;
  const warnings = withFixes.filter((c) => c.level === "warning").length;
  const oks = withFixes.filter((c) => c.level === "ok").length;
  let score = 100 - errors * 25 - warnings * 8;
  score = Math.max(0, Math.min(100, score + Math.min(10, oks)));

  return {
    score,
    checks: withFixes,
    canSend: withFixes.every((c) => !c.blocksSend),
    disclaimer:
      "This is a readiness checklist, not a spam score or inbox-placement guarantee. Filters vary by mailbox provider.",
  };
}

const FIX_MAP: Record<string, { why: string; fixHref?: string }> = {
  "email-verified": {
    why: "Providers treat unverified accounts as higher risk.",
    fixHref: "/settings",
  },
  "admin-hold": {
    why: "A hold protects your domain reputation until issues are resolved.",
  },
  sender: {
    why: "Mailbox providers reject or junk mail from unverified From addresses.",
    fixHref: "/settings/senders",
  },
  rewrite: {
    why: "Rewriting keeps delivery working when your domain has strict DMARC.",
    fixHref: "/settings/senders",
  },
  address: {
    why: "US law (CAN-SPAM) requires a physical mailing address in every commercial email.",
    fixHref: "/settings",
  },
  subject: {
    why: "Subject lines decide whether someone opens — and all-caps or missing subjects hurt trust.",
  },
  "subject-caps": {
    why: "ALL CAPS often looks like spam to people and filters.",
  },
  preview: {
    why: "Inbox preview text is the second line people see next to the subject.",
  },
  content: {
    why: "An empty email cannot be delivered meaningfully.",
  },
  unsub: {
    why: "Every marketing email must offer an easy unsubscribe.",
  },
  links: {
    why: "Broken or empty links frustrate readers and can look phishing-like.",
  },
  alt: {
    why: "Alt text helps screen readers and some content filters.",
  },
  text: {
    why: "Emails that are almost only images are often treated as promotional.",
  },
  merge: {
    why: "Missing merge data can show blank names in the inbox.",
  },
  audience: {
    why: "There must be at least one eligible subscribed contact.",
    fixHref: "/contacts",
  },
  quota: {
    why: "Your plan caps how many emails you can send each month.",
    fixHref: "/billing",
  },
  "bounce-health": {
    why: "High bounces damage sender reputation and can pause sending.",
    fixHref: "/contacts",
  },
  "complaint-health": {
    why: "Spam complaints are the fastest way to lose inbox placement.",
    fixHref: "/contacts",
  },
  test: {
    why: "A test catch typos and broken links before customers see them.",
  },
  "sms-body": {
    why: "Carriers and customers need a clear text body before anything can send.",
  },
  "sms-number": {
    why: "Texts must send from your workspace number.",
    fixHref: "/settings/text-messaging",
  },
  "sms-subscription": {
    why: "An active text plan covers carrier and usage costs.",
    fixHref: "/billing/sms",
  },
  "sms-audience": {
    why: "Only contacts with SMS consent can receive marketing texts.",
    fixHref: "/contacts",
  },
};

function enrichCheck(c: ConfidenceCheck): ConfidenceCheck {
  const meta = FIX_MAP[c.id];
  if (!meta) return c;
  return {
    ...c,
    why: c.why || meta.why,
    fixHref: c.fixHref || meta.fixHref,
  };
}

/** Quick helper to inspect designJson for confidence when HTML missing */
export function designHasBlocks(designJson: unknown): boolean {
  const d = designJson as EmailDesign | null;
  return Array.isArray(d?.blocks) && d!.blocks.length > 0;
}
