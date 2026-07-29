import { GuidePage, guideMetadata } from "@/components/marketing/guide-page";
import { PLANS } from "@/lib/plans";

export const metadata = guideMetadata(
  "/guides/mailchimp-vs-sendfable-pricing",
  "Mailchimp vs SendFable pricing",
  "Dated, approximate Mailchimp Standard snapshots compared with SendFable’s published Free–Pro Plus plans."
);

export default function MailchimpVsSendfablePricingGuide() {
  return (
    <GuidePage
      path="/guides/mailchimp-vs-sendfable-pricing"
      title="Mailchimp vs SendFable pricing"
      description="Honest pricing comparison guide."
      updated="2026-07-29"
      lead={`Direct answer: SendFable lists Free $${PLANS.FREE.monthlyPrice}, Starter $${PLANS.STARTER.monthlyPrice}/mo, Growth $${PLANS.GROWTH.monthlyPrice}/mo, Pro $${PLANS.PRO.monthlyPrice}/mo, and Pro Plus $${PLANS.PRO_PLUS.monthlyPrice}/mo. Mailchimp Standard often starts near ~$20/mo at small contact tiers and rises with list size — promotions and overages change, so treat competitor figures as approximate.`}
      sections={[
        {
          heading: "How to compare fairly",
          body: "Match contact count and expected monthly sends. Include whether you need automation, CRM, or ecommerce features you would actually use.\n\nIf you only send campaigns, paying for a suite is optional — not mandatory.",
        },
        {
          heading: "Where Mailchimp pricing can still make sense",
          body: "If you rely on Mailchimp automations, integrations, or agency workflows, the higher list price may be justified. Do not switch solely to “save money” if you lose needed features.",
        },
        {
          heading: "Where SendFable pricing fits",
          body: "Predictable contact and monthly email caps. Annual billing offers two months free. No credit card required to start Free.",
        },
      ]}
      faqs={[
        {
          q: "Is SendFable guaranteed cheaper?",
          a: "No. Many small-business tiers look lower on published prices, but Mailchimp changes plans and promotions. Verify both sites.",
        },
        {
          q: "Where is the calculator?",
          a: "On the Mailchimp comparison and pricing alternative pages.",
        },
      ]}
      related={[
        { href: "/mailchimp-pricing-alternative", label: "Pricing alternative page" },
        { href: "/compare/mailchimp", label: "Full comparison" },
        { href: "/pricing", label: "SendFable pricing" },
      ]}
    />
  );
}
