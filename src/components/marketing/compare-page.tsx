import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { JsonLd, faqJsonLd, breadcrumbJsonLd } from "@/components/marketing/json-ld";
import {
  COMPARISON_DISCLAIMER,
  capabilityLabel,
  getCompetitor,
  type CompetitorRecord,
} from "@/data/competitors";
import { SENDFABLE_FACTS } from "@/data/sendfable-facts";
import { PLANS } from "@/lib/plans";
import { MailchimpCostCalculator } from "@/components/marketing/mailchimp-cost-calculator";

function money(n: number | string): string {
  return typeof n === "number" ? `$${n}/mo` : n;
}

export function ComparePageFromRecord({ competitor }: { competitor: CompetitorRecord }) {
  const path = `/compare/${competitor.slug}`;
  const title = `SendFable vs ${competitor.name}`;
  const faqs = [
    ...competitor.faqs,
    {
      q: "See something outdated?",
      a: `Pricing and features change. Tell us via the contact form (/contact) and we will review the ${competitor.name} snapshot (last pricing check ${competitor.pricingLastChecked}).`,
    },
  ];

  const rows: [string, string, string][] = [
    ["Best for", "Small businesses needing simple campaigns", competitor.bestFor[0] ?? competitor.name],
    ["Billing basis", "Contact + monthly email caps", competitor.billingBasis],
    ["Automation", "Campaigns, segments, forms", capabilityLabel(competitor.automation)],
    ["CRM", "Not a CRM suite", capabilityLabel(competitor.crm)],
    ["Ecommerce", "Not ecommerce-specialized", capabilityLabel(competitor.ecommerce)],
    ["SMS", SENDFABLE_FACTS.smsStatus.publiclyAvailable ? "Available" : "Not publicly available yet", capabilityLabel(competitor.sms)],
    ["Creator / newsletter monetization", "Not the focus", capabilityLabel(competitor.newsletterCreator)],
    ["Integrations", "Focused SMB workflow", competitor.integrationsSummary],
    ["Support", "In-app + contact form / email", competitor.supportSummary],
    [
      `~${PLANS.STARTER.contactCap.toLocaleString()} contacts`,
      `$${PLANS.STARTER.monthlyPrice}/mo`,
      competitor.tiers.find((t) => t.contacts === PLANS.STARTER.contactCap)
        ? money(competitor.tiers.find((t) => t.contacts === PLANS.STARTER.contactCap)!.monthlyPrice)
        : "See snapshot below",
    ],
    [
      `~${PLANS.GROWTH.contactCap.toLocaleString()} contacts`,
      `$${PLANS.GROWTH.monthlyPrice}/mo`,
      competitor.tiers.find((t) => t.contacts === PLANS.GROWTH.contactCap)
        ? money(competitor.tiers.find((t) => t.contacts === PLANS.GROWTH.contactCap)!.monthlyPrice)
        : "See snapshot below",
    ],
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Compare", path: "/compare" },
          { name: competitor.name, path },
        ])}
      />
      <JsonLd data={faqJsonLd(faqs)} />

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Compare", href: "/compare" },
          { label: competitor.name, href: path, current: true },
        ]}
      />

      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Honest comparison</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 text-sm text-ink/55">
        Last checked {competitor.pricingLastChecked}. Pricing and features can change.
      </p>

      <section className="mt-6 rounded-xl border border-ink/10 bg-parchment/60 p-5">
        <h2 className="text-lg font-semibold text-ink">Short answer</h2>
        <p className="mt-2 text-ink/80">{competitor.shortAnswer}</p>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild className="bg-coral-solid text-white hover:bg-coral-hover">
          <Link href="/signup">Start writing free</Link>
        </Button>
        <Button asChild variant="outline" className="border-ink/15 text-ink hover:bg-parchment">
          <Link href="/pricing">View pricing</Link>
        </Button>
        <Button asChild variant="outline" className="border-ink/15 text-ink hover:bg-parchment">
          <Link href="/features">See how it works</Link>
        </Button>
      </div>

      <section className="mt-12 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold">Who SendFable is best for</h2>
          <p className="mt-3 text-sm text-slate-700">{competitor.whoSendfableIsFor}</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            {competitor.sendfableStronger.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Who {competitor.name} is best for</h2>
          <p className="mt-3 text-sm text-slate-700">{competitor.whoCompetitorIsFor}</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            {competitor.competitorStronger.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Capability comparison</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-semibold">Topic</th>
                <th className="px-4 py-3 font-semibold text-teal">SendFable</th>
                <th className="px-4 py-3 font-semibold">{competitor.name}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([cap, sf, other]) => (
                <tr key={cap} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{cap}</td>
                  <td className="px-4 py-3">{sf}</td>
                  <td className="px-4 py-3 text-muted-foreground">{other}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold">Pricing comparison</h2>
        <p className="text-sm text-ink/70">
          SendFable published plans: Free $0 · Starter ${PLANS.STARTER.monthlyPrice}/mo · Growth $
          {PLANS.GROWTH.monthlyPrice}/mo · Pro ${PLANS.PRO.monthlyPrice}/mo · Pro Plus $
          {PLANS.PRO_PLUS.monthlyPrice}/mo.{" "}
          <Link className="text-coral underline-offset-2 hover:underline" href="/pricing">
            Full SendFable pricing
          </Link>
          .
        </p>
        <h3 className="font-semibold">{competitor.name} approximate public pricing</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {competitor.tiers.map((t) => (
            <li key={t.name}>
              {t.name}: {money(t.monthlyPrice)}
              {t.notes ? ` — ${t.notes}` : ""}
            </li>
          ))}
        </ul>
        {competitor.pricingFreshnessWarning ? (
          <p className="text-sm text-ink/65">{competitor.pricingFreshnessWarning}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Based on public pricing checked on {competitor.pricingLastChecked}. Sources:{" "}
          {competitor.sources.map((s) => (
            <a key={s} className="underline-offset-2 hover:underline" href={s} rel="noopener noreferrer">
              {s}
            </a>
          ))}
          . {COMPARISON_DISCLAIMER}
        </p>
      </section>

      {competitor.slug === "mailchimp" ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Approximate cost calculator</h2>
          <p className="mt-2 text-sm text-ink/70">
            Estimates use SendFable published plans and approximate Mailchimp Standard snapshots.
            Mailchimp pricing is not fixed — always verify on Mailchimp.
          </p>
          <div className="mt-4">
            <MailchimpCostCalculator />
          </div>
        </section>
      ) : null}

      <section className="mt-12 space-y-6 text-sm text-slate-700">
        <div>
          <h2 className="text-xl font-semibold text-ink">Ease of use</h2>
          <p className="mt-2">
            SendFable may be the better fit when you want fewer product decisions. {competitor.name} may
            be the better fit when you need its deeper {capabilityLabel(competitor.automation).toLowerCase()}{" "}
            automation or suite features.
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-ink">Deliverability approach</h2>
          <p className="mt-2">{competitor.deliverabilityNote}</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-ink">Forms and list growth</h2>
          <p className="mt-2">{competitor.formsNote}</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-ink">Templates and editor</h2>
          <p className="mt-2">{competitor.templatesNote}</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-ink">Analytics</h2>
          <p className="mt-2">{competitor.analyticsNote}</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-ink">Support</h2>
          <p className="mt-2">{competitor.supportSummary}</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-ink">Migration considerations</h2>
          <p className="mt-2">{competitor.migrationNote}</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-ink">Clear winner by use case</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>SendFable may be the better fit when…</strong> {competitor.whoSendfableIsFor}
            </li>
            <li>
              <strong>{competitor.name} may be the better fit when…</strong> {competitor.whoCompetitorIsFor}
            </li>
          </ul>
        </div>
      </section>

      {competitor.relatedSlugs.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Related comparisons</h2>
          <ul className="mt-3 flex flex-wrap gap-3 text-sm">
            {competitor.relatedSlugs.map((slug) => {
              const related = getCompetitor(slug);
              return (
                <li key={slug}>
                  <Link className="text-coral underline-offset-2 hover:underline" href={`/compare/${slug}`}>
                    vs {related?.name ?? slug}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link className="text-coral underline-offset-2 hover:underline" href="/migrate">
                Migration hub
              </Link>
            </li>
          </ul>
        </section>
      ) : null}

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">FAQ</h2>
        <div className="mt-6">
          <Faq items={faqs} />
        </div>
      </section>

      <p className="mt-8 text-sm text-ink/60">
        See something outdated?{" "}
        <Link className="text-coral underline-offset-2 hover:underline" href="/contact">
          Let us know
        </Link>
        .
      </p>

      <MarketingCta
        title="Ready to try the simple path?"
        body={`Create your free account — ${PLANS.FREE.contactCap.toLocaleString()} contacts, no credit card required.`}
        primaryLabel="Start writing free"
        secondaryHref="/migrate"
        secondaryLabel="Migration help"
      />
    </div>
  );
}

/** Legacy adapter used by older static pages during migration. */
export function ComparePage(props: {
  competitorName: string;
  path: string;
  title: string;
  intro: string;
  rows: [string, string, string][];
  pricing: {
    lastChecked: string;
    sources: string[];
    disclaimer: string;
    tiers: { name: string; monthlyPrice: number | string; notes?: string }[];
  };
  strengths: string[];
  tradeoffs: string[];
  faqs: { q: string; a: string }[];
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Compare", href: "/compare" },
          { label: props.competitorName, href: props.path, current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">{props.title}</h1>
      <p className="mt-3 text-lg text-ink/65">{props.intro}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild className="bg-coral-solid text-white hover:bg-coral-hover">
          <Link href="/signup">Start writing free</Link>
        </Button>
        <Button asChild variant="outline" className="border-ink/15 text-ink hover:bg-parchment">
          <Link href="/pricing">SendFable pricing</Link>
        </Button>
      </div>
      <div className="mt-10 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-semibold">Capability</th>
              <th className="px-4 py-3 font-semibold text-teal">SendFable</th>
              <th className="px-4 py-3 font-semibold">{props.competitorName}</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map(([cap, sf, other]) => (
              <tr key={cap} className="border-b last:border-0">
                <td className="px-4 py-3">{cap}</td>
                <td className="px-4 py-3">{sf}</td>
                <td className="px-4 py-3 text-muted-foreground">{other}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="mt-12 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold">Where SendFable fits</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            {props.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Where {props.competitorName} may fit better</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            {props.tradeoffs.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </section>
      <section className="mt-12 space-y-3">
        <h2 className="text-xl font-semibold">{props.competitorName} pricing snapshot</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {props.pricing.tiers.map((t) => (
            <li key={t.name}>
              {t.name}: {typeof t.monthlyPrice === "number" ? `$${t.monthlyPrice}/mo` : t.monthlyPrice}
              {t.notes ? ` — ${t.notes}` : ""}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Last checked {props.pricing.lastChecked}. Sources: {props.pricing.sources.join(", ")}.{" "}
          {props.pricing.disclaimer}
        </p>
      </section>
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">FAQ</h2>
        <div className="mt-6">
          <Faq items={props.faqs} />
        </div>
      </section>
      <MarketingCta secondaryHref="/migrate" secondaryLabel="Migration help" />
    </div>
  );
}

export type CompareRow = [string, string, string];
