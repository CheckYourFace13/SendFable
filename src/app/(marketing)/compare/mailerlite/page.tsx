import { ComparePage } from "@/components/marketing/compare-page";
import { competitorPricing } from "@/data/competitor-pricing";
import { PLANS } from "@/lib/plans";

export const metadata = {
  title: "Sendfable vs MailerLite",
  description:
    "Compare Sendfable and MailerLite for creators and small businesses — pricing snapshots, free tiers, and feature trade-offs.",
};

export default function CompareMailerLitePage() {
  return (
    <ComparePage
      competitorName="MailerLite"
      path="/compare/mailerlite"
      title="Sendfable vs MailerLite"
      intro="MailerLite is a friendly ESP for creators and small brands. Sendfable overlaps on campaigns and forms, with SES platform delivery and any-email auth — choose based on pricing at your list size and which workflow you already like."
      rows={[
        ["Free tier contacts", String(PLANS.FREE.contactCap), "Up to ~1,000 (verify current)"],
        ["Free tier emails", String(PLANS.FREE.emailsPerMonth), "Send limits on free"],
        ["Paid ~2.5k contacts", `$${PLANS.STARTER.monthlyPrice}/mo`, "~$25/mo Growing Business (est.)"],
        ["Website / landing builders", "Not the focus", "Site/landing features available"],
        ["Any-email signup", "Yes", "Yes"],
        ["Delivery", "Platform Amazon SES", "MailerLite delivery"],
        ["Automation depth", "Campaign-centric today", "Automation workflows"],
      ]}
      pricing={competitorPricing("mailerlite")}
      strengths={[
        "Competitive Starter pricing for smaller lists",
        "Explicit deliverability story for Gmail/Yahoo From addresses",
        "Simple path if you mainly import CSV and send campaigns",
      ]}
      tradeoffs={[
        "Landing page / website builder extras",
        "Established automation UI some creators already know",
        "E‑commerce integrations that may be further along",
      ]}
      faqs={[
        {
          q: "Should I switch if I am happy on MailerLite?",
          a: "Probably not. Switch when price, auth requirements, or deliverability constraints push you to evaluate alternatives.",
        },
        {
          q: "Can I import from MailerLite?",
          a: "Yes — export subscribers to CSV and map fields in Sendfable.",
        },
      ]}
    />
  );
}
