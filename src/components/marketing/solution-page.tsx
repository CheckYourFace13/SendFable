import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { SOLUTION_RELATED_LINKS } from "@/data/solution-related-links";

export function SolutionPage({
  industry,
  path,
  title,
  intro,
  challenges,
  plays,
  faqs,
}: {
  industry: string;
  path: string;
  title: string;
  intro: string;
  challenges: { title: string; body: string }[];
  plays: string[];
  faqs: { q: string; a: string }[];
}) {
  const related = SOLUTION_RELATED_LINKS[path] ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Solutions", href: "/solutions" },
          { label: industry, href: path, current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">{title}</h1>
      <p className="mt-3 text-lg text-ink/65">{intro}</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild className="bg-coral-solid text-white hover:bg-coral-hover">
          <Link href="/signup">Start writing free</Link>
        </Button>
        <Button asChild variant="outline" className="border-ink/15 text-ink hover:bg-parchment">
          <Link href="/templates">Browse templates</Link>
        </Button>
      </div>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold">Challenges we hear</h2>
        <div className="mt-6 space-y-6">
          {challenges.map((c) => (
            <div key={c.title}>
              <h3 className="font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold">Campaign plays that work</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
          {plays.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      {related.length > 0 && (
        <section className="mt-14 rounded-xl border border-ink/10 bg-parchment/40 p-6">
          <h2 className="text-lg font-semibold text-ink">Related resources</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {related.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-coral hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight">FAQ</h2>
        <div className="mt-6">
          <Faq items={faqs} />
        </div>
      </section>

      <MarketingCta
        title={`Email that fits ${industry.toLowerCase()}`}
        body="Create a free account, import your consented list, and send a campaign this week."
        secondaryHref="/pricing"
        secondaryLabel="See pricing"
      />
    </div>
  );
}
