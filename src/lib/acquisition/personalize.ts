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

function greeting(firstName?: string | null): string {
  const n = (firstName || "").trim();
  if (n && /^[A-Za-z][A-Za-z.'-]{0,39}$/.test(n)) return `Hi ${n},`;
  return "Hi there,";
}

function freePlanLine(): string {
  return `It's free for up to ${PLANS.FREE.contactCap.toLocaleString()} contacts and ${PLANS.FREE.emailsPerMonth.toLocaleString()} emails/month — no credit card.`;
}

/**
 * Build initial outreach. Claim/evidence/sourceUrl must be truthful and stored.
 * Does not invent owner names, providers, or metrics.
 */
export function buildInitialEmail(
  input: PersonalizationInput,
  opts: { unsubUrl: string; siteUrl?: string }
): BuiltOutreach {
  const opener = input.claim.trim();
  if (!opener) throw new Error("personalization_claim_required");
  if (!input.evidence.trim()) throw new Error("personalization_evidence_required");
  if (!input.sourceUrl.trim()) throw new Error("personalization_source_required");

  const subject = `Quick question about ${input.businessName}`;
  const site = opts.siteUrl || "https://sendfable.com";
  const body = [
    greeting(input.firstName),
    "",
    opener,
    "",
    "I built SendFable for small businesses that want email marketing without the complexity and pricing creep of the bigger platforms.",
    "",
    freePlanLine(),
    "",
    "If useful, I can help you get a first campaign out quickly.",
    "",
    "Would you be open to taking a look?",
    "",
    "Casey",
    "SendFable",
    `${site}/email-marketing-for-small-business?utm_source=casey&utm_medium=email&utm_campaign=acquisition`,
    "",
    `If you'd rather not hear from me again, reply "no thanks" or unsubscribe: ${opts.unsubUrl}`,
  ].join("\n");

  return { subject, bodyText: body, opener };
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
    // Only when confidently observable in page HTML — still don't claim "you use X" as fact about account
    return {
      claim: `I noticed your site links out to an email signup powered by ${ev.competitorPlatform}, which made me think a simpler tool might be useful.`,
      evidence: snippet || `${ev.competitorPlatform} signup widget detected`,
    };
  }
  if (ev.category === "brewery" || ev.category === "taproom") {
    if (snippet) {
      return {
        claim:
          "Your site highlights releases or events — a short email is often how taprooms fill the room.",
        evidence: snippet,
      };
    }
  }
  if (ev.category === "restaurant" || ev.category === "cafe" || ev.category === "bakery") {
    if (snippet) {
      return {
        claim:
          "Your site highlights specials or what's happening — email is a simple way to remind locals.",
        evidence: snippet,
      };
    }
  }
  return null;
}
