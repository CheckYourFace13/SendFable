import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta } from "@/components/marketing/json-ld";
import { SENDFABLE_FACTS } from "@/data/sendfable-facts";

export const metadata = marketingPageMeta({
  title: "Simple email marketing software",
  description:
    "Simple email marketing means contacts, campaigns, forms, and results — without CRM pipelines, ecommerce suites, or creator monetization tooling.",
  path: "/simple-email-marketing-software",
});

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Simple email software", href: "/simple-email-marketing-software", current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
        Simple email marketing software
      </h1>
      <p className="mt-4 text-lg text-ink/75">
        Direct answer: {SENDFABLE_FACTS.positioning} {SENDFABLE_FACTS.supportingMessage}
      </p>
      <h2 className="mt-10 text-xl font-semibold">What “simple” includes</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
        {SENDFABLE_FACTS.coreFeatures.slice(0, 8).map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <h2 className="mt-10 text-xl font-semibold">What we intentionally leave out</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
        {SENDFABLE_FACTS.limitations.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <p className="mt-8 text-sm">
        <Link className="text-coral hover:underline" href="/how-sendfable-works">
          How it works
        </Link>{" "}
        ·{" "}
        <Link className="text-coral hover:underline" href="/email-marketing-without-crm">
          Email without CRM
        </Link>
      </p>
      <MarketingCta />
    </div>
  );
}
