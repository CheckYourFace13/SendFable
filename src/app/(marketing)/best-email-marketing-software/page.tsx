import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd } from "@/components/marketing/json-ld";
import { SENDFABLE_FACTS } from "@/data/sendfable-facts";

export const metadata = marketingPageMeta({
  title: "Best email marketing software by use case",
  description:
    "Honest picks by use case: simple small-business email, advanced automation, ecommerce, CRM suites, creators, and volume sending — without forcing SendFable to win every category.",
  path: "/best-email-marketing-software",
});

const PICKS = [
  {
    title: "Best simple option for small businesses",
    pick: "SendFable",
    why: "When you need contacts, campaigns, forms, and managed delivery without a CRM/ecommerce suite.",
    href: "/signup",
  },
  {
    title: "Best advanced automation",
    pick: "ActiveCampaign",
    why: "Deep journeys and CRM-style automation when complexity is intentional.",
    href: "/compare/activecampaign",
  },
  {
    title: "Best ecommerce email",
    pick: "Omnisend (or Klaviyo for larger stores)",
    why: "Product sync, cart flows, and store-centric automation beat a general SMB tool.",
    href: "/compare/omnisend",
  },
  {
    title: "Best CRM marketing suite",
    pick: "HubSpot or EngageBay",
    why: "When CRM is the center of the business, not just the email channel.",
    href: "/compare/hubspot",
  },
  {
    title: "Best creator / newsletter platform",
    pick: "beehiiv or Kit",
    why: "Built for audience growth and creator monetization — not local promo calendars.",
    href: "/compare/beehiiv",
  },
  {
    title: "Best lower-cost established ESP",
    pick: "MailerLite or EmailOctopus",
    why: "Mature affordable tools when you want an established alternative to suite pricing.",
    href: "/compare/mailerlite",
  },
  {
    title: "Best volume-based option",
    pick: "Brevo",
    why: "When emails/month — not contacts — is the main cost driver.",
    href: "/compare/brevo",
  },
  {
    title: "Best webinars / funnels bundle",
    pick: "GetResponse",
    why: "When webinars and funnel builders are part of the marketing stack.",
    href: "/compare/getresponse",
  },
];

export default function BestEmailMarketingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Best email marketing software", path: "/best-email-marketing-software" },
        ])}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Best software", href: "/best-email-marketing-software", current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
        Best email marketing software by use case
      </h1>
      <p className="mt-4 text-lg text-ink/75">
        Direct answer: there is no single best tool. {SENDFABLE_FACTS.positioning} Other products win
        when you need CRM, ecommerce automation, creators tooling, or webinars.
      </p>
      <p className="mt-2 text-sm text-ink/55">
        Editorial recommendations based on product fit — not paid placements. Last updated{" "}
        {SENDFABLE_FACTS.lastUpdated}.
      </p>

      <ol className="mt-10 space-y-8">
        {PICKS.map((p) => (
          <li key={p.title}>
            <h2 className="text-xl font-semibold text-ink">{p.title}</h2>
            <p className="mt-2 text-sm">
              <strong>{p.pick}</strong> — {p.why}{" "}
              <Link className="text-coral hover:underline" href={p.href}>
                Learn more
              </Link>
            </p>
          </li>
        ))}
      </ol>

      <p className="mt-10 text-sm text-slate-700">
        Related:{" "}
        <Link className="text-coral hover:underline" href="/compare">
          all comparisons
        </Link>
        ,{" "}
        <Link className="text-coral hover:underline" href="/best-email-marketing-for-small-business">
          best for small business
        </Link>
        ,{" "}
        <Link className="text-coral hover:underline" href="/pricing">
          SendFable pricing
        </Link>
        .
      </p>
      <MarketingCta />
    </div>
  );
}
