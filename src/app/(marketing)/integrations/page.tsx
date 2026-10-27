import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta } from "@/components/marketing/json-ld";

export const metadata = marketingPageMeta({
  title: "Integrations",
  description:
    "SendFable uses Amazon SES for delivery, Stripe for billing, CSV for audiences, and Signup Tools — a hosted page, Inline embed, or Popup — without a bloated app marketplace.",
  path: "/integrations",
});

const INTEGRATIONS = [
  {
    name: "Amazon SES",
    role: "Delivery",
    body: "Campaigns send through SendFable’s platform SES infrastructure. You do not paste your own SMTP keys — we operate sending, reputation ramp, and event handling.",
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
    name: "Signup Tools",
    role: "Growth",
    body: "Hosted page, Inline embed, or Popup. Same Signup Tool and audience. Install guides cover WordPress, Wix, Webflow, and Squarespace.",
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
        SendFable keeps the stack small on purpose: reliable sending, honest billing, CSV, and
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
        <h2 className="text-2xl font-semibold text-slate-900">Signup Tools</h2>
        <p>
          A hosted page, an Inline embed, or a Popup. Same Signup Tool, same consent language,
          same audience.
        </p>
        <h3 className="pt-2 text-lg font-semibold text-slate-900">Hosted signup page</h3>
        <p>
          Each tool has a public link at <span className="font-medium">sendfable.com/f/your-form</span>.
          Share it in a bio, a QR code, or an email. Open Signup Tools in the app, copy the hosted
          link, and you are done.
        </p>
        <h3 className="pt-2 text-lg font-semibold text-slate-900">Install on your site</h3>
        <p>Paste the code from Signup Tools. These guides show where that paste goes. They are not plugins.</p>
        <ul className="flex flex-wrap gap-3 text-sm">
          <li>
            <Link href="/integrations/wordpress" className="font-medium text-teal hover:underline">
              WordPress
            </Link>
          </li>
          <li>
            <Link href="/integrations/wix" className="font-medium text-teal hover:underline">
              Wix
            </Link>
          </li>
          <li>
            <Link href="/integrations/webflow" className="font-medium text-teal hover:underline">
              Webflow
            </Link>
          </li>
          <li>
            <Link href="/integrations/squarespace" className="font-medium text-teal hover:underline">
              Squarespace
            </Link>
          </li>
        </ul>
        <h3 className="pt-2 text-lg font-semibold text-slate-900">Inline embed</h3>
        <p>
          Paste two lines on your site. Replace <span className="font-medium">your-form</span> with
          the slug shown in Signup Tools.
        </p>
        <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-100">{`<div data-sendfable-form="your-form"></div>
<script src="https://sendfable.com/embed/form.js" async></script>`}</pre>
        <h3 className="pt-2 text-lg font-semibold text-slate-900">Popup</h3>
        <p>
          Choose Popup in Signup Tools, then Copy code. The snippet uses the same script and adds
          when it appears. Add it once on the pages where it should run.{" "}
          <span className="font-medium">your-form</span> is only an example.
        </p>
        <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-100">{`<div data-sendfable-form="your-form" data-display="popup" data-trigger="delay" data-delay="10" data-frequency="7d"></div>
<script src="https://sendfable.com/embed/form.js" async></script>`}</pre>
        <p className="text-sm">
          The script works across domains. Email signup and SMS consent stay separate. After you
          start free, open{" "}
          <Link href="/forms" className="font-medium text-teal hover:underline">
            Signup Tools
          </Link>{" "}
          to copy the exact snippet for each form.
        </p>
      </section>

      <section className="mt-14 space-y-3 text-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900">Coming later vs available now</h2>
        <p>
          If you need native Shopify, Zapier, or CRM sync today, those are not listed as shipped
          integrations here. CSV export/import and Signup Tools cover many small-business workflows
          while we grow the catalog carefully.
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
