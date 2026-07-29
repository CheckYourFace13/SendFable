import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd } from "@/components/marketing/json-ld";
import { listPublicCompetitors, COMPARISON_DISCLAIMER } from "@/data/competitors";
import { SENDFABLE_FACTS } from "@/data/sendfable-facts";

export const metadata = marketingPageMeta({
  title: "Compare email marketing tools",
  description:
    "Honest SendFable comparisons with Mailchimp, MailerLite, Brevo, ActiveCampaign, HubSpot, and more — with dated pricing snapshots and clear use-case winners.",
  path: "/compare",
});

export default function CompareHubPage() {
  const competitors = listPublicCompetitors().sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Compare", path: "/compare" },
        ])}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Compare", href: "/compare", current: true },
        ]}
      />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Comparisons</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink">
        Compare email marketing tools honestly
      </h1>
      <p className="mt-4 text-lg text-ink/70">
        {SENDFABLE_FACTS.positioning} We say where competitors are stronger — and where SendFable may
        be the better fit.
      </p>
      <p className="mt-3 text-sm text-ink/55">{COMPARISON_DISCLAIMER}</p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {competitors.map((c) => (
          <li key={c.slug} className="rounded-xl border border-ink/10 bg-page p-5">
            <h2 className="font-display text-xl text-ink">
              <Link className="hover:text-coral" href={`/compare/${c.slug}`}>
                SendFable vs {c.name}
              </Link>
            </h2>
            <p className="mt-2 text-sm text-ink/70 line-clamp-3">{c.shortAnswer}</p>
            <p className="mt-3 text-xs text-ink/50">Pricing checked {c.pricingLastChecked}</p>
            <Link
              className="mt-3 inline-flex text-sm font-medium text-coral underline-offset-2 hover:underline"
              href={`/compare/${c.slug}`}
            >
              Read comparison
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold">Also useful</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>
            <Link className="text-coral hover:underline" href="/best-email-marketing-software">
              Best email marketing software by use case
            </Link>
          </li>
          <li>
            <Link className="text-coral hover:underline" href="/mailchimp-alternative">
              Mailchimp alternative for small businesses
            </Link>
          </li>
          <li>
            <Link className="text-coral hover:underline" href="/pricing">
              SendFable pricing
            </Link>
          </li>
          <li>
            <Link className="text-coral hover:underline" href="/migrate">
              Migration help
            </Link>
          </li>
        </ul>
      </section>

      <MarketingCta />
    </div>
  );
}
