import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/components/marketing/json-ld";
import { PLANS } from "@/lib/plans";

export const metadata = marketingPageMeta({
  title: "Email newsletter software for small businesses",
  description:
    "SendFable is email newsletter software for small businesses: contacts, templates, campaigns, and managed delivery — free to start, no credit card.",
  path: "/email-newsletter-software",
});

const FAQS = [
  {
    q: "What is email newsletter software?",
    a: "Software that stores permission-based subscribers, helps you design and send newsletters or promotions, tracks opens/clicks, and handles unsubscribes. SendFable is built for that workflow without a heavy CRM.",
  },
  {
    q: "Is SendFable free newsletter software?",
    a: `The Free plan includes up to ${PLANS.FREE.contactCap.toLocaleString()} contacts and ${PLANS.FREE.emailsPerMonth.toLocaleString()} emails per month. Paid plans start at $${PLANS.STARTER.monthlyPrice}/mo.`,
  },
  {
    q: "Do I need a custom domain?",
    a: "Not to start. Verify a From address (Gmail/Outlook OK). Custom domain authentication is available on Growth and above.",
  },
];

export default function EmailNewsletterSoftwarePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Email newsletter software", path: "/email-newsletter-software" },
        ])}
      />
      <JsonLd data={faqJsonLd(FAQS)} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Email newsletter software", href: "/email-newsletter-software", current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
        Email newsletter software that stays out of the way
      </h1>
      <p className="mt-4 text-lg text-ink/75">
        Direct answer: SendFable is email newsletter software for small businesses — import people who
        opted in, write a clear message, send through managed delivery, and see what worked.
      </p>

      <section className="mt-10 space-y-4 text-sm text-slate-700">
        <h2 className="text-xl font-semibold text-ink">What you need (and what you do not)</h2>
        <p>
          Most local businesses need: a clean list, a verified From address, a readable template, an
          unsubscribe link, and a physical mailing address in the footer. They do not need a sales
          pipeline, ad network, or twenty unused “journeys.”
        </p>
        <p>
          SendFable keeps the path short: contacts → campaign → Send Confidence → send → results.
          Browse{" "}
          <Link className="text-coral hover:underline" href="/templates">
            templates
          </Link>{" "}
          or start from a blank page.
        </p>
        <h2 className="text-xl font-semibold text-ink">Pricing you can explain</h2>
        <p>
          Free: {PLANS.FREE.contactCap.toLocaleString()} contacts / {PLANS.FREE.emailsPerMonth.toLocaleString()}{" "}
          emails/month. Starter: ${PLANS.STARTER.monthlyPrice}/mo. Growth and above add custom domain
          authentication. See{" "}
          <Link className="text-coral hover:underline" href="/pricing">
            pricing
          </Link>
          .
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">FAQ</h2>
        <div className="mt-6">
          <Faq items={FAQS} />
        </div>
      </section>
      <MarketingCta />
    </div>
  );
}
