/**
 * Controlled Casey copy versions — small A/B only, no wild rewrites.
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

/** Stable controlled variants. Only advance via cohort eval. */
export const COPY_VERSIONS = ["v1a", "v1b", "v2a"] as const;
export type CopyVersionId = (typeof COPY_VERSIONS)[number];

export const DEFAULT_COPY_VERSION: CopyVersionId = "v1a";

export function isCopyVersionId(v: string | null | undefined): v is CopyVersionId {
  return Boolean(v && (COPY_VERSIONS as readonly string[]).includes(v));
}

export function nextCopyVersion(current: string): CopyVersionId {
  const idx = COPY_VERSIONS.indexOf(current as CopyVersionId);
  if (idx < 0) return "v1b";
  return COPY_VERSIONS[Math.min(idx + 1, COPY_VERSIONS.length - 1)]!;
}

function greeting(firstName?: string | null): string {
  const n = (firstName || "").trim();
  if (n && /^[A-Za-z][A-Za-z.'-]{0,39}$/.test(n)) return `Hi ${n},`;
  return "Hi there,";
}

function freePlanLine(): string {
  return `It's free for up to ${PLANS.FREE.contactCap.toLocaleString()} contacts and ${PLANS.FREE.emailsPerMonth.toLocaleString()} emails/month — no credit card.`;
}

function variantBits(
  version: CopyVersionId,
  businessName: string
): { subject: string; ask: string; helpLine: string } {
  switch (version) {
    case "v1b":
      return {
        subject: `A simpler email tool for ${businessName}?`,
        ask: "Worth a quick look?",
        helpLine: "If useful, I can help you get a first campaign out quickly.",
      };
    case "v2a":
      return {
        subject: `Quick question about ${businessName}`,
        ask: "Would a simpler free plan be useful?",
        helpLine: "Happy to help you send a first campaign if you want a hand.",
      };
    case "v1a":
    default:
      return {
        subject: `Quick question about ${businessName}`,
        ask: "Would you be open to taking a look?",
        helpLine: "If useful, I can help you get a first campaign out quickly.",
      };
  }
}

/**
 * Build initial outreach. Claim/evidence/sourceUrl must be truthful and stored.
 * Does not invent owner names, providers, or metrics.
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
  const opener = input.claim.trim();
  if (!opener) throw new Error("personalization_claim_required");
  if (!input.evidence.trim()) throw new Error("personalization_evidence_required");
  if (!input.sourceUrl.trim()) throw new Error("personalization_source_required");

  const version = isCopyVersionId(opts.copyVersion)
    ? opts.copyVersion
    : DEFAULT_COPY_VERSION;
  const bits = variantBits(version, input.businessName);
  const site = opts.siteUrl || "https://sendfable.com";
  const path = opts.landingPath || "/email-marketing-for-small-business";
  const cta =
    opts.ctaUrl ||
    `${site}${path.startsWith("/") ? path : `/${path}`}?utm_source=casey&utm_medium=email&utm_campaign=acquisition&utm_content=${version}`;

  const body = [
    greeting(input.firstName),
    "",
    opener,
    "",
    "I built SendFable for small businesses that want email marketing without the complexity and pricing creep of the bigger platforms.",
    "",
    freePlanLine(),
    "",
    bits.helpLine,
    "",
    bits.ask,
    "",
    "Casey",
    "SendFable",
    cta,
    "",
    `If you'd rather not hear from me again, reply "no thanks" or unsubscribe: ${opts.unsubUrl}`,
  ].join("\n");

  return { subject: bits.subject, bodyText: body, opener };
}

export function buildFollowUp1(
  input: { businessName: string; firstName?: string | null },
  opts: { unsubUrl: string }
): BuiltOutreach {
  const body = [
    greeting(input.firstName),
    "",
    "Just following up in case this got buried.",
    "",
    "SendFable is free to try, and I'd be happy to help get your first campaign set up.",
    "",
    `Would it be useful for ${input.businessName}?`,
    "",
    "Casey",
    "",
    `If you'd rather not hear from me again, reply "no thanks" or unsubscribe: ${opts.unsubUrl}`,
  ].join("\n");
  return {
    subject: `Re: Quick question about ${input.businessName}`,
    bodyText: body,
    opener: "follow_up_1",
  };
}

export function buildFollowUp2(
  input: { firstName?: string | null },
  opts: { unsubUrl: string; siteUrl?: string }
): BuiltOutreach {
  const site = opts.siteUrl || "https://sendfable.com";
  const body = [
    greeting(input.firstName),
    "",
    "Last note from me.",
    "",
    `If you ever want a simpler way to email customers, SendFable is at ${site.replace(/^https?:\/\//, "")}.`,
    "",
    "Thanks,",
    "Casey",
    "",
    `If you'd rather not hear from me again, reply "no thanks" or unsubscribe: ${opts.unsubUrl}`,
  ].join("\n");
  return {
    subject: "Last note — SendFable",
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
