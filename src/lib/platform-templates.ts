import type { EmailDesign } from "@/lib/email-compiler";

export interface PlatformTemplateSeed {
  shareSlug: string;
  name: string;
  category: string;
  industry: string;
  goal: string;
  suggestedSubjects: string[];
  suggestedPreviewText: string;
  recommendedCta: string;
  designJson: EmailDesign;
}

function blockId(prefix: string, n: number): string {
  return `${prefix}-${n}`;
}

/** Simple Mode–compatible design: logo/headline/image/message/button/footer. */
function simpleIndustryDesign(opts: {
  slug: string;
  headline: string;
  messageHtml: string;
  buttonLabel: string;
  buttonHref?: string;
  primaryColor?: string;
}): EmailDesign {
  const color = opts.primaryColor || "#4F46E5";
  const p = opts.slug;
  return {
    version: 1,
    blocks: [
      {
        id: blockId(p, 1),
        type: "image",
        props: { src: "", alt: "Logo", width: 160 },
      },
      {
        id: blockId(p, 2),
        type: "heading",
        props: {
          text: opts.headline,
          level: 1,
          align: "left",
          color: "#111827",
        },
      },
      {
        id: blockId(p, 3),
        type: "image",
        props: { src: "", alt: "Featured image", width: 520 },
      },
      {
        id: blockId(p, 4),
        type: "text",
        props: {
          html: opts.messageHtml,
          align: "left",
        },
      },
      {
        id: blockId(p, 5),
        type: "button",
        props: {
          label: opts.buttonLabel,
          href: opts.buttonHref || "https://",
          backgroundColor: color,
          textColor: "#ffffff",
          align: "center",
        },
      },
      {
        id: blockId(p, 6),
        type: "footer",
        props: { mailingAddress: "" },
      },
    ],
    settings: {
      backgroundColor: "#f8fafc",
      contentWidth: 600,
      fontFamily: "Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
    },
  };
}

/** 12 industry platform templates (isPlatform: true, workspaceId null). */
export const PLATFORM_TEMPLATES: PlatformTemplateSeed[] = [
  {
    shareSlug: "platform-restaurant-special",
    name: "Restaurant special",
    category: "restaurant",
    industry: "restaurant",
    goal: "sale",
    suggestedSubjects: ["Tonight’s special for {{first_name|you}}", "A table’s waiting"],
    suggestedPreviewText: "Chef’s picks this week",
    recommendedCta: "Reserve a table",
    designJson: simpleIndustryDesign({
      slug: "restaurant",
      headline: "This week’s special",
      messageHtml:
        "<p>Hi {{first_name|there}},</p><p>Our chef prepared something you’ll want to taste. Join us before Sunday.</p>",
      buttonLabel: "Reserve a table",
      primaryColor: "#B45309",
    }),
  },
  {
    shareSlug: "platform-brewery-tasting",
    name: "Brewery tasting night",
    category: "brewery",
    industry: "brewery",
    goal: "sale",
    suggestedSubjects: ["Tasting flight this Friday", "New pours on tap"],
    suggestedPreviewText: "Save your spot at the bar",
    recommendedCta: "Get tickets",
    designJson: simpleIndustryDesign({
      slug: "brewery",
      headline: "Tasting night is back",
      messageHtml:
        "<p>Hi {{first_name|friend}},</p><p>Four limited pours, one evening. Bring a friend and taste what’s new.</p>",
      buttonLabel: "Get tickets",
      primaryColor: "#92400E",
    }),
  },
  {
    shareSlug: "platform-retail-sale",
    name: "Retail weekend sale",
    category: "retail",
    industry: "retail",
    goal: "sale",
    suggestedSubjects: ["Weekend sale starts now", "Save before Sunday"],
    suggestedPreviewText: "Member picks + limited stock",
    recommendedCta: "Shop the sale",
    designJson: simpleIndustryDesign({
      slug: "retail",
      headline: "Weekend sale",
      messageHtml:
        "<p>Hi {{first_name|there}},</p><p>Your favorites are marked down through Sunday. Don’t wait on sizes.</p>",
      buttonLabel: "Shop the sale",
      primaryColor: "#0F766E",
    }),
  },
  {
    shareSlug: "platform-realtor-listing",
    name: "Realtor new listing",
    category: "realtor",
    industry: "realtor",
    goal: "news",
    suggestedSubjects: ["Just listed nearby", "A home you should see"],
    suggestedPreviewText: "Photos + open house details",
    recommendedCta: "See the listing",
    designJson: simpleIndustryDesign({
      slug: "realtor",
      headline: "Just listed",
      messageHtml:
        "<p>Hi {{first_name|there}},</p><p>A new home hit the market in your area. Take a look while it’s fresh.</p>",
      buttonLabel: "See the listing",
      primaryColor: "#1D4ED8",
    }),
  },
  {
    shareSlug: "platform-salon-welcome",
    name: "Salon welcome",
    category: "salon",
    industry: "salon",
    goal: "welcome",
    suggestedSubjects: ["Welcome to the chair", "Thanks for joining us"],
    suggestedPreviewText: "How to book + first-visit tips",
    recommendedCta: "Book now",
    designJson: simpleIndustryDesign({
      slug: "salon",
      headline: "Welcome aboard",
      messageHtml:
        "<p>Hi {{first_name|there}},</p><p>Glad you’re here. Book your first visit and tell us what you’re looking for.</p>",
      buttonLabel: "Book now",
      primaryColor: "#BE185D",
    }),
  },
  {
    shareSlug: "platform-cafe-weekly",
    name: "Cafe weekly specials",
    category: "cafe",
    industry: "cafe",
    goal: "announce",
    suggestedSubjects: ["This week at the cafe", "Pastries you’ll want first thing"],
    suggestedPreviewText: "Drinks + bites for the week",
    recommendedCta: "See the menu",
    designJson: simpleIndustryDesign({
      slug: "cafe",
      headline: "What’s brewing this week",
      messageHtml:
        "<p>Hi {{first_name|friend}},</p><p>New drinks and a pastry that won’t last the morning. Swing by when you can.</p>",
      buttonLabel: "See the menu",
      primaryColor: "#78350F",
    }),
  },
  {
    shareSlug: "platform-event-invite",
    name: "Event invitation",
    category: "event",
    industry: "event",
    goal: "sale",
    suggestedSubjects: ["You’re invited", "Save the date"],
    suggestedPreviewText: "Date, place, and RSVP",
    recommendedCta: "RSVP",
    designJson: simpleIndustryDesign({
      slug: "event",
      headline: "You’re invited",
      messageHtml:
        "<p>Hi {{first_name|there}},</p><p>We’d love to see you. Details inside — tap below to RSVP.</p>",
      buttonLabel: "RSVP",
      primaryColor: "#7C3AED",
    }),
  },
  {
    shareSlug: "platform-newsletter",
    name: "Monthly newsletter",
    category: "newsletter",
    industry: "general",
    goal: "news",
    suggestedSubjects: ["What’s new this month", "A quick update for you"],
    suggestedPreviewText: "Stories worth a minute",
    recommendedCta: "Read more",
    designJson: simpleIndustryDesign({
      slug: "newsletter",
      headline: "Your monthly update",
      messageHtml:
        "<p>Hi {{first_name|there}},</p><p>Here’s what we shipped, learned, and loved this month — short and useful.</p>",
      buttonLabel: "Read more",
      primaryColor: "#4F46E5",
    }),
  },
  {
    shareSlug: "platform-holiday-hours",
    name: "Holiday hours",
    category: "holiday-hours",
    industry: "general",
    goal: "news",
    suggestedSubjects: ["Holiday hours update", "When we’re open"],
    suggestedPreviewText: "Plan your visit",
    recommendedCta: "See hours",
    designJson: simpleIndustryDesign({
      slug: "holiday",
      headline: "Holiday hours",
      messageHtml:
        "<p>Hi {{first_name|there}},</p><p>We’re adjusting hours for the holidays. Here’s when you can find us.</p>",
      buttonLabel: "See hours",
      primaryColor: "#047857",
    }),
  },
  {
    shareSlug: "platform-win-back",
    name: "Win-back offer",
    category: "win-back",
    industry: "general",
    goal: "winback",
    suggestedSubjects: ["We miss you", "A little something for your return"],
    suggestedPreviewText: "Come back for a thank-you offer",
    recommendedCta: "Claim offer",
    designJson: simpleIndustryDesign({
      slug: "winback",
      headline: "It’s been a while",
      messageHtml:
        "<p>Hi {{first_name|there}},</p><p>We’ve saved a welcome-back offer for you. Come see what’s new.</p>",
      buttonLabel: "Claim offer",
      primaryColor: "#C2410C",
    }),
  },
  {
    shareSlug: "platform-review-request",
    name: "Review request",
    category: "review-request",
    industry: "general",
    goal: "winback",
    suggestedSubjects: ["How did we do?", "Got 30 seconds?"],
    suggestedPreviewText: "Your feedback helps a lot",
    recommendedCta: "Leave a review",
    designJson: simpleIndustryDesign({
      slug: "review",
      headline: "How was your visit?",
      messageHtml:
        "<p>Hi {{first_name|there}},</p><p>If you have a minute, a short review helps others find us — and helps us improve.</p>",
      buttonLabel: "Leave a review",
      primaryColor: "#CA8A04",
    }),
  },
  {
    shareSlug: "platform-grand-opening",
    name: "Grand opening",
    category: "grand-opening",
    industry: "general",
    goal: "announce",
    suggestedSubjects: ["We’re open", "Come celebrate with us"],
    suggestedPreviewText: "Opening day details inside",
    recommendedCta: "See details",
    designJson: simpleIndustryDesign({
      slug: "grandopen",
      headline: "We’re open",
      messageHtml:
        "<p>Hi {{first_name|friend}},</p><p>The doors are open. Stop by for opening-day specials and say hello.</p>",
      buttonLabel: "See details",
      primaryColor: "#DC2626",
    }),
  },
];
