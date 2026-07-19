import { ComparePage } from "@/components/marketing/compare-page";
import { competitorPricing } from "@/data/competitor-pricing";
import { PLANS } from "@/lib/plans";

export const metadata = {
  title: "Sendfable vs Brevo",
  description:
    "Sendfable vs Brevo: contact-based vs send-based pricing, transactional breadth, and when a focused campaign ESP is enough.",
};

export default function CompareBrevoPage() {
  return (
    <ComparePage
      competitorName="Brevo"
      path="/compare/brevo"
      title="Sendfable vs Brevo"
      intro="Brevo (formerly Sendinblue) often prices by emails sent and bundles SMS/CRM-style features. Sendfable prices primarily by plan contact caps and monthly email allotments — clearer for some teams, less ideal if you need Brevo’s multi-channel suite."
      rows={[
        ["Pricing model", "Plan contact + monthly email caps", "Often send-volume based"],
        ["SMS / multi-channel", "Email-focused", "Email + SMS and more"],
        ["Any-email signup", "Yes", "Yes"],
        ["Free tier", `${PLANS.FREE.emailsPerMonth.toLocaleString()} emails/mo`, "Daily send caps; contacts often flexible"],
        ["Campaign builder", "Drag-and-drop blocks", "Yes"],
        ["Transactional email product", "Not a separate product focus", "Strong transactional offering"],
        ["List protection", "Auto-pause on bounce/complaint thresholds", "Account monitoring tools"],
      ]}
      pricing={competitorPricing("brevo")}
      strengths={[
        "Predictable contact-tier plans for newsletter-style sending",
        "Platform SES with explicit From-rewrite behavior",
        "Less surface area if you only need marketing email",
      ]}
      tradeoffs={[
        "Send-based pricing can be cheaper for huge lists that send rarely",
        "SMS, chat, and CRM modules in one vendor",
        "Broader transactional email positioning",
      ]}
      faqs={[
        {
          q: "Is Brevo always more expensive?",
          a: "No. Depending on send volume vs contact count, Brevo can be cheaper or pricier. Compare your actual monthly sends to our plan allotments.",
        },
        {
          q: "Do you offer SMS?",
          a: "Not today. Sendfable is email-first.",
        },
      ]}
    />
  );
}
