import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";

export const metadata = {
  title: "Migrate to Sendfable from Mailchimp and others",
  description:
    "Move your list from Mailchimp, Constant Contact, Brevo, MailerLite, Kit, or a CSV export. Practical migration steps without locking you into OAuth signup.",
};

const SOURCES = [
  {
    name: "Mailchimp",
    steps: [
      "Export your audience as CSV from Audience → All contacts → Export.",
      "Include tags or groups if you use them — map them to Sendfable tags on import.",
      "Pause or cancel overlapping automations in Mailchimp before your first Sendfable campaign.",
    ],
  },
  {
    name: "Constant Contact",
    steps: [
      "Export contacts from Contacts → Export.",
      "Bring consent status carefully — only import people who opted in to hear from you.",
      "Recreate key lists as tags or segments in Sendfable.",
    ],
  },
  {
    name: "Brevo",
    steps: [
      "Export your contact list (CSV) from Contacts.",
      "Map email, name, and any custom attributes during Sendfable CSV import.",
      "Re-verify sending domains or identities in Sendfable before large campaigns.",
    ],
  },
  {
    name: "MailerLite",
    steps: [
      "Export subscribers from your group or account export tools.",
      "Import into Sendfable and recreate groups as tags or segments.",
      "Rebuild forms on Sendfable hosted forms if you rely on embed signups.",
    ],
  },
  {
    name: "Kit (ConvertKit)",
    steps: [
      "Export subscribers from Grow → Subscribers → Export.",
      "Map forms/tags to Sendfable tags; sequences become campaigns or a simple drip you rebuild.",
      "Update any checkout or landing-page embeds to point at your new forms.",
    ],
  },
  {
    name: "Generic CSV",
    steps: [
      "Export email, first name, last name, and any columns you want as tags or fields.",
      "Use Sendfable CSV import with column mapping — preview before confirming.",
      "Suppress known hard bounces and unsubscribes; never import purchased lists.",
    ],
  },
];

const FAQS = [
  {
    q: "Will Sendfable import my full campaign history?",
    a: "No. Migration focuses on contacts (and tags you map). Rebuild important campaigns in the Sendfable builder — often faster than fighting a brittle history import.",
  },
  {
    q: "Do I need to keep paying my old ESP during migration?",
    a: "Keep it until your list is imported, a test send looks right, and DNS/sender setup is verified. Then cancel on your timeline — we do not cancel other accounts for you.",
  },
  {
    q: "Can I bring a purchased list?",
    a: "No. Purchased, rented, or scraped lists violate our terms and can get your account terminated. Clean, consented lists only.",
  },
];

export default function MigratePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Migrate", href: "/migrate", current: true },
        ]}
      />
      <h1 className="text-4xl font-bold tracking-tight">Migrate to Sendfable</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Moving ESPs is mostly a careful CSV export, a clean import, and re-checking authentication.
        Here is an honest path from common tools — no fake “one-click migrator” claims.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/early-access">Request early access</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/migrate/mailchimp">Leave Mailchimp guide</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/deliverability">Read deliverability notes</Link>
        </Button>
      </div>

      <section className="mt-14 space-y-8">
        {SOURCES.map((s) => (
          <div key={s.name} className="rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-semibold">From {s.name}</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
              {s.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {s.name === "Mailchimp" && (
              <p className="mt-4 text-sm">
                <Link href="/migrate/mailchimp" className="font-medium text-coral underline-offset-4 hover:underline">
                  Full Mailchimp → Sendfable walkthrough
                </Link>
              </p>
            )}
          </div>
        ))}
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight">Migration FAQ</h2>
        <div className="mt-6">
          <Faq items={FAQS} />
        </div>
      </section>

      <MarketingCta
        title="Import when you are ready"
        body="Join early access, map your CSV when invited, verify a sender, and send a small test campaign before you cut over."
        secondaryHref="/pricing"
        secondaryLabel="See pricing"
      />
    </div>
  );
}
