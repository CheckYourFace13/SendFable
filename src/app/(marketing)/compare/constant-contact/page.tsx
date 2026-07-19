import { ComparePage } from "@/components/marketing/compare-page";
import { competitorPricing } from "@/data/competitor-pricing";
import { PLANS } from "@/lib/plans";

export const metadata = {
  title: "Sendfable vs Constant Contact",
  description:
    "Compare Sendfable and Constant Contact for small-business email: pricing snapshots, list tools, and honest trade-offs for event-heavy marketers.",
};

export default function CompareConstantContactPage() {
  return (
    <ComparePage
      competitorName="Constant Contact"
      path="/compare/constant-contact"
      title="Sendfable vs Constant Contact"
      intro="Constant Contact is popular with local businesses and event organizers. Sendfable is a leaner ESP if you want SES-backed sending and simpler plan math — not if you rely on Constant Contact’s event/social bundles."
      rows={[
        ["Primary focus", "Email campaigns & audiences", "Email + events/social tooling"],
        ["Any-email signup", "Yes", "Yes"],
        ["Delivery", "Platform Amazon SES", "Constant Contact delivery"],
        ["Free plan", `${PLANS.FREE.emailsPerMonth.toLocaleString()} emails/mo`, "Trials / limited offers vary"],
        ["Starter-style pricing", `$${PLANS.STARTER.monthlyPrice}/mo`, "List-based plans (see snapshot)"],
        ["Custom domain auth", "Growth+", "Available on paid plans"],
        ["Hosted forms", "Yes", "Yes"],
        ["Purchased lists", "Never", "Prohibited"],
      ]}
      pricing={competitorPricing("constant-contact")}
      strengths={[
        "Straightforward contact + send caps",
        "From-rewrite for consumer mailboxes with strict DMARC",
        "Useful if you mainly need email, not a wider marketing suite",
      ]}
      tradeoffs={[
        "Stronger event marketing and local-business playbooks out of the box",
        "Longer track record with certain nonprofit/SMB segments",
        "Phone support expectations some teams already rely on",
      ]}
      faqs={[
        {
          q: "Can I bring Constant Contact lists over?",
          a: "Yes via CSV export/import. Confirm consent status and suppress unsubscribes before sending.",
        },
        {
          q: "Do you replace Constant Contact events?",
          a: "No. Pair Sendfable email with your existing ticketing or events tool.",
        },
      ]}
    />
  );
}
