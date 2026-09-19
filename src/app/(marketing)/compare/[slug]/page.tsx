import { notFound } from "next/navigation";
import Link from "next/link";
import { ComparePageFromRecord } from "@/components/marketing/compare-page";
import { getCompetitor, listPublicCompetitors } from "@/data/competitors";
import { pairComparisons, TRADEMARK_DISCLAIMER } from "@/data/competitors/pricing-matrix";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd } from "@/components/marketing/json-ld";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { PLANS } from "@/lib/plans";

export function generateStaticParams() {
  const competitors = listPublicCompetitors().map((c) => ({ slug: c.slug }));
  const pairs = pairComparisons().map((p) => ({ slug: p.slug }));
  return [...competitors, ...pairs];
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const pair = pairComparisons().find((p) => p.slug === params.slug);
  if (pair) {
    const year = new Date().getFullYear();
    return marketingPageMeta({
      title: `${pair.title} vs SendFable (${year})`,
      description: `Honest ${pair.title} comparison for small businesses — strengths of each tool, where SendFable fits as a simpler third option.`,
      path: `/compare/${pair.slug}`,
    });
  }
  const c = getCompetitor(params.slug);
  if (!c || !c.publicComparisonEnabled) {
    return { title: "Comparison" };
  }
  const year = new Date().getFullYear();
  return marketingPageMeta({
    title: `SendFable vs ${c.name} (${year})`,
    description: `${c.shortAnswer} Last checked ${c.pricingLastChecked}.`,
    path: `/compare/${c.slug}`,
  });
}

function PairPage({ slug }: { slug: string }) {
  const p = pairComparisons().find((x) => x.slug === slug)!;
  const a = getCompetitor(p.a);
  const b = getCompetitor(p.b);
  if (!a || !b) notFound();
  const path = `/compare/${p.slug}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Compare", path: "/compare" },
          { name: p.title, path },
        ])}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Compare", href: "/compare" },
          { label: p.title, href: path, current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">{p.title}</h1>
      <p className="mt-4 text-lg text-ink/75">
        A practical comparison of {a.name} and {b.name} for small-business email — plus where
        SendFable fits if you want a simpler campaign-first tool.
      </p>
      <h2 className="mt-10 text-xl font-semibold">Quick take</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink/80">
        <li>
          <strong>{a.name}:</strong> {a.shortAnswer}
        </li>
        <li>
          <strong>{b.name}:</strong> {b.shortAnswer}
        </li>
        <li>
          <strong>SendFable:</strong> Published Free–Pro Plus plans (Free {PLANS.FREE.contactCap}{" "}
          contacts / {PLANS.FREE.emailsPerMonth.toLocaleString()} emails/mo; Starter $
          {PLANS.STARTER.monthlyPrice}/mo). Best when you want contacts → campaign → send without a
          CRM maze.
        </li>
      </ul>
      <h2 className="mt-10 text-xl font-semibold">Who each tool is for</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-ink/10 p-4">
          <h3 className="font-semibold">{a.name}</h3>
          <p className="mt-2 text-sm text-ink/70">{a.whoCompetitorIsFor}</p>
        </div>
        <div className="rounded-xl border border-ink/10 p-4">
          <h3 className="font-semibold">{b.name}</h3>
          <p className="mt-2 text-sm text-ink/70">{b.whoCompetitorIsFor}</p>
        </div>
      </div>
      <h2 className="mt-10 text-xl font-semibold">Pricing posture</h2>
      <p className="mt-2 text-sm text-ink/75">
        {a.name} ({a.pricingLastChecked}): {a.paidPlanSummary}{" "}
        <a href={a.pricingUrl} className="underline" rel="nofollow noopener" target="_blank">
          Official
        </a>
      </p>
      <p className="mt-2 text-sm text-ink/75">
        {b.name} ({b.pricingLastChecked}): {b.paidPlanSummary}{" "}
        <a href={b.pricingUrl} className="underline" rel="nofollow noopener" target="_blank">
          Official
        </a>
      </p>
      <ul className="mt-6 list-disc space-y-2 pl-5 text-sm">
        <li>
          <Link className="text-coral hover:underline" href={`/compare/${a.slug}`}>
            SendFable vs {a.name}
          </Link>
        </li>
        <li>
          <Link className="text-coral hover:underline" href={`/compare/${b.slug}`}>
            SendFable vs {b.name}
          </Link>
        </li>
        <li>
          <Link className="text-coral hover:underline" href="/email-marketing-pricing-comparison">
            Master pricing comparison
          </Link>
        </li>
      </ul>
      <p className="mt-8 text-xs text-ink/45">{TRADEMARK_DISCLAIMER}</p>
      <MarketingCta />
    </div>
  );
}

export default function CompareSlugPage({ params }: { params: { slug: string } }) {
  if (pairComparisons().some((p) => p.slug === params.slug)) {
    return <PairPage slug={params.slug} />;
  }
  const c = getCompetitor(params.slug);
  if (!c || !c.publicComparisonEnabled) notFound();
  return <ComparePageFromRecord competitor={c} />;
}
