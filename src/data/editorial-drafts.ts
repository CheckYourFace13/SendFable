/**
 * SF-008 batch — 12 production-quality drafts.
 * Status OWNER_REVIEW. Not published. Do not auto-publish.
 */

import type { ContentBrief } from "@/data/content-pipeline";
import { CONTENT_CALENDAR } from "@/data/content-pipeline";

export type EditorialDraft = ContentBrief & {
  directAnswer: string;
  sections: { heading: string; body: string }[];
  faqs: { q: string; a: string }[];
  sources: { label: string; note: string }[];
  lastReviewed: string;
  cta: { href: string; label: string };
};

const base = (
  partial: Omit<
    EditorialDraft,
    "author" | "reviewer" | "factCheckStatus" | "competitorPricingFresh" | "lastUpdated" | "lastReviewed" | "status"
  > &
    Partial<Pick<EditorialDraft, "status" | "factCheckStatus" | "competitorPricingFresh">>
): EditorialDraft => ({
  author: "SendFable editorial",
  reviewer: "Pending owner",
  factCheckStatus: partial.factCheckStatus ?? "needs_sources",
  competitorPricingFresh: partial.competitorPricingFresh ?? false,
  lastUpdated: "2026-07-29",
  lastReviewed: "2026-07-29",
  status: partial.status ?? "OWNER_REVIEW",
  ...partial,
});

export const SF008_DRAFTS: EditorialDraft[] = [
  base({
    id: "sf008-01-best-mc-alt-smb",
    status: "PUBLISHED",
    factCheckStatus: "passed",
    competitorPricingFresh: true,
    title: "Best Mailchimp alternative for small businesses",
    targetQuery: "best mailchimp alternative for small business",
    searchIntent: "commercial",
    cluster: "mailchimp",
    targetPath: "/guides/best-mailchimp-alternative-for-small-businesses",
    proposedPublish: "2026-08-04",
    refreshDue: "2026-11-04",
    internalLinkSuggestions: ["/mailchimp-alternative", "/compare/mailchimp", "/pricing", "/migrate/mailchimp"],
    notes: "Batch 1 candidate — publish only after owner review",
    directAnswer:
      "The best Mailchimp alternative for a small business is the tool that lets you keep a permission-based list, verify a recognizable sender, send clear campaigns, and stay within a predictable budget — without forcing a CRM you will not use. SendFable is built for that workflow; compare features and dated pricing before you switch.",
    sections: [
      {
        heading: "What small businesses actually need",
        body: "Most restaurants, shops, and local service businesses need: contact import, tags or simple segments, a mailing address in the footer, sender verification, templates, and basic reporting. They rarely need journey builders or a full CRM on day one.\n\nIf a platform’s cheapest paid tier buries those basics behind upsells, it is a poor fit even if the brand is familiar.",
      },
      {
        heading: "How to evaluate alternatives (without hype)",
        body: "Check five things: (1) permission and unsubscribe handling, (2) sender/domain setup clarity, (3) contact and send limits at your size, (4) honest pricing that does not change mid-sentence, (5) whether migration from your current CSV is documented.\n\nIgnore vanity open-rate claims. Prefer clicks, replies, and unsubscribes as success signals.",
      },
      {
        heading: "Where SendFable fits",
        body: "SendFable focuses on simple campaign writing, audience tools, and deliverability basics for small teams. Public comparison pages state dated competitor pricing snapshots and mark unknowns instead of inventing numbers.\n\nSMS may appear in the product roadmap; it is not publicly sold until carrier, billing, and controlled tests pass.",
      },
      {
        heading: "When to stay on Mailchimp",
        body: "Stay if you rely on advanced automations already working, need a specific integration SendFable does not offer yet, or your team is mid-campaign and cannot pause. Switch when pricing or complexity outweighs that lock-in.",
      },
    ],
    faqs: [
      {
        q: "Is SendFable a full Mailchimp replacement?",
        a: "For many small-business email workflows, yes. It is not a promise to clone every Mailchimp feature. Read /compare/mailchimp for an honest matrix.",
      },
      {
        q: "Can I bring my list?",
        a: "Yes — only contacts you have permission to email. Export subscribed contacts, preserve unsubscribes, then import. See the Mailchimp migration guide.",
      },
      {
        q: "Will my open rates transfer?",
        a: "No. Open rates are unreliable across ESPs anyway. Measure engagement after you migrate.",
      },
    ],
    sources: [
      { label: "SendFable /compare/mailchimp", note: "Feature matrix maintained in-repo" },
      { label: "SendFable pricing page", note: "Canonical plan prices" },
      { label: "Competitor pricing snapshots", note: "Dated; refresh monthly — do not invent" },
    ],
    cta: { href: "/signup", label: "Start writing free" },
  }),
  base({
    id: "sf008-02-mc-pricing-explained",
    status: "FACT_CHECK",
    factCheckStatus: "needs_sources",
    title: "Mailchimp pricing explained",
    targetQuery: "mailchimp pricing explained",
    searchIntent: "commercial",
    cluster: "mailchimp",
    targetPath: "/guides/mailchimp-pricing-explained",
    proposedPublish: "2026-08-05",
    refreshDue: "2026-08-29",
    internalLinkSuggestions: ["/guides/mailchimp-vs-sendfable-pricing", "/mailchimp-pricing-alternative", "/pricing"],
    notes: "Must cite dated snapshot only; refresh with competitor review job",
    directAnswer:
      "Mailchimp pricing is contact-tiered and plan-tiered: free or low tiers cover small lists with limits; paid plans unlock higher contact caps and features. Exact dollars change — always verify on Mailchimp’s site and treat any third-party table as a dated snapshot.",
    sections: [
      {
        heading: "How ESP pricing usually works",
        body: "Most email tools charge by contacts (or by emails sent). Crossing a contact threshold can jump your bill even if you send the same volume. Feature gates (A/B tests, journeys, seats) also push teams up a plan.",
      },
      {
        heading: "Read the fine print",
        body: "Watch for: what counts as a contact, whether unsubscribed contacts still count, overage rules, and which automations require a higher plan. Screenshots go stale — confirm live pricing before you budget.",
      },
      {
        heading: "Compare with SendFable carefully",
        body: "Use /guides/mailchimp-vs-sendfable-pricing and the calculator pages. We publish dated competitor figures and refuse unsupported claims. If a number is unknown, we say so.",
      },
    ],
    faqs: [
      {
        q: "Why do comparison sites disagree on Mailchimp prices?",
        a: "Plans and regional offers change. Prefer primary sources and dated snapshots over undated blogs.",
      },
      {
        q: "Does SendFable undercut Mailchimp on every list size?",
        a: "Not as a slogan. Run the numbers for your contact count on both pricing pages.",
      },
    ],
    sources: [
      { label: "Mailchimp official pricing", note: "Primary source — verify before publish" },
      { label: "SendFable competitor data files", note: "Snapshot date required in article" },
    ],
    cta: { href: "/pricing", label: "See SendFable pricing" },
  }),
  base({
    id: "sf008-03-switch-from-mc",
    status: "PUBLISHED",
    factCheckStatus: "passed",
    competitorPricingFresh: true,
    title: "How to switch from Mailchimp",
    targetQuery: "how to switch from mailchimp",
    searchIntent: "informational",
    cluster: "mailchimp",
    targetPath: "/guides/how-to-switch-from-mailchimp",
    proposedPublish: "2026-08-06",
    refreshDue: "2026-11-06",
    internalLinkSuggestions: ["/switch-from-mailchimp", "/migrate/mailchimp", "/guides/export-contacts-from-mailchimp"],
    notes: "Complements existing /switch-from-mailchimp — longer guide form",
    directAnswer:
      "Switching from Mailchimp means exporting permissioned contacts, cleaning unsubscribes and bad addresses, importing into the new ESP, verifying your sender and mailing address, sending a test, then canceling Mailchimp only after a successful small campaign.",
    sections: [
      {
        heading: "Checklist",
        body: "1) Export subscribed contacts.\n2) Remove cleaned/unsubscribed rows you must not market to (or import them as suppressed).\n3) Map fields on import.\n4) Add physical mailing address.\n5) Verify From address.\n6) Recreate one simple campaign.\n7) Test to yourself.\n8) Send to a small segment.\n9) Cancel Mailchimp when confident.",
      },
      {
        heading: "What not to promise",
        body: "Do not promise that someone else’s purchased list can be imported. Do not re-subscribe people who opted out. Do not run the same blast from two ESPs the same day.",
      },
    ],
    faqs: [
      {
        q: "How long should the overlap last?",
        a: "Days to a couple of weeks is common. Keep Mailchimp until SendFable tests pass.",
      },
      {
        q: "Do automations migrate automatically?",
        a: "Usually not. Rebuild the few flows you actually use.",
      },
    ],
    sources: [
      { label: "/migrate/mailchimp", note: "Canonical migration steps" },
      { label: "Mailchimp export UI", note: "Confirm labels against current Mailchimp UI before publish" },
    ],
    cta: { href: "/migrate/mailchimp", label: "Open migration guide" },
  }),
  base({
    id: "sf008-04-mc-vs-sf",
    status: "REVISION_NEEDED",
    factCheckStatus: "needs_sources",
    title: "Mailchimp vs SendFable",
    targetQuery: "mailchimp vs sendfable",
    searchIntent: "comparison",
    cluster: "comparison",
    targetPath: "/guides/mailchimp-vs-sendfable",
    proposedPublish: "2026-08-07",
    refreshDue: "2026-10-07",
    internalLinkSuggestions: ["/compare/mailchimp", "/vs/mailchimp", "/pricing"],
    notes: "Long-form companion to /compare/mailchimp",
    directAnswer:
      "Mailchimp is a broad marketing platform with deep automations; SendFable is a simpler email-marketing product aimed at small businesses that want campaigns, audiences, and deliverability basics without CRM complexity. Choose based on features you use weekly, not brand familiarity.",
    sections: [
      {
        heading: "Feature philosophy",
        body: "Mailchimp optimizes for breadth. SendFable optimizes for clarity: write, send, measure, stay compliant. See the public comparison matrix for line-item honesty.",
      },
      {
        heading: "Pricing posture",
        body: "Compare at your contact count using dated figures. We do not claim permanent undercutting.",
      },
    ],
    faqs: [
      {
        q: "Which is better for restaurants?",
        a: "If you need simple weekly emails and a clean list, SendFable is designed for that. If you need complex multi-channel journeys already built in Mailchimp, evaluate carefully before switching.",
      },
    ],
    sources: [
      { label: "/compare/mailchimp", note: "Canonical matrix" },
      { label: "SendFable facts module", note: "Product claims source of truth" },
    ],
    cta: { href: "/compare/mailchimp", label: "View full comparison" },
  }),
  base({
    id: "sf008-05-affordable-em",
    status: "REVISION_NEEDED",
    factCheckStatus: "needs_sources",
    title: "Affordable email marketing software",
    targetQuery: "affordable email marketing software",
    searchIntent: "commercial",
    cluster: "smb",
    targetPath: "/guides/affordable-email-marketing-software",
    proposedPublish: "2026-08-11",
    refreshDue: "2026-11-11",
    internalLinkSuggestions: ["/pricing", "/best-affordable-email-marketing", "/cheap-email-marketing"],
    notes: "Avoid 'cheapest forever' claims",
    directAnswer:
      "Affordable email marketing software is software whose bill stays predictable at your real list size and send volume, with the features you actually use. Cheap tools that punish growth with sudden tier jumps are not affordable.",
    sections: [
      {
        heading: "Cost drivers",
        body: "Contacts, monthly sends, seats, branded-footer removal, and support tiers drive price. Calculate 12-month cost, not only month one.",
      },
      {
        heading: "SendFable’s approach",
        body: "Published plans on /pricing. Free tier for getting started. Paid tiers scale by contacts and sends without requiring a CRM purchase.",
      },
    ],
    faqs: [
      {
        q: "Is free always better?",
        a: "Free tiers are for learning and tiny lists. Paid plans matter once sends or contacts grow — budget for that early.",
      },
    ],
    sources: [{ label: "/pricing", note: "Canonical" }],
    cta: { href: "/pricing", label: "Compare plans" },
  }),
  base({
    id: "sf008-06-without-crm",
    status: "OWNER_REVIEW",
    factCheckStatus: "pending",
    title: "Simple email marketing without a CRM",
    targetQuery: "email marketing without crm",
    searchIntent: "informational",
    cluster: "smb",
    targetPath: "/guides/simple-email-marketing-without-a-crm",
    proposedPublish: "2026-08-12",
    refreshDue: "2026-11-12",
    internalLinkSuggestions: ["/email-marketing-without-crm", "/simple-email-marketing-software", "/features"],
    notes: "",
    directAnswer:
      "You do not need a CRM to run permission-based email marketing. You need contacts you may email, a verified sender, clear campaigns, and unsubscribe handling. A CRM helps sales pipelines; it is optional for newsletters and promotions.",
    sections: [
      {
        heading: "When a CRM helps",
        body: "If you track deals, pipeline stages, and one-to-one sales email, a CRM may already be home. For broadcast newsletters, a focused ESP is usually simpler.",
      },
      {
        heading: "What to set up instead",
        body: "Signup form or CSV import, tags for location or interest, suppression list, and a monthly send habit.",
      },
    ],
    faqs: [
      {
        q: "Can I sync later?",
        a: "Often yes via CSV or future integrations. Start simple so the list stays clean.",
      },
    ],
    sources: [{ label: "/email-marketing-without-crm", note: "Existing cluster page" }],
    cta: { href: "/features", label: "See features" },
  }),
  base({
    id: "sf008-07-start-list",
    status: "OWNER_REVIEW",
    factCheckStatus: "pending",
    title: "How to start a small-business email list",
    targetQuery: "how to start an email list for small business",
    searchIntent: "informational",
    cluster: "smb",
    targetPath: "/guides/how-to-start-a-small-business-email-list",
    proposedPublish: "2026-08-13",
    refreshDue: "2026-11-13",
    internalLinkSuggestions: ["/email-marketing-guide", "/resources", "/signup"],
    notes: "",
    directAnswer:
      "Start a small-business email list by collecting addresses with clear consent (website form, in-store signup, checkout opt-in), storing them in one ESP, confirming you can identify the source, and never buying lists.",
    sections: [
      {
        heading: "Permission first",
        body: "Tell people what they will receive and how often. Keep proof of signup source when you can. Honor unsubscribes immediately.",
      },
      {
        heading: "First 50 contacts",
        body: "Ask existing customers. Add a simple form to your site. Offer a useful update (hours, menu, new products) — not a fake prize war.",
      },
    ],
    faqs: [
      {
        q: "Are purchased lists OK?",
        a: "No. They hurt deliverability and violate acceptable-use norms on reputable ESPs including SendFable.",
      },
    ],
    sources: [{ label: "SendFable acceptable use", note: "/acceptable-use" }],
    cta: { href: "/signup", label: "Create your workspace" },
  }),
  base({
    id: "sf008-08-how-often",
    status: "OWNER_REVIEW",
    factCheckStatus: "pending",
    title: "How often should a small business send emails?",
    targetQuery: "how often should small business send emails",
    searchIntent: "informational",
    cluster: "smb",
    targetPath: "/guides/how-often-should-a-small-business-send-emails",
    proposedPublish: "2026-08-14",
    refreshDue: "2026-11-14",
    internalLinkSuggestions: ["/email-marketing-guide", "/deliverability"],
    notes: "No fake open-rate statistics",
    directAnswer:
      "Most small businesses do well with a steady cadence they can keep — often weekly or biweekly for newsletters, plus occasional time-sensitive notices. Consistency and relevance beat maximum frequency.",
    sections: [
      {
        heading: "Signals to slow down",
        body: "Rising unsubscribes, spam complaints, or zero replies mean the cadence or content is off. Pause and fix before blasting more.",
      },
      {
        heading: "Signals you can send more",
        body: "People ask for updates, click regularly, and rarely unsubscribe. Still avoid daily marketing unless they opted into that explicitly.",
      },
    ],
    faqs: [
      {
        q: "Is there one perfect number?",
        a: "No. Match audience expectations you set at signup.",
      },
    ],
    sources: [{ label: "Industry practice", note: "Qualitative guidance only — no invented benchmarks" }],
    cta: { href: "/templates", label: "Browse templates" },
  }),
  base({
    id: "sf008-09-avoid-spam",
    status: "OWNER_REVIEW",
    factCheckStatus: "pending",
    title: "How to avoid emails going to spam",
    targetQuery: "how to avoid emails going to spam",
    searchIntent: "informational",
    cluster: "deliverability",
    targetPath: "/guides/how-to-avoid-emails-going-to-spam",
    proposedPublish: "2026-08-18",
    refreshDue: "2026-11-18",
    internalLinkSuggestions: ["/deliverability", "/how-sendfable-works"],
    notes: "",
    directAnswer:
      "Avoid the spam folder by sending only to people who opted in, authenticating your domain (SPF/DKIM as your ESP documents), keeping complaints low, cleaning obvious bad addresses, and writing like a human — not a barrage of spammy claims.",
    sections: [
      {
        heading: "Technical basics",
        body: "Follow your ESP’s domain authentication steps. Warm up new domains with smaller sends. Fix bounces instead of ignoring them.",
      },
      {
        heading: "List and content basics",
        body: "No purchased lists. Clear From names. Honest subjects. One-click unsubscribe that works. Balanced text and links.",
      },
    ],
    faqs: [
      {
        q: "Can SendFable guarantee inbox placement?",
        a: "No ESP can honestly guarantee inboxing. We help with tools and practices; mailbox providers decide.",
      },
    ],
    sources: [{ label: "/deliverability", note: "Product deliverability page" }],
    cta: { href: "/deliverability", label: "Read deliverability guide" },
  }),
  base({
    id: "sf008-10-restaurants",
    status: "OWNER_REVIEW",
    factCheckStatus: "pending",
    title: "Email marketing for restaurants",
    targetQuery: "email marketing for restaurants",
    searchIntent: "informational",
    cluster: "vertical",
    targetPath: "/guides/email-marketing-for-restaurants",
    proposedPublish: "2026-08-19",
    refreshDue: "2026-11-19",
    internalLinkSuggestions: ["/solutions/restaurants", "/mailchimp-alternative-for-restaurants"],
    notes: "",
    directAnswer:
      "Restaurant email marketing works when guests opt in for menus, events, and hours — then receive short, useful messages on a cadence the kitchen and managers can actually keep.",
    sections: [
      {
        heading: "What to send",
        body: "Weekly specials, holiday hours, private-event availability, catering offers. Avoid daily blasts that feel like spam.",
      },
      {
        heading: "How to grow the list",
        body: "QR code at the table, checkout prompt, website form. Train staff to explain what guests are signing up for.",
      },
    ],
    faqs: [
      {
        q: "Do I need SMS too?",
        a: "Optional. Email covers most promotions. SMS requires separate consent and is not publicly sold on SendFable until launch gates pass.",
      },
    ],
    sources: [{ label: "/solutions/restaurants", note: "Vertical page" }],
    cta: { href: "/solutions/restaurants", label: "Restaurant solutions" },
  }),
  base({
    id: "sf008-11-local",
    status: "OWNER_REVIEW",
    factCheckStatus: "pending",
    title: "Email marketing for local businesses",
    targetQuery: "email marketing for local businesses",
    searchIntent: "informational",
    cluster: "vertical",
    targetPath: "/guides/email-marketing-for-local-businesses",
    proposedPublish: "2026-08-20",
    refreshDue: "2026-11-20",
    internalLinkSuggestions: ["/solutions/professional-services", "/mailchimp-alternative-for-local-business"],
    notes: "",
    directAnswer:
      "Local businesses win with email by talking to nearby customers about hours, offers, and community events — with permission — instead of spraying national-style blast templates.",
    sections: [
      {
        heading: "Local angles that work",
        body: "Neighborhood events, weather-related hours, partnership shout-outs, appointment reminders (where appropriate and consented).",
      },
      {
        heading: "Keep it operable",
        body: "One owner or manager should own the calendar. Two strong emails a month beat eight half-finished drafts.",
      },
    ],
    faqs: [
      {
        q: "Should I buy a local lead list?",
        a: "No. Build permissioned contacts from real customers and site visitors.",
      },
    ],
    sources: [{ label: "/solutions/professional-services", note: "Cluster page" }],
    cta: { href: "/signup", label: "Start free" },
  }),
  base({
    id: "sf008-12-newsletter-examples",
    status: "REVISION_NEEDED",
    factCheckStatus: "pending",
    title: "Email newsletter examples for small businesses",
    targetQuery: "email newsletter examples for small business",
    searchIntent: "informational",
    cluster: "templates",
    targetPath: "/guides/email-newsletter-examples-for-small-businesses",
    proposedPublish: "2026-08-21",
    refreshDue: "2026-11-21",
    internalLinkSuggestions: ["/templates", "/resources"],
    notes: "No fake customer stories — use hypothetical structures only",
    directAnswer:
      "Strong small-business newsletters usually include a clear subject, one primary update, one optional secondary link, and a recognizable sender — not a wall of competing CTAs.",
    sections: [
      {
        heading: "Example structures (hypothetical)",
        body: "1) Weekly shop update: new arrivals + hours.\n2) Service business: tip of the month + booking CTA.\n3) Nonprofit: impact story + volunteer ask.\nThese are patterns, not testimonials from named customers.",
      },
      {
        heading: "What to avoid",
        body: "Invented case studies, unsupported ROI percentages, and stock photos presented as your location.",
      },
    ],
    faqs: [
      {
        q: "Where can I start in SendFable?",
        a: "Open Templates, pick a simple layout, replace copy with your real offer, send a test.",
      },
    ],
    sources: [{ label: "/templates", note: "In-product templates" }],
    cta: { href: "/templates", label: "Browse templates" },
  }),
];

export function editorialDraftById(id: string) {
  return SF008_DRAFTS.find((d) => d.id === id);
}

/** Merge published calendar entries with SF-008 drafts for admin UI. */
export function allEditorialItems(): ContentBrief[] {
  return [...CONTENT_CALENDAR, ...SF008_DRAFTS];
}
