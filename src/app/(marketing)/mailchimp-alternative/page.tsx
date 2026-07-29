import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { MailchimpCostCalculator } from "@/components/marketing/mailchimp-cost-calculator";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/components/marketing/json-ld";
import { getCompetitor } from "@/data/competitors";
import { SENDFABLE_FACTS } from "@/data/sendfable-facts";
import { PLANS } from "@/lib/plans";

export const metadata = marketingPageMeta({
  title: "Mailchimp alternative for small businesses",
  description:
    "Looking for a Mailchimp alternative? SendFable offers simple campaigns, transparent pricing, and managed delivery — and we say where Mailchimp still wins.",
  path: "/mailchimp-alternative",
});

export default function MailchimpAlternativePage() {
  const mc = getCompetitor("mailchimp")!;
  const faqs = [
    {
      q: "Is SendFable a good Mailchimp alternative?",
      a: "Yes for small businesses that mainly need contacts, campaigns, forms, and analytics. No if you need Mailchimp’s broad suite, deep automations, or large integration marketplace.",
    },
    {
      q: "Will I save money vs Mailchimp?",
      a: `Often at practical tiers — for example SendFable Growth is $${PLANS.GROWTH.monthlyPrice}/mo for up to ${PLANS.GROWTH.contactCap.toLocaleString()} contacts — but Mailchimp promotions and overages change. Use the calculator and verify on Mailchimp.`,
    },
    ...mc.faqs,
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Mailchimp alternative", path: "/mailchimp-alternative" },
        ])}
      />
      <JsonLd data={faqJsonLd(faqs)} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Mailchimp alternative", href: "/mailchimp-alternative", current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
        A Mailchimp alternative built for small businesses
      </h1>
      <p className="mt-4 text-lg text-ink/75">
        Direct answer: SendFable may be the better fit when you want {SENDFABLE_FACTS.positioning.toLowerCase()}{" "}
        without buying a broad marketing suite. Mailchimp may be the better fit when you need mature
        automation, ecommerce tools, or agency-standard workflows.
      </p>

      <section className="mt-10 grid gap-6 sm:grid-cols-2 text-sm">
        <div>
          <h2 className="text-lg font-semibold">SendFable advantages</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
            {mc.sendfableStronger.map((s) => (
              <li key={s}>{s}</li>
            ))}
            <li>Any-email signup and sender verification</li>
            <li>From-rewrite for strict DMARC providers with Reply-To preserved</li>
            <li>Send Confidence checks, suppression, and one-click unsubscribe</li>
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Mailchimp advantages</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
            {mc.competitorStronger.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Approximate pricing comparison</h2>
        <p className="mt-2 text-sm text-ink/70">
          Snapshot checked {mc.pricingLastChecked}.{" "}
          <Link className="text-coral hover:underline" href="/compare/mailchimp">
            Full comparison
          </Link>
        </p>
        <div className="mt-4">
          <MailchimpCostCalculator />
        </div>
      </section>

      <ul className="mt-10 list-disc space-y-2 pl-5 text-sm text-slate-700">
        <li>
          <Link className="text-coral hover:underline" href="/mailchimp-pricing-alternative">
            Mailchimp pricing alternative
          </Link>
        </li>
        <li>
          <Link className="text-coral hover:underline" href="/switch-from-mailchimp">
            Switch from Mailchimp
          </Link>
        </li>
        <li>
          <Link className="text-coral hover:underline" href="/guides/export-contacts-from-mailchimp">
            Export contacts from Mailchimp
          </Link>
        </li>
        <li>
          <Link className="text-coral hover:underline" href="/guides/import-mailchimp-contacts-to-sendfable">
            Import Mailchimp contacts into SendFable
          </Link>
        </li>
      </ul>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">FAQ</h2>
        <div className="mt-6">
          <Faq items={faqs} />
        </div>
      </section>
      <MarketingCta />
    </div>
  );
}
