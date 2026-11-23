export type ChangelogEntry = {
  date: string;
  title: string;
  body: string;
  tags?: string[];
};

/** Honest product changelog — only features that ship in the current product. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-11-23",
    title: "Activation checklist and migrate handoff",
    body: "New accounts see a live setup checklist. Compare and migrate CTAs can carry a competitor through signup into CSV import presets.",
    tags: ["activation", "migration"],
  },
  {
    date: "2026-11-22",
    title: "Competitor pricing refresh",
    body: "Rechecked public list prices for several ESPs and cleaned leftover internal wording on public pages.",
    tags: ["compare"],
  },
  {
    date: "2026-11-21",
    title: "Official product videos",
    body: "Click-to-load YouTube walkthroughs on overview, Scribe, Free Tools, and pricing pages.",
    tags: ["marketing", "videos"],
  },
  {
    date: "2026-11-21",
    title: "Plan-carrying signup and audience review counts",
    body: "Paid-plan CTAs carry plan and interval through signup and billing checkout. Campaign review uses the same recipient resolver as sending, with clearer reserved-domain explanations.",
    tags: ["signup", "sending"],
  },
  {
    date: "2026-11-15",
    title: "Public Text Messaging",
    body: "Text Messaging is available as a separate add-on with activation, plans, and consent controls alongside email campaigns.",
    tags: ["sms", "billing"],
  },
  {
    date: "2026-11-03",
    title: "Workspace home timezone",
    body: "Scheduling defaults to each workspace’s home timezone instead of a hard-coded region.",
    tags: ["scheduling"],
  },
  {
    date: "2026-10-12",
    title: "Free Tools",
    body: "Public tools for subject lines, risky copy, send-time planning, and email pricing comparison — no account required.",
    tags: ["tools"],
  },
  {
    date: "2026-10-10",
    title: "Scribe",
    body: "Scribe drafts campaigns on an owner-selected schedule with plan-based monthly creation allowances.",
    tags: ["scribe"],
  },
  {
    date: "2026-09-20",
    title: "Send now or schedule",
    body: "Campaign review supports sending immediately or scheduling a send with clearer trust copy.",
    tags: ["sending", "scheduling"],
  },
  {
    date: "2026-09-12",
    title: "Signup Tool demo",
    body: "Prospects can try a website signup before creating an account, then make it live after signup.",
    tags: ["signup"],
  },
  {
    date: "2026-07-25",
    title: "Pro Plus plan",
    body: "Five-plan catalog including Pro Plus for higher contact and send allowances.",
    tags: ["billing"],
  },
  {
    date: "2026-07-18",
    title: "Core ESP launch",
    body: "Campaign builder, CSV import, tags, visual segments, hosted signup forms, Amazon SES delivery, open/click tracking, and Stripe billing for Free through Pro plans.",
    tags: ["launch", "sending", "billing"],
  },
  {
    date: "2026-07-18",
    title: "Any-email authentication",
    body: "Sign up with email and password or magic link. Google and Microsoft OAuth are not required.",
    tags: ["auth"],
  },
  {
    date: "2026-07-18",
    title: "Sender identities & From-rewrite",
    body: "Verify From addresses. Strict-DMARC mailboxes (for example Gmail and Yahoo) use an authenticated platform From with Reply-To preserved so replies still reach you.",
    tags: ["deliverability"],
  },
  {
    date: "2026-07-18",
    title: "Custom domain authentication",
    body: "Growth, Pro, and Pro Plus plans can authenticate a custom sending domain with DKIM CNAMEs for aligned From addresses.",
    tags: ["deliverability", "domains"],
  },
  {
    date: "2026-07-18",
    title: "List protection",
    body: "Purchased lists are prohibited. Campaigns that exceed bounce or complaint thresholds are auto-paused to protect recipients and platform reputation.",
    tags: ["compliance"],
  },
  {
    date: "2026-07-18",
    title: "Team seats on Pro",
    body: "Pro and Pro Plus workspaces can invite teammates with seat limits defined by the plan.",
    tags: ["teams"],
  },
];
