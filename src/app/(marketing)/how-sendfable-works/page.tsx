import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import {
  marketingPageMeta,
  JsonLd,
  breadcrumbJsonLd,
  howToJsonLd,
  faqJsonLd,
} from "@/components/marketing/json-ld";
import { SENDFABLE_FACTS } from "@/data/sendfable-facts";

const STEPS = [
  {
    name: "Create your free account",
    text: "Sign up with any email. No credit card required. Start with up to 500 contacts.",
  },
  {
    name: "Add your business details",
    text: "Set your workspace name and physical mailing address required for compliant footers.",
  },
  {
    name: "Verify a sender",
    text: "Confirm the From address you will use. SendFable helps with everyday mailbox providers.",
  },
  {
    name: "Import or collect contacts",
    text: "Import a consented CSV or publish a hosted signup form. Purchased lists are not allowed.",
  },
  {
    name: "Create and send a campaign",
    text: "Pick a template or build with blocks, preview on desktop/mobile, run Send Confidence, then send or schedule.",
  },
  {
    name: "Review results",
    text: "Track deliveries, opens, clicks, bounces, and complaints. Suppressions update automatically.",
  },
];

export const metadata = marketingPageMeta({
  title: "How SendFable works",
  description:
    "A clear walkthrough of SendFable: free signup, sender verification, contacts, campaigns, managed delivery, and analytics.",
  path: "/how-sendfable-works",
});

export default function HowSendfableWorksPage() {
  const faqs = SENDFABLE_FACTS.faqs.filter((f) =>
    /import|sender|Gmail|cost|free|SMS/i.test(f.q)
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "How SendFable works", path: "/how-sendfable-works" },
        ])}
      />
      <JsonLd
        data={howToJsonLd({
          name: "How to start with SendFable",
          description: "Step-by-step path from signup to first campaign.",
          path: "/how-sendfable-works",
          steps: STEPS,
        })}
      />
      <JsonLd data={faqJsonLd(faqs)} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "How it works", href: "/how-sendfable-works", current: true },
        ]}
      />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Product</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink">
        How SendFable works
      </h1>
      <p className="mt-4 text-lg text-ink/75">
        Direct answer: create a free account, verify a sender, add consented contacts, build a
        campaign, and send through managed delivery infrastructure — then review useful results.
      </p>
      <p className="mt-2 text-sm text-ink/55">Last updated {SENDFABLE_FACTS.lastUpdated}.</p>

      <ol className="mt-10 space-y-8">
        {STEPS.map((step, i) => (
          <li key={step.name} className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-page">
              {i + 1}
            </span>
            <div>
              <h2 className="text-xl font-semibold text-ink">{step.name}</h2>
              <p className="mt-2 text-sm text-slate-700">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-10 text-sm text-slate-700">
        See also{" "}
        <Link className="text-coral hover:underline" href="/features">
          features
        </Link>
        ,{" "}
        <Link className="text-coral hover:underline" href="/deliverability">
          deliverability
        </Link>
        , and{" "}
        <Link className="text-coral hover:underline" href="/pricing">
          pricing
        </Link>
        .
      </p>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">FAQ</h2>
        <div className="mt-6">
          <Faq items={faqs} />
        </div>
      </section>
      <MarketingCta primaryLabel="Start writing free" />
    </div>
  );
}
