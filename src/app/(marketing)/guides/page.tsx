import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd } from "@/components/marketing/json-ld";

export const metadata = marketingPageMeta({
  title: "Guides — email marketing how-tos",
  description:
    "Practical SendFable guides: list building, deliverability, CAN-SPAM, Mailchimp export/import, and how often to email customers.",
  path: "/guides",
});

const GUIDE_GROUPS = [
  {
    title: "Getting started",
    items: [
      {
        href: "/guides/build-email-list-without-buying",
        title: "Build an email list without buying one",
        body: "Permission-based collection that won’t burn your domain.",
      },
      {
        href: "/guides/how-often-to-email-customers",
        title: "How often to email customers",
        body: "Weekly vs monthly cadence for local businesses.",
      },
      {
        href: "/guides/can-spam-checklist-for-small-businesses",
        title: "CAN-SPAM checklist for small businesses",
        body: "Physical address, unsubscribe, and honest from-lines.",
      },
    ],
  },
  {
    title: "Deliverability",
    items: [
      {
        href: "/guides/spf-dkim-dmarc-explained",
        title: "SPF, DKIM, and DMARC explained",
        body: "What those DNS records mean in plain language.",
      },
      {
        href: "/deliverability",
        title: "Deliverability overview",
        body: "From-rewrite, authentication, and a before-you-send checklist.",
      },
    ],
  },
  {
    title: "Switching from Mailchimp",
    items: [
      {
        href: "/guides/export-contacts-from-mailchimp",
        title: "Export contacts from Mailchimp",
        body: "Get a clean CSV ready for import.",
      },
      {
        href: "/guides/import-mailchimp-contacts-to-sendfable",
        title: "Import Mailchimp contacts to SendFable",
        body: "Map fields and keep suppressions respected.",
      },
      {
        href: "/migrate/mailchimp",
        title: "Full Mailchimp migration walkthrough",
        body: "Export, clean, import, verify sender, test, then cancel.",
      },
    ],
  },
] as const;

export default function GuidesIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
        ])}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Guides", href: "/guides", current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">Guides</h1>
      <p className="mt-3 text-lg text-ink/70">
        Real how-tos we already publish — not filler. For product FAQs, see{" "}
        <Link href="/faq" className="text-coral underline-offset-2 hover:underline">
          FAQ
        </Link>
        . For the broader hub, see{" "}
        <Link href="/resources" className="text-coral underline-offset-2 hover:underline">
          Resources
        </Link>
        .
      </p>

      <div className="mt-12 space-y-10">
        {GUIDE_GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="text-xl font-semibold text-ink">{group.title}</h2>
            <ul className="mt-4 divide-y divide-ink/10 rounded-xl border border-ink/10">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block px-4 py-4 transition-colors hover:bg-parchment/60"
                  >
                    <p className="font-medium text-ink">{item.title}</p>
                    <p className="mt-1 text-sm text-ink/65">{item.body}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <MarketingCta
        title="Prefer to learn by doing?"
        body="Start free, import a consented list, and send your first campaign."
        primaryLabel="Start free"
      />
    </div>
  );
}
