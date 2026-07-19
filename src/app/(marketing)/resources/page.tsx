import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";

export const metadata = {
  title: "Resources",
  description:
    "Sendfable resource hub: email marketing guide, deliverability explainer, migration help, and product updates.",
};

const LINKS = [
  {
    title: "Email marketing guide",
    href: "/email-marketing-guide",
    body: "A practical guide to lists, authentication, campaigns, and measuring what matters.",
  },
  {
    title: "Deliverability",
    href: "/deliverability",
    body: "SPF, DKIM, DMARC, From-rewrite for strict mailboxes, and list-quality protections.",
  },
  {
    title: "Migrate to Sendfable",
    href: "/migrate",
    body: "CSV-first paths from Mailchimp, Constant Contact, Brevo, MailerLite, Kit, and more.",
  },
  {
    title: "Templates",
    href: "/templates",
    body: "Industry template gallery and what each layout is designed to help you send.",
  },
  {
    title: "Changelog",
    href: "/changelog",
    body: "Dated product updates for features that have actually shipped.",
  },
  {
    title: "Security",
    href: "/security",
    body: "Account, data, and sending practices — without fake compliance seals.",
  },
];

export default function ResourcesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Resources", href: "/resources", current: true },
        ]}
      />
      <h1 className="text-4xl font-bold tracking-tight">Resources</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Guides and references for running email without hype. Start with the topics below — or
        subscribe to the{" "}
        <Link href="/feed.xml" className="font-medium text-teal hover:underline">
          RSS feed
        </Link>{" "}
        for changelog and resource updates.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border bg-white p-6 transition hover:border-coral/40 hover:shadow-sm"
          >
            <h2 className="text-lg font-semibold text-ink">{item.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
          </Link>
        ))}
      </div>

      <MarketingCta />
    </div>
  );
}
