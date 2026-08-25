import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta, JsonLd, faqJsonLd, breadcrumbJsonLd, organizationJsonLd } from "@/components/marketing/json-ld";
import { SENDFABLE_FACTS } from "@/data/sendfable-facts";

export const metadata = marketingPageMeta({
  title: "About SendFable",
  description:
    "SendFable is simple, affordable email marketing for small businesses — contacts, campaigns, forms, and managed delivery without a giant CRM suite.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />
      <JsonLd data={faqJsonLd(SENDFABLE_FACTS.faqs.slice(0, 4))} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "About", href: "/about", current: true },
        ]}
      />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">About</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink">What is SendFable?</h1>
      <p className="mt-4 text-lg text-ink/75">
        <strong>{SENDFABLE_FACTS.positioning}</strong> {SENDFABLE_FACTS.supportingMessage}
      </p>
      <p className="mt-4 text-sm text-ink/55">Last updated {SENDFABLE_FACTS.lastUpdated}.</p>

      <section className="mt-10 space-y-4 text-sm text-slate-700">
        <h2 className="text-xl font-semibold text-ink">Who it is for</h2>
        <p>
          Local shops, restaurants, breweries, contractors, nonprofits, real-estate teams, and other
          small businesses that need permission-based email without buying an enterprise marketing suite.
        </p>
        <h2 className="text-xl font-semibold text-ink">Why it exists</h2>
        <p>
          SendFable is built by iScream Studio INC because too many small teams were paying for tools
          they barely used — or fighting interfaces meant for marketing departments. We kept the product
          narrow on purpose: contacts, campaigns, forms, managed delivery, and clear limits.
        </p>
        <h2 className="text-xl font-semibold text-ink">Who it is not for</h2>
        <ul className="list-disc space-y-2 pl-5">
          {SENDFABLE_FACTS.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <h2 className="text-xl font-semibold text-ink">How delivery works</h2>
        <p>
          Campaigns send through {SENDFABLE_FACTS.delivery.customerFacingLabel}. You verify senders,
          SendFable handles infrastructure, and bounce/complaint events update suppressions.
        </p>
        <h2 className="text-xl font-semibold text-ink">SMS status</h2>
        <p>{SENDFABLE_FACTS.smsStatus.publicAnswer}</p>
        <h2 className="text-xl font-semibold text-ink">Company</h2>
        <p>{SENDFABLE_FACTS.legalOperator}</p>
        <p>
          Support:{" "}
          <Link className="text-coral hover:underline" href="/contact">
            Contact
          </Link>{" "}
          or {SENDFABLE_FACTS.support.email}
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">FAQ</h2>
        <div className="mt-6">
          <Faq items={[...SENDFABLE_FACTS.faqs]} />
        </div>
      </section>
      <MarketingCta />
    </div>
  );
}
