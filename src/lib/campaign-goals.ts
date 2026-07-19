export type CampaignGoal =
  | "announce"
  | "sale"
  | "winback"
  | "news"
  | "welcome"
  | "scratch";

export interface GoalConfig {
  id: CampaignGoal;
  label: string;
  description: string;
  subjectTips: string[];
  ctaLabels: string[];
  templateCategories: string[];
}

export const CAMPAIGN_GOALS: GoalConfig[] = [
  {
    id: "announce",
    label: "Announce something",
    description: "Share a launch, update, or news your customers should know.",
    subjectTips: ["Something new for you", "We just launched…", "Big news from {{first_name|friend}}'s favorite spot"],
    ctaLabels: ["See what's new", "Learn more", "Check it out"],
    templateCategories: ["grand-opening", "newsletter", "event"],
  },
  {
    id: "sale",
    label: "Promote a sale or event",
    description: "Drive visits with a clear offer, date, and next step.",
    subjectTips: ["This weekend only", "Save before Sunday", "You're invited"],
    ctaLabels: ["Shop the sale", "Get tickets", "Reserve a spot"],
    templateCategories: ["retail", "event", "restaurant", "brewery"],
  },
  {
    id: "winback",
    label: "Bring customers back",
    description: "Re-engage people who haven't visited or opened lately.",
    subjectTips: ["We miss you", "A little something for your return", "It's been a while"],
    ctaLabels: ["Come back", "Claim offer", "Book again"],
    templateCategories: ["win-back", "review-request"],
  },
  {
    id: "news",
    label: "Share news",
    description: "A regular update — hours, menu, listings, or community news.",
    subjectTips: ["What's happening this week", "Your monthly update", "Quick news from us"],
    ctaLabels: ["Read more", "See details", "View update"],
    templateCategories: ["newsletter", "holiday-hours", "realtor"],
  },
  {
    id: "welcome",
    label: "Welcome new subscribers",
    description: "Say hello and set expectations after someone joins your list.",
    subjectTips: ["Welcome aboard", "Thanks for joining", "Here's what to expect"],
    ctaLabels: ["Get started", "Meet us", "See popular picks"],
    templateCategories: ["welcome", "newsletter"],
  },
  {
    id: "scratch",
    label: "Start from scratch",
    description: "Blank canvas — you choose every block and word.",
    subjectTips: ["Your subject here"],
    ctaLabels: ["Learn more"],
    templateCategories: [],
  },
];

export function getGoal(id: string | null | undefined): GoalConfig | undefined {
  return CAMPAIGN_GOALS.find((g) => g.id === id);
}
