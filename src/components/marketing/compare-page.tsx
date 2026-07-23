import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import type { CompetitorPricing } from "@/data/competitor-pricing";

export type CompareRow = [string, string, string];

export function ComparePage({
  competitorName,
  path,
  title,
  intro,
  rows,
  pricing,
  strengths,
  tradeoffs,
  faqs,
}: {
  competitorName: string;
  path: string;
  title: string;
  intro: string;
  rows: CompareRow[];
  pricing: CompetitorPricing;
  strengths: string[];
  tradeoffs: string[];
  faqs: { q: string; a: string }[];
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Compare", href: path },
          { label: competitorName, href: path, current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">{title}</h1>
      <p className="mt-3 text-lg text-ink/65">{intro}</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild className="bg-coral text-white hover:bg-coral-hover">
          <Link href="/early-access">Request early access</Link>
        </Button>
        <Button asChild variant="outline" className="border-ink/15 text-ink hover:bg-parchment">
          <Link href="/pricing">Sendfable pricing</Link>
        </Button>
      </div>

      <div className="mt-10 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-semibold">Capability</th>
              <th className="px-4 py-3 font-semibold text-teal">Sendfable</th>
              <th className="px-4 py-3 font-semibold">{competitorName}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([cap, sf, other]) => (
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
          <h2 className="text-xl font-semibold">Where Sendfable fits</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            {strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Where {competitorName} may fit better</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            {tradeoffs.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-12 space-y-3">
        <h2 className="text-xl font-semibold">{competitorName} pricing snapshot</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {pricing.tiers.map((t) => (
            <li key={t.name}>
              {t.name}:{" "}
              {typeof t.monthlyPrice === "number" ? `$${t.monthlyPrice}/mo` : t.monthlyPrice}
              {t.notes ? ` — ${t.notes}` : ""}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Last checked {pricing.lastChecked}. Sources: {pricing.sources.join(", ")}.{" "}
          {pricing.disclaimer}
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">FAQ</h2>
        <div className="mt-6">
          <Faq items={faqs} />
        </div>
      </section>

      <MarketingCta
        secondaryHref="/migrate"
        secondaryLabel="Migration help"
      />
    </div>
  );
}
