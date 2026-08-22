import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { JsonLd, breadcrumbJsonLd, faqJsonLd, marketingPageMeta } from "@/components/marketing/json-ld";
import { SOLUTION_RELATED_LINKS } from "@/data/solution-related-links";

export const metadata = marketingPageMeta({
  title: "Email marketing by industry",
  description:
    "SendFable solutions for restaurants, breweries, retail, nonprofits, contractors, salons, events, and professional services — practical email plays, not generic templates.",
  path: "/solutions",
});

const INDUSTRIES = [
  {
    href: "/solutions/restaurants",
    name: "Restaurants & cafés",
    blurb: "Specials, events, and reservation reminders to guests who opted in.",
  },
  {
    href: "/solutions/breweries",
    name: "Breweries & taprooms",
    blurb: "Release alerts, can-club updates, and taproom events without bloated tools.",
  },
  {
    href: "/solutions/retail",
    name: "Retail",
    blurb: "Product drops, seasonal promos, and win-back notes for shops online or in-store.",
  },
  {
    href: "/solutions/nonprofits",
    name: "Nonprofits",
    blurb: "Donor updates, volunteer calls, and campaign progress with clear limits.",
  },
  {
    href: "/solutions/real-estate",
    name: "Real estate",
    blurb: "Listing alerts, open-house reminders, and nurture notes for your sphere.",
  },
  {
    href: "/solutions/contractors",
    name: "Contractors & trades",
    blurb: "Seasonal maintenance reminders and referral asks between jobs.",
  },
  {
    href: "/solutions/salons",
    name: "Salons & spas",
    blurb: "Appointment promos, stylist spotlights, and rebooking nudges.",
  },
  {
    href: "/solutions/local-events",
    name: "Local events",
    blurb: "Ticket pushes, schedule changes, and volunteer coordination.",
  },
  {
    href: "/solutions/professional-services",
    name: "Professional services",
    blurb: "Client newsletters and seasonal check-ins without CRM overhead.",
  },
] as const;

const FAQS = [
  {
    q: "Do I need a different SendFable plan per industry?",
    a: "No. Plans are based on contacts and monthly email volume. Industry pages describe campaign ideas — not separate products.",
  },
  {
    q: "Is SMS included for any industry?",
    a: "No. Email is the live product today. SMS is not publicly available.",
  },
  {
    q: "Can I start on the Free plan?",
    a: "Yes. Free includes 500 contacts and 1,000 emails per month with a small SendFable footer badge on sent mail.",
  },
];

export default function SolutionsHubPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Solutions", path: "/solutions" },
        ])}
      />
      <JsonLd data={faqJsonLd(FAQS)} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Solutions", href: "/solutions", current: true },
        ]}
      />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Solutions</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink">
        Email marketing by industry
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-ink/70">
        SendFable is one product — contacts, campaigns, and managed delivery. These pages collect
        practical plays for how different small businesses actually use email.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild className="bg-coral-solid text-white hover:bg-coral-hover">
          <Link href="/signup">Start writing free</Link>
        </Button>
        <Button asChild variant="outline" className="border-ink/15 text-ink hover:bg-parchment">
          <Link href="/templates">Browse templates</Link>
        </Button>
      </div>

      <ul className="mt-14 grid gap-6 sm:grid-cols-2">
        {INDUSTRIES.map((item) => (
          <li key={item.href} className="rounded-xl border border-ink/10 bg-white p-5">
            <Link href={item.href} className="group block">
              <h2 className="font-semibold text-ink group-hover:text-coral">{item.name}</h2>
              <p className="mt-2 text-sm text-ink/65">{item.blurb}</p>
              <span className="mt-3 inline-block text-sm font-medium text-coral">View plays →</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-16">
        <h2 className="text-2xl font-bold">FAQ</h2>
        <div className="mt-6">
          <Faq items={FAQS} />
        </div>
      </section>

      <MarketingCta
        title="Pick an industry, send this week"
        body="Import a consented list, choose a template, and mail your next update."
        secondaryHref="/compare/mailchimp"
        secondaryLabel="Compare Mailchimp"
      />
    </div>
  );
}
