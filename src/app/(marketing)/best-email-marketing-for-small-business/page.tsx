import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/components/marketing/json-ld";
import { SENDFABLE_FACTS } from "@/data/sendfable-facts";
import { PLANS } from "@/lib/plans";

function SimpleIntentPage({
  path,
  title,
  description,
  lead,
  points,
  faqs,
  links,
}: {
  path: string;
  title: string;
  description: string;
  lead: string;
  points: string[];
  faqs: { q: string; a: string }[];
  links: { href: string; label: string }[];
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
      <p className="mt-4 text-lg text-ink/75">{lead}</p>
      <ul className="mt-8 list-disc space-y-2 pl-5 text-sm text-slate-700">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <ul className="mt-8 list-disc space-y-2 pl-5 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link className="text-coral hover:underline" href={l.href}>
              {l.label}
            </Link>
          </li>
        ))}
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

export const metadata = marketingPageMeta({
  title: "Best email marketing for small business",
  description:
    "What “best” means for small businesses: clear pricing, permission-based lists, simple campaigns, and managed delivery — not the biggest suite.",
  path: "/best-email-marketing-for-small-business",
});

export default function Page() {
  return (
    <SimpleIntentPage
      path="/best-email-marketing-for-small-business"
      title="Best email marketing for small business"
      description=""
      lead={`Direct answer: the best small-business email tool is the one you will actually use. ${SENDFABLE_FACTS.positioning} Free starts at $${PLANS.FREE.monthlyPrice} with ${PLANS.FREE.contactCap} contacts.`}
      points={[
        "Prefer tools with transparent contact and send limits",
        "Require permission-based signup — never purchased lists",
        "Look for sender verification and unsubscribe handling",
        "Skip CRM/ecommerce suites unless you need them",
      ]}
      faqs={[
        {
          q: "Is SendFable the best for every small business?",
          a: "No. If you need deep automation, ecommerce journeys, or CRM, pick tools built for those jobs.",
        },
      ]}
      links={[
        { href: "/best-email-marketing-software", label: "Best by use case" },
        { href: "/pricing", label: "Pricing" },
        { href: "/compare", label: "Comparisons" },
      ]}
    />
  );
}
