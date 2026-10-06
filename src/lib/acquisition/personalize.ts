/**
 * Controlled Casey copy versions — Autopilot pitch is primary.
 * Casey is the intentional SendFable outreach persona.
 */

import { PLANS } from "@/lib/plans";

export type PersonalizationInput = {
  businessName: string;
  firstName?: string | null;
  claim: string;
  evidence: string;
  sourceUrl: string;
};

export type BuiltOutreach = {
  subject: string;
  bodyText: string;
  opener: string;
};

/** Stable controlled variants. v1a/v1b = Marketing Autopilot A/B. */
export const COPY_VERSIONS = ["v1a", "v1b", "v2a"] as const;
export type CopyVersionId = (typeof COPY_VERSIONS)[number];

export const DEFAULT_COPY_VERSION: CopyVersionId = "v1a";

/** Primary Casey landing for Autopilot acquisition. */
export const ACQUISITION_AUTOPILOT_LANDING = "/automated-email-marketing";

export function isCopyVersionId(v: string | null | undefined): v is CopyVersionId {
  return Boolean(v && (COPY_VERSIONS as readonly string[]).includes(v));
}

export function nextCopyVersion(current: string): CopyVersionId {
  const idx = COPY_VERSIONS.indexOf(current as CopyVersionId);
  if (idx < 0) return "v1b";
  return COPY_VERSIONS[Math.min(idx + 1, COPY_VERSIONS.length - 1)]!;
}

function greeting(firstName?: string | null, businessName?: string | null): string {
  const n = (firstName || "").trim();
  if (n && /^[A-Za-z][A-Za-z.'-]{0,39}$/.test(n)) return `Hi ${n},`;
  const biz = (businessName || "").trim();
  if (biz) return `Hi ${biz},`;
  return "Hi there,";
}

function freePlanLine(): string {
  return `It's free for up to ${PLANS.FREE.contactCap.toLocaleString()} contacts and ${PLANS.FREE.emailsPerMonth.toLocaleString()} emails/month — no credit card.`;
}

/**
 * Build initial outreach around Marketing Autopilot.
 * Claim/evidence/sourceUrl remain stored for truthfulness / quality gate;
 * the lead body is the Autopilot pitch (not the old SMB-tool angle).
 */
export function buildInitialEmail(
  input: PersonalizationInput,
  opts: {
    unsubUrl: string;
    siteUrl?: string;
    /** Absolute CTA URL (may be click-tracked) */
    ctaUrl?: string;
    copyVersion?: CopyVersionId | string;
    landingPath?: string;
  }
): BuiltOutreach {
  if (!input.claim.trim()) throw new Error("personalization_claim_required");
  if (!input.evidence.trim()) throw new Error("personalization_evidence_required");
  if (!input.sourceUrl.trim()) throw new Error("personalization_source_required");

  const version = isCopyVersionId(opts.copyVersion)
    ? opts.copyVersion
    : DEFAULT_COPY_VERSION;
  const site = opts.siteUrl || "https://sendfable.com";
  const path = opts.landingPath || ACQUISITION_AUTOPILOT_LANDING;
  const cta =
    opts.ctaUrl ||
    `${site}${path.startsWith("/") ? path : `/${path}`}?utm_source=casey&utm_medium=email&utm_campaign=acquisition&utm_content=${version}`;

  const biz = input.businessName.trim() || "your business";
  const opener = input.claim.trim();

  if (version === "v1b") {
    const subject = `What if ${biz}'s marketing mostly wrote itself?`;
    const body = [
      greeting(input.firstName, biz),
      "",
      "Website changes",
      "→ campaign created",
      "→ you approve it",
      "→ customers get it",
      "",
      `That's Marketing Autopilot from SendFable. Point it at the page where ${biz} posts specials, events, products, or news. When something worth sharing changes, we draft the email and send it to you — send, edit, or skip. Nothing goes out unless you approve.`,
      "",
      "It also collects customers from your site and supports Email, Text, or Both.",
      "",
      "See how it works:",
      cta,
      "",
      "— Casey",
      "SendFable",
      "",
      freePlanLine(),
      "",
      `If you'd rather not hear from me again, reply "no thanks" or unsubscribe: ${opts.unsubUrl}`,
    ].join("\n");
    return { subject, bodyText: body, opener };
  }

  // v1a (default) and v2a — Autopilot conversational pitch
  const subject =
    version === "v2a"
      ? `Could ${biz}'s website write your next email?`
      : "Could your website write your marketing emails?";

  const body = [
    greeting(input.firstName, biz),
    "",
    `I'm with SendFable. We just launched something I thought could be useful for ${biz}.`,
    "",
    "Point SendFable at the page where you post specials, events, products, or news. When something worth sharing changes, SendFable creates the marketing email and sends it to you for approval.",
    "",
    "You can send it, edit it, or skip it. Nothing goes out unless you approve it.",
    "",
    "It can also collect customers from your website and handle Email, Text, or Both.",
    "",
    "See how it works:",
    cta,
    "",
    "— Casey",
    "SendFable",
    "",
    freePlanLine(),
    "",
    `If you'd rather not hear from me again, reply "no thanks" or unsubscribe: ${opts.unsubUrl}`,
  ].join("\n");

  return { subject, bodyText: body, opener };
}

export function buildFollowUp1(
  input: { businessName: string; firstName?: string | null },
  opts: {
    unsubUrl: string;
    siteUrl?: string;
    ctaUrl?: string;
    landingPath?: string;
    copyVersion?: string;
  }
): BuiltOutreach {
  const site = opts.siteUrl || "https://sendfable.com";
  const path = opts.landingPath || ACQUISITION_AUTOPILOT_LANDING;
  const version = opts.copyVersion || DEFAULT_COPY_VERSION;
  const cta =
    opts.ctaUrl ||
    `${site}${path.startsWith("/") ? path : `/${path}`}?utm_source=casey&utm_medium=email&utm_campaign=acquisition_fu1&utm_content=${version}`;

  const body = [
    greeting(input.firstName, input.businessName),
    "",
    "Just wanted to make sure you saw this — SendFable can watch the page where you already post specials or updates and prepare the customer email for you. You still approve every send.",
    "",
    "Quick look:",
    cta,
    "",
    "— Casey",
    "",
    `If you'd rather not hear from me again, reply "no thanks" or unsubscribe: ${opts.unsubUrl}`,
  ].join("\n");
  return {
    subject: `Re: Could your website write your marketing emails?`,
    bodyText: body,
    opener: "follow_up_1",
  };
}

export function buildFollowUp2(
  input: { firstName?: string | null; businessName?: string | null },
  opts: { unsubUrl: string; siteUrl?: string }
): BuiltOutreach {
  const site = opts.siteUrl || "https://sendfable.com";
  const body = [
    greeting(input.firstName, input.businessName),
    "",
    "Last note from me.",
    "",
    `If you ever want marketing that drafts itself from your website — and never sends without your approval — SendFable is at ${site.replace(/^https?:\/\//, "")}${ACQUISITION_AUTOPILOT_LANDING}.`,
    "",
    "Thanks,",
    "Casey",
    "",
    `If you'd rather not hear from me again, reply "no thanks" or unsubscribe: ${opts.unsubUrl}`,
  ].join("\n");
  return {
    subject: "Last note — Marketing Autopilot",
    bodyText: body,
    opener: "follow_up_2",
  };
}

/** Reject openers that invent unsupported claims. */
export function openerLooksFabricated(opener: string): boolean {
  const o = opener.toLowerCase();
  const banned = [
    /you (currently )?use (mailchimp|constant contact|mailerlite|brevo)/,
    /\d{2,}\s*(customers|subscribers|contacts)/,
    /your revenue/,
    /i know you('re| are) struggling/,
    /guaranteed/,
  ];
  return banned.some((re) => re.test(o));
}

export function openerTypeFromProspect(p: {
  newsletterPresent?: boolean;
  eventsPromotionsPresent?: boolean;
  competitorPlatform?: string | null;
}): "newsletter" | "events" | "competitor" | "category" {
  if (p.newsletterPresent) return "newsletter";
  if (p.eventsPromotionsPresent) return "events";
  if (p.competitorPlatform) return "competitor";
  return "category";
}

/**
 * Map enrichment evidence → a truthful one-sentence claim.
 * Returns null if nothing solid enough.
 */
export function claimFromEvidence(ev: {
  newsletterPresent?: boolean;
  eventsPromotionsPresent?: boolean;
  competitorPlatform?: string | null;
  category?: string;
  evidenceSnippet?: string;
}): { claim: string; evidence: string } | null {
  const snippet = (ev.evidenceSnippet || "").trim().slice(0, 280);
  if (ev.newsletterPresent) {
    return {
      claim:
        "I noticed you already have a newsletter signup on your site, so you're clearly thinking about staying in touch with customers.",
      evidence: snippet || "newsletter signup form detected on public website",
    };
  }
  if (ev.eventsPromotionsPresent) {
    return {
      claim:
        "I saw you promote events or specials on your site, and email is often the easiest way to remind regulars.",
      evidence: snippet || "events/promotions language detected on public website",
    };
  }
  if (ev.competitorPlatform) {
    return {
      claim: `I noticed your site links out to an email signup powered by ${ev.competitorPlatform}, which made me think a simpler tool might be useful.`,
      evidence: snippet || `${ev.competitorPlatform} signup widget detected`,
    };
  }
  if (ev.category === "brewery" || ev.category === "taproom") {
    return {
      claim: snippet
        ? "Your site highlights releases or events — a short email is often how taprooms fill the room."
        : "I came across your brewery site and thought a simple email tool might help you stay in touch with regulars.",
      evidence: snippet || "public brewery/taproom website with published contact path",
    };
  }
  if (
    ev.category === "restaurant" ||
    ev.category === "cafe" ||
    ev.category === "bakery"
  ) {
    return {
      claim: snippet
        ? "Your site highlights specials or what's happening — email is a simple way to remind locals."
        : "I came across your restaurant site and thought a simple email tool might help you stay in touch with regulars.",
      evidence: snippet || "public restaurant/cafe website with published contact path",
    };
  }
  if (
    ev.category === "salon" ||
    ev.category === "fitness" ||
    ev.category === "retail" ||
    ev.category === "pet" ||
    ev.category === "events" ||
    ev.category === "contractor" ||
    ev.category === "real_estate" ||
    ev.category === "professional" ||
    ev.category === "nonprofit" ||
    ev.category === "local_services"
  ) {
    return {
      claim: snippet
        ? "I came across your site and thought staying in touch with customers by email might be useful."
        : "I came across your business site and thought a simple email tool might help you stay in touch with customers.",
      evidence: snippet || "public local-business website with published contact path",
    };
  }
  return null;
}
