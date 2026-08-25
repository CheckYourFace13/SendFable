import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/components/marketing/json-ld";
import { PLANS } from "@/lib/plans";

export const metadata = marketingPageMeta({
  title: "Small business newsletter software",
  description:
    "Newsletter software for small businesses: permission-based lists, simple campaigns, and clear Free plan limits — not an enterprise marketing suite.",
  path: "/small-business-newsletter-software",
});

const FAQS = [
  {
    q: "What makes newsletter software “small business” ready?",
    a: "You can verify a real From address, import a CSV, send without a marketing team, and understand the price. SendFable is built around that.",
  },
  {
    q: "Can restaurants and shops use this?",
    a: "Yes. See industry plays for restaurants, retail, salons, contractors, and more under /solutions.",
  },
  {
    q: "Is there a free plan?",
    a: `Yes — ${PLANS.FREE.contactCap.toLocaleString()} contacts and ${PLANS.FREE.emailsPerMonth.toLocaleString()} emails/month.`,
  },
];

export default function SmallBusinessNewsletterSoftwarePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Small business newsletter software", path: "/small-business-newsletter-software" },
        ])}
      />
      <JsonLd data={faqJsonLd(FAQS)} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          {
            label: "Small business newsletter software",
            href: "/small-business-newsletter-software",
            current: true,
          },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
        Newsletter software for small businesses
      </h1>
      <p className="mt-4 text-lg text-ink/75">
        Direct answer: SendFable is newsletter software for owners and office managers who need to
        email customers this week — specials, updates, events — without learning a CRM first.
      </p>

      <section className="mt-10 space-y-4 text-sm text-slate-700">
        <h2 className="text-xl font-semibold text-ink">A realistic weekly workflow</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Keep a permission-based list (forms or CSV of people who opted in).</li>
          <li>Write one clear email with one main action.</li>
          <li>Preview on phone, run Send Confidence, send or schedule.</li>
          <li>Glance at opens/clicks; write the next note when you have news.</li>
        </ol>
        <p>
          That is enough for most shops. If you need multi-branch journeys and a huge integration
          marketplace, look at larger suites — we say so on our{" "}
          <Link className="text-coral hover:underline" href="/compare">
            compare pages
          </Link>
          .
        </p>
        <h2 className="text-xl font-semibold text-ink">Start free</h2>
        <p>
          Free covers {PLANS.FREE.contactCap.toLocaleString()} contacts. Starter is $
          {PLANS.STARTER.monthlyPrice}/mo when you grow. No credit card to start.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">FAQ</h2>
        <div className="mt-6">
          <Faq items={FAQS} />
        </div>
      </section>
      <MarketingCta secondaryHref="/solutions" secondaryLabel="Browse by industry" />
    </div>
  );
}
