import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";

export const metadata = {
  title: "Integrations",
  description:
    "Sendfable integrates Amazon SES for delivery, Stripe for billing, CSV for audiences, and hosted forms for signup — without a bloated app marketplace.",
};

const INTEGRATIONS = [
  {
    name: "Amazon SES",
    role: "Delivery",
    body: "Campaigns send through Sendfable’s platform SES infrastructure. You do not paste your own SMTP keys — we operate sending, reputation ramp, and event handling.",
  },
  {
    name: "Stripe",
    role: "Billing",
    body: "Upgrades, invoices, and the customer portal run on Stripe Checkout and Billing. Card data stays with Stripe; we store subscription state for plan limits.",
  },
  {
    name: "CSV import",
    role: "Audience",
    body: "Bring contacts from almost any ESP or spreadsheet. Map columns, preview rows, and assign tags — the practical integration most teams need on day one.",
  },
  {
    name: "Hosted signup forms",
    role: "Growth",
    body: "Publish a Sendfable form, optionally require double opt-in, and feed new subscribers into tags and segments without a separate form SaaS.",
  },
];

export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Integrations", href: "/integrations", current: true },
        ]}
      />
      <h1 className="text-4xl font-bold tracking-tight">Integrations</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        Sendfable keeps the stack small on purpose: reliable sending, honest billing, CSV, and
        forms. We are not claiming hundreds of one-click marketplace apps we do not ship.
      </p>
      <div className="mt-8">
        <Button asChild>
          <Link href="/signup">Start free</Link>
        </Button>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {INTEGRATIONS.map((item) => (
          <div key={item.name} className="rounded-2xl border bg-white p-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-teal">
              {item.role}
            </div>
            <h2 className="mt-2 text-xl font-semibold">{item.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
          </div>
        ))}
      </div>

      <section className="mt-14 space-y-3 text-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900">Coming later vs available now</h2>
        <p>
          If you need native Shopify, Zapier, or CRM sync today, those are not listed as shipped
          integrations here. CSV export/import and forms cover many small-business workflows while
          we grow the catalog carefully.
        </p>
        <p className="text-sm">
          Migrating from another ESP? See{" "}
          <Link href="/migrate" className="font-medium text-teal hover:underline">
            migration guides
          </Link>
          .
        </p>
      </section>

      <MarketingCta secondaryHref="/features" secondaryLabel="Explore features" />
    </div>
  );
}
