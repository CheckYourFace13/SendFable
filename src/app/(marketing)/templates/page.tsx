import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { JsonLd, softwareApplicationJsonLd } from "@/components/marketing/json-ld";

export const metadata = {
  title: "Email templates for small businesses",
  description:
    "Browse Sendfable industry email templates for restaurants, retail, nonprofits, and more — then customize in the drag-and-drop builder.",
};

const CATEGORIES = [
  {
    name: "Restaurants & cafés",
    blurb: "Weekly specials, reservation reminders, and event nights without looking like a chain.",
    href: "/solutions/restaurants",
  },
  {
    name: "Breweries & taprooms",
    blurb: "Release notes, tasting events, and membership updates for local regulars.",
    href: "/solutions/breweries",
  },
  {
    name: "Real estate",
    blurb: "Listing alerts, open-house invites, and market notes that stay readable on mobile.",
    href: "/solutions/real-estate",
  },
  {
    name: "Nonprofits",
    blurb: "Appeals, event invites, and impact updates with clear unsubscribe and footer compliance.",
    href: "/solutions/nonprofits",
  },
  {
    name: "Retail & e‑commerce",
    blurb: "Product drops, seasonal promos, and win-back notes with simple product blocks.",
    href: "/solutions/retail",
  },
  {
    name: "Contractors & trades",
    blurb: "Seasonal service reminders, project before/afters, and referral asks.",
    href: "/solutions/contractors",
  },
  {
    name: "Salons & spas",
    blurb: "Booking prompts, membership renewals, and new-service announcements.",
    href: "/solutions/salons",
  },
  {
    name: "Local events",
    blurb: "Lineup reveals, ticket reminders, and day-of logistics for venues and organizers.",
    href: "/solutions/local-events",
  },
  {
    name: "Professional services",
    blurb: "Newsletters, tip series, and client check-ins for advisors and agencies.",
    href: "/solutions/professional-services",
  },
];

export default function TemplatesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <JsonLd data={softwareApplicationJsonLd()} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Templates", href: "/templates", current: true },
        ]}
      />
      <h1 className="text-4xl font-bold tracking-tight">Email template gallery</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        Start from industry-minded layouts, then edit blocks, merge tags, and branding in the
        Sendfable builder. Templates are starting points — not locked designs — so your campaigns
        still sound like you.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/signup">Start free with templates</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/features">See builder features</Link>
        </Button>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((c) => (
          <div key={c.name} className="rounded-2xl border bg-white p-6">
            <h2 className="text-lg font-semibold">{c.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{c.blurb}</p>
            <Link
              href={c.href}
              className="mt-4 inline-block text-sm font-medium text-teal hover:underline"
            >
              Industry guide →
            </Link>
          </div>
        ))}
      </div>

      <section className="mt-16 space-y-4 text-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900">What you get in every template</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          <li>Mobile-friendly block layouts (heading, text, image, button, columns, social)</li>
          <li>Merge tags for first name and other contact fields</li>
          <li>A compliant footer with unsubscribe — required on every send</li>
          <li>HTML that is built for inbox clients, not just a browser preview</li>
        </ul>
        <p className="text-sm text-muted-foreground">
          After signup you can save your own templates from any campaign design and reuse them
          across sends.
        </p>
      </section>

      <MarketingCta
        title="Pick a template after you sign up"
        body="Create a free account, open the builder, and adapt an industry layout to your brand."
      />
    </div>
  );
}
