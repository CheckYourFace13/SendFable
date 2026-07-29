import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd, howToJsonLd, faqJsonLd } from "@/components/marketing/json-ld";

const STEPS = [
  { name: "Export contacts from Mailchimp", text: "Download a CSV of subscribed contacts. Exclude unsubscribed and cleaned addresses when possible." },
  { name: "Create your SendFable account", text: "Start free, add your business mailing address, and verify a sender." },
  { name: "Import the CSV", text: "Map email, name, and tags. Review duplicates and suppressions." },
  { name: "Rebuild key campaigns", text: "Recreate your highest-value templates. Automations usually need a fresh design rather than a perfect import." },
  { name: "Send a test, then a small live campaign", text: "Use Send Confidence, send to yourself, then a small consented segment before a full send." },
];

const FAQS = [
  {
    q: "Can I import Mailchimp automations?",
    a: "Not as a one-click journey import. Export contacts and rebuild the automations that still matter.",
  },
  {
    q: "Will my templates transfer?",
    a: "Expect to rebuild in SendFable’s editor. Bring brand colors, logos, and copy — not a pixel-perfect HTML dump.",
  },
];

export const metadata = marketingPageMeta({
  title: "Switch from Mailchimp to SendFable",
  description:
    "A practical checklist to leave Mailchimp: export contacts, import into SendFable, verify senders, and rebuild campaigns without drama.",
  path: "/switch-from-mailchimp",
});

export default function SwitchFromMailchimpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Switch from Mailchimp", path: "/switch-from-mailchimp" },
        ])}
      />
      <JsonLd
        data={howToJsonLd({
          name: "Switch from Mailchimp to SendFable",
          description: "Export, import, verify, and send.",
          path: "/switch-from-mailchimp",
          steps: STEPS,
        })}
      />
      <JsonLd data={faqJsonLd(FAQS)} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Switch from Mailchimp", href: "/switch-from-mailchimp", current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
        Switch from Mailchimp without the drama
      </h1>
      <p className="mt-4 text-lg text-ink/75">
        Direct answer: export a clean CSV, import into SendFable, verify your sender, and rebuild the
        few campaigns that matter. You do not need to recreate every historical automation on day one.
      </p>
      <ol className="mt-10 space-y-6">
        {STEPS.map((s, i) => (
          <li key={s.name}>
            <h2 className="text-lg font-semibold">
              {i + 1}. {s.name}
            </h2>
            <p className="mt-2 text-sm text-slate-700">{s.text}</p>
          </li>
        ))}
      </ol>
      <p className="mt-8 text-sm">
        Guides:{" "}
        <Link className="text-coral hover:underline" href="/guides/export-contacts-from-mailchimp">
          Export
        </Link>{" "}
        ·{" "}
        <Link className="text-coral hover:underline" href="/guides/import-mailchimp-contacts-to-sendfable">
          Import
        </Link>{" "}
        ·{" "}
        <Link className="text-coral hover:underline" href="/migrate/mailchimp">
          Migration page
        </Link>
      </p>
      <section className="mt-12">
        <h2 className="text-2xl font-bold">FAQ</h2>
        <div className="mt-6">
          <Faq items={FAQS} />
        </div>
      </section>
      <MarketingCta primaryLabel="Create your free account" />
    </div>
  );
}
