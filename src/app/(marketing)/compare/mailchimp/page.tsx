import { ComparePage } from "@/components/marketing/compare-page";
import { competitorPricing } from "@/data/competitor-pricing";
import { PLANS } from "@/lib/plans";

export const metadata = {
  title: "Sendfable vs Mailchimp comparison",
  description:
    "Honest Sendfable vs Mailchimp comparison: pricing snapshots, any-email signup, SES delivery, and where Mailchimp’s ecosystem still wins.",
};

export default function CompareMailchimpPage() {
  return (
    <ComparePage
      competitorName="Mailchimp"
      path="/compare/mailchimp"
      title="Sendfable vs Mailchimp"
      intro="Mailchimp is a mature all-in-one marketing platform. Sendfable focuses on affordable campaign sending, audience basics, and deliverability for everyday From addresses — without pretending we match every Mailchimp feature."
      rows={[
        ["Any-email signup (no Google/Microsoft required)", "Yes", "Yes (OAuth options emphasized)"],
        ["Delivery infrastructure", "Platform Amazon SES", "Mailchimp delivers"],
        ["From-rewrite for strict DMARC mailboxes", "Automatic", "Usually needs custom domain"],
        ["Free plan emails/mo", String(PLANS.FREE.emailsPerMonth), "Limited free tier"],
        [`~${PLANS.STARTER.contactCap.toLocaleString()} contacts`, `$${PLANS.STARTER.monthlyPrice}/mo`, "~$45/mo Standard (est.)"],
        [`~${PLANS.GROWTH.contactCap.toLocaleString()} contacts`, `$${PLANS.GROWTH.monthlyPrice}/mo`, "~$105/mo Standard (est.)"],
        ["Drag-and-drop builder", "Yes", "Yes"],
        ["Deep e‑commerce / CRM suite", "Not the focus", "Broad feature set"],
        ["Purchased lists", "Never", "Prohibited"],
      ]}
      pricing={competitorPricing("mailchimp")}
      strengths={[
        "Lower typical monthly cost at common contact tiers",
        "Clear Gmail/Yahoo From handling with Reply-To preserved",
        "CSV import, tags, segments, and hosted forms without suite lock-in",
      ]}
      tradeoffs={[
        "Larger integration marketplace and brand templates library",
        "More advanced customer journey / CRM-style tooling",
        "Agencies already standardized on Mailchimp workflows",
      ]}
      faqs={[
        {
          q: "Is this the same as /vs/mailchimp?",
          a: "Yes in spirit — this compare page adds priced snapshots from our dated competitor data and clearer trade-offs. The /vs/mailchimp page remains for a shorter table.",
        },
        {
          q: "Can I migrate from Mailchimp?",
          a: "Export contacts as CSV and import into Sendfable. Rebuild key automations rather than expecting a perfect journey import.",
        },
      ]}
    />
  );
}
