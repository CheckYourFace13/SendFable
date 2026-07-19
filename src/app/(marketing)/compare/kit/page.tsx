import { ComparePage } from "@/components/marketing/compare-page";
import { competitorPricing } from "@/data/competitor-pricing";
import { PLANS } from "@/lib/plans";

export const metadata = {
  title: "Sendfable vs Kit (ConvertKit)",
  description:
    "Sendfable vs Kit (ConvertKit): creator newsletters and automations versus affordable small-business campaign email on SES.",
};

export default function CompareKitPage() {
  return (
    <ComparePage
      competitorName="Kit"
      path="/compare/kit"
      title="Sendfable vs Kit (ConvertKit)"
      intro="Kit (formerly ConvertKit) is built around creator newsletters, tagging, and creator commerce. Sendfable targets operators who want inexpensive campaign email with platform SES — not a creator-network marketplace."
      rows={[
        ["Audience focus", "Local & SMB operators", "Creators & newsletter businesses"],
        ["Free / newsletter tier", `${PLANS.FREE.contactCap.toLocaleString()} contacts`, "Generous creator free tier (limits apply)"],
        ["Creator commerce / recommendations", "No", "Core product emphasis"],
        ["Visual automations", "Limited — campaign-first", "Strong visual automations"],
        ["Any-email signup", "Yes", "Yes"],
        ["Paid entry (approx.)", `$${PLANS.STARTER.monthlyPrice}/mo Starter`, "Creator plans from higher entry prices"],
        ["Delivery", "Platform Amazon SES", "Kit delivery"],
      ]}
      pricing={competitorPricing("kit")}
      strengths={[
        "Lower paid entry for many SMB contact tiers",
        "Campaign builder + CSV/forms without creator-commerce overhead",
        "Clear list-protection thresholds",
      ]}
      tradeoffs={[
        "Creator-centric automations and tagging UX",
        "Newsletter monetization and recommendations",
        "Community/resources aimed at independent creators",
      ]}
      faqs={[
        {
          q: "Is Sendfable for Substack-style writers?",
          a: "You can send newsletters, but Kit/beehiiv-style writer networks are not our focus. We optimize for business campaigns and lists.",
        },
        {
          q: "Can Kit subscribers move over?",
          a: "Export subscribers and import via CSV; recreate forms and sequences as needed.",
        },
      ]}
    />
  );
}
