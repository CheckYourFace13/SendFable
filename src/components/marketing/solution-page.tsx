import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";

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
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Solutions", href: path },
          { label: industry, href: path, current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">{title}</h1>
      <p className="mt-3 text-lg text-ink/65">{intro}</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild className="bg-coral text-white hover:bg-coral-hover">
          <Link href="/early-access">Request early access</Link>
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
