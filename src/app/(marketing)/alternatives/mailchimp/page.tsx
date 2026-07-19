import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { competitorPricing, PRICING_LAST_CHECKED } from "@/data/competitor-pricing";
import { PLANS } from "@/lib/plans";

export const metadata = {
  title: "Mailchimp alternative for simple sending",
  description:
    "Looking for a Mailchimp alternative? Sendfable offers lower typical pricing, any-email signup, and SES delivery — with an honest comparison of trade-offs.",
};

const mc = competitorPricing("mailchimp");

const FAQS = [
  {
    q: "Is Sendfable a full Mailchimp replacement?",
    a: "For campaigns, lists, forms, and analytics — often yes for small teams. Mailchimp still has a larger ecosystem of CRM-style and marketplace features we do not claim to match.",
  },
  {
    q: "Will my Mailchimp automations import?",
    a: "Contact CSV migration is the supported path. Rebuild automations as campaigns or simple follow-ups rather than expecting a perfect automation import.",
  },
  {
    q: "Who should stay on Mailchimp?",
    a: "Teams deep in Mailchimp’s advanced journeys, e‑commerce integrations, or agency workflows that already fit may not need to move.",
  },
];

export default function MailchimpAlternativePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Alternatives", href: "/alternatives/mailchimp" },
          { label: "Mailchimp", href: "/alternatives/mailchimp", current: true },
        ]}
      />
      <h1 className="text-4xl font-bold tracking-tight">Mailchimp alternative</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Mailchimp is a capable, mature ESP. Sendfable is a focused alternative if you want lower
        typical monthly cost, signup with any email, and clear handling of Gmail/Yahoo From
        addresses — not if you need Mailchimp&apos;s entire ecosystem.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/signup">Try Sendfable free</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/compare/mailchimp">Full comparison</Link>
        </Button>
      </div>

      <section className="mt-12 space-y-3 text-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900">When Sendfable is a good fit</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>You send newsletters and promotions to a consented list under ~30k contacts</li>
          <li>You want Starter at ${PLANS.STARTER.monthlyPrice}/mo instead of Mailchimp Standard rates near ${mc.tiers.find((t) => t.contacts === 2_500)?.monthlyPrice}/mo at ~2.5k contacts (as of {PRICING_LAST_CHECKED})</li>
          <li>You refuse to require Google login for your team</li>
          <li>You are fine rebuilding automations instead of importing complex journeys</li>
        </ul>
      </section>

      <section className="mt-12 space-y-3 text-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900">Trade-offs to expect</h2>
        <p>
          Mailchimp offers broader integrations and longer-established brand recognition. Sendfable
          prioritizes core sending, CSV/forms, SES delivery, and transparent plan limits. Pricing
          snapshots and sources: {mc.sources.join(", ")}. {mc.disclaimer}
        </p>
        <p className="text-sm">
          Also see{" "}
          <Link href="/vs/mailchimp" className="text-teal hover:underline">
            Sendfable vs Mailchimp
          </Link>{" "}
          and{" "}
          <Link href="/migrate" className="text-teal hover:underline">
            how to migrate
          </Link>
          .
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">FAQ</h2>
        <div className="mt-6">
          <Faq items={FAQS} />
        </div>
      </section>

      <MarketingCta />
    </div>
  );
}
