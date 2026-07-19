import { ComparePage } from "@/components/marketing/compare-page";
import { competitorPricing } from "@/data/competitor-pricing";
import { PLANS } from "@/lib/plans";

export const metadata = {
  title: "Sendfable vs beehiiv",
  description:
    "Compare Sendfable and beehiiv: SMB campaign email versus newsletter-first growth and monetization features.",
};

export default function CompareBeehiivPage() {
  return (
    <ComparePage
      competitorName="beehiiv"
      path="/compare/beehiiv"
      title="Sendfable vs beehiiv"
      intro="beehiiv is newsletter-first with growth and monetization features for publishers. Sendfable is a business ESP for campaigns, audiences, and SES delivery — overlapping on email, different on product philosophy."
      rows={[
        ["Product center of gravity", "SMB campaigns & lists", "Publication / newsletter growth"],
        ["Ad network / monetization", "No", "Available on higher tiers"],
        ["Referral / growth tools", "Not a core loop today", "Built into the product story"],
        ["Free tier", `${PLANS.FREE.emailsPerMonth.toLocaleString()} emails/mo`, "Launch tier with subscriber caps"],
        ["Paid SMB pricing", `From $${PLANS.STARTER.monthlyPrice}/mo`, "Scale tiers from higher price points"],
        ["Audience import", "CSV mapping", "CSV / migrations supported"],
        ["Custom domains", "Growth+", "Available on paid plans"],
      ]}
      pricing={competitorPricing("beehiiv")}
      strengths={[
        "Better fit for restaurants, services, and retail promotions",
        "Plan math tied to contacts and monthly sends",
        "Any-email auth without requiring a “publication” mindset",
      ]}
      tradeoffs={[
        "Newsletter growth toolkit and monetization",
        "Publisher-oriented analytics and web presence",
        "Community features aimed at media brands",
      ]}
      faqs={[
        {
          q: "Can Sendfable run a weekly newsletter?",
          a: "Yes. You write campaigns on a schedule. You will not get beehiiv-style ad network monetization.",
        },
        {
          q: "Which should a local business pick?",
          a: "Usually an SMB ESP like Sendfable. Choose beehiiv if the product is the newsletter itself.",
        },
      ]}
    />
  );
}
