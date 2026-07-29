import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/components/marketing/json-ld";

function IndustryMailchimpAlt({
  path,
  title,
  audience,
  examples,
  faqs,
}: {
  path: string;
  title: string;
  audience: string;
  examples: string[];
  faqs: { q: string; a: string }[];
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: title, path }])} />
      <JsonLd data={faqJsonLd(faqs)} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: title, href: path, current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">{title}</h1>
      <p className="mt-4 text-lg text-ink/75">{audience}</p>
      <h2 className="mt-10 text-xl font-semibold">Campaign examples that fit</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
        {examples.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-slate-700">
        Mailchimp may still be better if you need deep automations or a large integration marketplace.{" "}
        <Link className="text-coral hover:underline" href="/compare/mailchimp">
          See the honest comparison
        </Link>
        .
      </p>
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

export const metadata = marketingPageMeta({
  title: "Mailchimp alternative for restaurants",
  description:
    "A simpler Mailchimp alternative for restaurants: weekly specials, event nights, catering updates, and permission-based lists.",
  path: "/mailchimp-alternative-for-restaurants",
});

export default function Page() {
  return (
    <IndustryMailchimpAlt
      path="/mailchimp-alternative-for-restaurants"
      title="Mailchimp alternative for restaurants"
      audience="Direct answer: SendFable may be the better fit for restaurants that need weekly specials, holiday hours, and event emails without a marketing suite. Mailchimp may fit better if you already rely on its automations or agency templates."
      examples={[
        "Tuesday prix-fixe announcement with a clear reservation CTA",
        "Sold-out night waitlist follow-up to consented guests",
        "Catering menu refresh for local offices that opted in",
        "Holiday hours and closure notice with one primary link",
      ]}
      faqs={[
        {
          q: "Do restaurants need ecommerce email tools?",
          a: "Only if you run a meaningful online ordering/automation stack. Many restaurants mainly need announcement and promo campaigns.",
        },
        {
          q: "Related industry page?",
          a: "See /solutions/restaurants for restaurant-specific plays.",
        },
      ]}
    />
  );
}
