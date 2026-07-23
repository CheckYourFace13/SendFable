import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { AnswerLead } from "@/components/marketing/answer-lead";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta } from "@/components/marketing/json-ld";

export const metadata = marketingPageMeta({
  title: "Resources",
  description:
    "Sendfable resource hub: email marketing for small business, deliverability, Mailchimp migration, templates, comparisons, and product updates.",
  path: "/resources",
});

const LINKS = [
  {
    title: "Email marketing for small business",
    href: "/email-marketing-for-small-business",
    body: "A five-step playbook: permission, one clear email, test, send, review.",
  },
  {
    title: "Email marketing guide",
    href: "/email-marketing-guide",
    body: "Lists, authentication, campaigns, and measuring what matters.",
  },
  {
    title: "Deliverability",
    href: "/deliverability",
    body: "SPF, DKIM, DMARC, From-rewrite, and a before-you-send checklist.",
  },
  {
    title: "Migrate from Mailchimp",
    href: "/migrate/mailchimp",
    body: "Export, clean, import, verify sender, and send your first test.",
  },
  {
    title: "Migrate to Sendfable",
    href: "/migrate",
    body: "CSV-first paths from Mailchimp, Constant Contact, Brevo, MailerLite, Kit, and more.",
  },
  {
    title: "Templates",
    href: "/templates",
    body: "Industry template gallery for announcements, offers, and welcome notes.",
  },
  {
    title: "Sendfable vs Mailchimp",
    href: "/compare/mailchimp",
    body: "Capability comparison for teams that want a simpler workflow.",
  },
  {
    title: "Cheap email marketing",
    href: "/cheap-email-marketing",
    body: "Cost clarity without fake “unlimited” claims.",
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
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">Resources</h1>
      <p className="mt-3 text-lg text-ink/65">
        Guides for running email without hype. Start here, then explore comparisons and industry
        pages when you need them.
      </p>

      <AnswerLead
        question="Where should I start?"
        answer="If you are new: read email marketing for small business. Switching tools: migrate from Mailchimp. Worried about the inbox: deliverability checklist."
      />

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
