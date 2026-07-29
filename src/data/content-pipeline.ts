/**
 * Editorial content pipeline statuses — reviewable workflow, not auto-publish.
 */

export const CONTENT_STATUSES = [
  "IDEA",
  "BRIEF",
  "DRAFT",
  "FACT_CHECK",
  "OWNER_REVIEW",
  "SCHEDULED",
  "PUBLISHED",
  "REFRESH_DUE",
  "ARCHIVED",
] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export type ContentBrief = {
  id: string;
  title: string;
  cluster: "mailchimp" | "smb" | "deliverability" | "templates" | "comparison";
  status: ContentStatus;
  targetPath?: string;
  notes: string;
  updated: string;
};

/** Seed calendar — drafts only until owner approval. */
export const CONTENT_CALENDAR: ContentBrief[] = [
  {
    id: "mc-export",
    title: "Export contacts from Mailchimp",
    cluster: "mailchimp",
    status: "PUBLISHED",
    targetPath: "/guides/export-contacts-from-mailchimp",
    notes: "Shipped with SF-003/004",
    updated: "2026-07-29",
  },
  {
    id: "mc-import",
    title: "Import Mailchimp contacts to SendFable",
    cluster: "mailchimp",
    status: "PUBLISHED",
    targetPath: "/guides/import-mailchimp-contacts-to-sendfable",
    notes: "Shipped with SF-003/004",
    updated: "2026-07-29",
  },
  {
    id: "subject-lines",
    title: "Subject lines for local businesses",
    cluster: "smb",
    status: "IDEA",
    notes: "Needs examples + FAQ; no invented open-rate stats",
    updated: "2026-07-29",
  },
  {
    id: "list-hygiene",
    title: "List hygiene checklist",
    cluster: "deliverability",
    status: "BRIEF",
    notes: "Cover bounce/complaint/unsub; link to suppression features",
    updated: "2026-07-29",
  },
  {
    id: "welcome-template",
    title: "Welcome email template examples",
    cluster: "templates",
    status: "IDEA",
    notes: "Restaurant / retail / nonprofit variants",
    updated: "2026-07-29",
  },
];

export type SocialDraft = {
  briefId: string;
  channel: "linkedin" | "facebook" | "x" | "newsletter";
  body: string;
};

/** Exportable social drafts — not connected to live posting. */
export const SOCIAL_DRAFTS: SocialDraft[] = [
  {
    briefId: "mc-export",
    channel: "linkedin",
    body: "Switching ESPs? Export subscribed contacts only, clean unsubscribes, then import. A short checklist: sendfable.com/guides/export-contacts-from-mailchimp",
  },
  {
    briefId: "mc-export",
    channel: "x",
    body: "Mailchimp → anywhere: export subscribed contacts, remove cleaned/unsub rows, then import. Checklist: sendfable.com/guides/export-contacts-from-mailchimp",
  },
];

export type NurtureSequence = {
  id: string;
  name: string;
  status: "DRAFT" | "APPROVED" | "ACTIVE";
  emails: { day: number; subject: string; purpose: string }[];
};

/** Nurture sequences — DRAFT only until consent/triggers reviewed. */
export const NURTURE_SEQUENCES: NurtureSequence[] = [
  {
    id: "new-lead",
    name: "New lead",
    status: "DRAFT",
    emails: [
      { day: 0, subject: "Welcome to SendFable", purpose: "What we do" },
      { day: 2, subject: "How pricing works", purpose: "Free → paid clarity" },
      { day: 4, subject: "Import your contacts", purpose: "CSV path" },
      { day: 7, subject: "Create your first campaign", purpose: "Template nudge" },
      { day: 10, subject: "Deliverability basics", purpose: "Permission + auth" },
    ],
  },
  {
    id: "new-free-user",
    name: "New free user",
    status: "DRAFT",
    emails: [
      { day: 0, subject: "Finish setup", purpose: "Mailing address + sender" },
      { day: 1, subject: "Verify your sender", purpose: "Sender verification" },
      { day: 3, subject: "Import first contacts", purpose: "Audience" },
      { day: 5, subject: "Pick a template", purpose: "Campaign draft" },
      { day: 8, subject: "Send a test", purpose: "Confidence" },
    ],
  },
  {
    id: "mailchimp-migrator",
    name: "Mailchimp migrator",
    status: "DRAFT",
    emails: [
      { day: 0, subject: "Export guide", purpose: "Clean CSV" },
      { day: 2, subject: "Import guide", purpose: "Mapping" },
      { day: 4, subject: "Pricing comparison", purpose: "Dated snapshot" },
      { day: 6, subject: "Sender setup", purpose: "Verify From" },
      { day: 9, subject: "First campaign", purpose: "Small segment send" },
    ],
  },
];
