/**
 * Editorial content pipeline — reviewable workflow, not auto-publish.
 */

export const CONTENT_STATUSES = [
  "IDEA",
  "BRIEF",
  "DRAFT",
  "FACT_CHECK",
  "OWNER_REVIEW",
  "APPROVED",
  "SCHEDULED",
  "PUBLISHED",
  "REFRESH_DUE",
  "ARCHIVED",
] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export type ContentBrief = {
  id: string;
  title: string;
  targetQuery: string;
  searchIntent: "informational" | "commercial" | "transactional" | "comparison";
  cluster: "mailchimp" | "smb" | "deliverability" | "templates" | "comparison" | "vertical";
  status: ContentStatus;
  factCheckStatus: "pending" | "passed" | "needs_sources";
  competitorPricingFresh: boolean;
  targetPath?: string;
  proposedPublish?: string;
  lastUpdated: string;
  refreshDue?: string;
  author: string;
  reviewer: string;
  internalLinkSuggestions: string[];
  notes: string;
  performance?: { views?: number; signups?: number };
};

/** Seed calendar — drafts only until owner approval. */
export const CONTENT_CALENDAR: ContentBrief[] = [
  {
    id: "mc-export",
    title: "Export contacts from Mailchimp",
    targetQuery: "export contacts from mailchimp",
    searchIntent: "informational",
    cluster: "mailchimp",
    status: "PUBLISHED",
    factCheckStatus: "passed",
    competitorPricingFresh: true,
    targetPath: "/guides/export-contacts-from-mailchimp",
    lastUpdated: "2026-07-29",
    author: "SendFable editorial",
    reviewer: "Owner",
    internalLinkSuggestions: ["/guides/import-mailchimp-contacts-to-sendfable", "/migrate/mailchimp"],
    notes: "Shipped with SF-003/004",
  },
  {
    id: "mc-import",
    title: "Import Mailchimp contacts to SendFable",
    targetQuery: "import mailchimp contacts",
    searchIntent: "informational",
    cluster: "mailchimp",
    status: "PUBLISHED",
    factCheckStatus: "passed",
    competitorPricingFresh: true,
    targetPath: "/guides/import-mailchimp-contacts-to-sendfable",
    lastUpdated: "2026-07-29",
    author: "SendFable editorial",
    reviewer: "Owner",
    internalLinkSuggestions: ["/guides/export-contacts-from-mailchimp", "/switch-from-mailchimp"],
    notes: "Shipped with SF-003/004",
  },
];

export type SocialDraft = {
  briefId: string;
  channel: "linkedin" | "facebook" | "x" | "instagram";
  kind: "educational" | "tip" | "comparison" | "promo";
  body: string;
  destination: string;
  utmCampaign: string;
  imageSuggestion: string;
  approvalStatus: "DRAFT" | "APPROVED" | "SCHEDULED" | "PUBLISHED";
};

export type NurtureEmail = {
  day: number;
  subject: string;
  purpose: string;
  trigger: string;
  exitCondition: string;
};

export type NurtureSequence = {
  id: string;
  name: string;
  status: "DRAFT" | "TEST" | "APPROVED" | "ACTIVE" | "HELD";
  consentRequired: boolean;
  frequencyCapPerWeek: number;
  testModeOnly: boolean;
  emails: NurtureEmail[];
};

/** Nurture sequences — DRAFT/TEST only until consent/triggers reviewed. */
export const NURTURE_SEQUENCES: NurtureSequence[] = [
  {
    id: "lead",
    name: "Lead sequence",
    status: "DRAFT",
    consentRequired: true,
    frequencyCapPerWeek: 2,
    testModeOnly: true,
    emails: [
      { day: 0, subject: "Welcome — what SendFable does", purpose: "Product clarity", trigger: "marketing_opt_in", exitCondition: "unsub_or_signup" },
      { day: 2, subject: "Pricing and who it fits", purpose: "Fit filter", trigger: "still_subscribed", exitCondition: "unsub_or_paid" },
      { day: 4, subject: "Mailchimp comparison snapshot", purpose: "Honest compare", trigger: "still_subscribed", exitCondition: "unsub" },
      { day: 6, subject: "Start a permission-based list", purpose: "Consent education", trigger: "still_subscribed", exitCondition: "unsub" },
      { day: 9, subject: "Create a first campaign", purpose: "Activation path", trigger: "still_subscribed", exitCondition: "unsub_or_campaign" },
      { day: 12, subject: "Start free when you are ready", purpose: "CTA", trigger: "still_subscribed", exitCondition: "unsub_or_signup" },
    ],
  },
  {
    id: "free-activation",
    name: "Free user activation",
    status: "DRAFT",
    consentRequired: false,
    frequencyCapPerWeek: 3,
    testModeOnly: true,
    emails: [
      { day: 0, subject: "Complete workspace setup", purpose: "Onboarding", trigger: "workspace_created", exitCondition: "onboarding_done" },
      { day: 1, subject: "Add your mailing address", purpose: "Compliance", trigger: "missing_address", exitCondition: "address_added" },
      { day: 2, subject: "Verify your sender", purpose: "Sender", trigger: "sender_unverified", exitCondition: "sender_verified" },
      { day: 3, subject: "Add or import contacts", purpose: "Audience", trigger: "zero_contacts", exitCondition: "contacts_added" },
      { day: 5, subject: "Choose a template", purpose: "Draft", trigger: "no_campaign", exitCondition: "campaign_created" },
      { day: 7, subject: "Send a test", purpose: "Confidence", trigger: "draft_exists", exitCondition: "test_sent" },
      { day: 9, subject: "Send your first campaign", purpose: "Activation", trigger: "ready_to_send", exitCondition: "first_sent" },
    ],
  },
  {
    id: "inactive",
    name: "Inactive account",
    status: "DRAFT",
    consentRequired: false,
    frequencyCapPerWeek: 1,
    testModeOnly: true,
    emails: [
      { day: 14, subject: "Resume setup", purpose: "Re-engage", trigger: "inactive_14d", exitCondition: "activity" },
      { day: 21, subject: "Import assistance", purpose: "CSV help", trigger: "still_inactive", exitCondition: "import_done" },
      { day: 28, subject: "Template examples", purpose: "Inspiration", trigger: "still_inactive", exitCondition: "campaign_created" },
      { day: 35, subject: "Sender verification help", purpose: "Unblock", trigger: "sender_stuck", exitCondition: "verified" },
      { day: 42, subject: "Support is here", purpose: "Support", trigger: "still_inactive", exitCondition: "support_or_active" },
    ],
  },
  {
    id: "free-to-paid",
    name: "Free-to-paid",
    status: "DRAFT",
    consentRequired: false,
    frequencyCapPerWeek: 1,
    testModeOnly: true,
    emails: [
      { day: 0, subject: "Approaching contact limit", purpose: "Soft upsell", trigger: "contacts_80pct", exitCondition: "upgraded" },
      { day: 3, subject: "Approaching send limit", purpose: "Soft upsell", trigger: "sends_80pct", exitCondition: "upgraded" },
      { day: 7, subject: "Growth features that help", purpose: "Value", trigger: "still_free", exitCondition: "upgraded" },
      { day: 10, subject: "Custom-domain sending", purpose: "Pro value", trigger: "still_free", exitCondition: "upgraded" },
      { day: 14, subject: "Annual billing value", purpose: "Annual", trigger: "still_free", exitCondition: "upgraded" },
    ],
  },
  {
    id: "mailchimp-migration",
    name: "Mailchimp migration",
    status: "DRAFT",
    consentRequired: true,
    frequencyCapPerWeek: 2,
    testModeOnly: true,
    emails: [
      { day: 0, subject: "Export contacts cleanly", purpose: "Export", trigger: "migration_interest", exitCondition: "unsub" },
      { day: 2, subject: "Import safely", purpose: "Import", trigger: "still_subscribed", exitCondition: "imported" },
      { day: 4, subject: "Rebuild or adapt a campaign", purpose: "Campaign", trigger: "still_subscribed", exitCondition: "campaign" },
      { day: 6, subject: "Sender setup", purpose: "Sender", trigger: "still_subscribed", exitCondition: "verified" },
      { day: 8, subject: "Send first campaign", purpose: "Send", trigger: "still_subscribed", exitCondition: "sent" },
      { day: 12, subject: "Compare ongoing cost", purpose: "Retention", trigger: "still_subscribed", exitCondition: "paid" },
    ],
  },
];

export const RELEASE_CADENCE = {
  strongArticlesPerWeek: 2,
  comparisonRefreshPerWeek: 1,
  productUseCasePerWeek: 1,
  majorComparisonReview: "monthly",
} as const;
