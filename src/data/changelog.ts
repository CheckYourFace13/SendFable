export type ChangelogEntry = {
  date: string;
  title: string;
  body: string;
  tags?: string[];
};

/** Honest product changelog — only features that ship in the current product. */
export const CHANGELOG: ChangelogEntry[] = [
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
    body: "Growth and Pro plans can authenticate a custom sending domain with DKIM CNAMEs for aligned From addresses.",
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
    body: "Pro workspaces can invite teammates with seat limits defined by the plan.",
    tags: ["teams"],
  },
];
