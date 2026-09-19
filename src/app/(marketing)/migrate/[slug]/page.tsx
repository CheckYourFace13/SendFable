import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { Faq } from "@/components/marketing/faq";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/components/marketing/json-ld";
import { getCompetitor } from "@/data/competitors";
import { migrateSlugs } from "@/data/competitors/pricing-matrix";

/** Dynamic migrate guides — static /migrate/mailchimp keeps priority. */
export function generateStaticParams() {
  return migrateSlugs()
    .filter((s) => s !== "mailchimp")
    .map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const c = getCompetitor(params.slug);
  if (!c || !migrateSlugs().includes(params.slug)) return { title: "Migrate" };
  return marketingPageMeta({
    title: `Migrate from ${c.name} to SendFable`,
    description: `How to export contacts from ${c.name} and import into SendFable without bringing suppressed or unsubscribed people as active.`,
    path: `/migrate/${c.slug}`,
  });
}

const VENDOR_STEPS: Record<string, string[]> = {
  "constant-contact": [
    "Open Contacts and use Export to download a CSV of the lists you own.",
    "Include subscription/status columns when available.",
    "Export suppression or unsubscribe lists separately if your account provides them.",
  ],
  brevo: [
    "From Contacts, export your lists as CSV.",
    "Include email, first/last name, and any attributes you want as tags.",
    "Export blocked/blacklisted contacts so you can keep them suppressed in SendFable.",
  ],
  mailerlite: [
    "Export subscribers from Subscribers or Groups.",
    "Include groups/fields you want to map to SendFable tags.",
    "Keep unsubscribed and bounced contacts out of the active import file.",
  ],
  klaviyo: [
    "Export profiles from Audience carefully — prefer consented email marketers only.",
    "Do not import suppressed or SMS-only profiles as email-active contacts.",
    "Rebuild flows; ecommerce events will not migrate 1:1.",
  ],
  activecampaign: [
    "Export contacts from Contacts → Export / advanced search.",
    "Map lists and tags into SendFable tags.",
    "Leave unsubscribed and bounced contacts suppressed — do not re-activate them.",
  ],
  omnisend: [
    "Export audience from Audience → export tools.",
    "Preserve consent and channel preferences where possible.",
    "Rebuild ecommerce automations after import.",
  ],
  getresponse: [
    "Export contacts from Contacts.",
    "Include custom fields you need as tags.",
    "Pause overlapping automations before your first SendFable send.",
  ],
  aweber: [
    "Export subscribers from List Options → Export.",
    "Bring tags/ad tracking fields if useful.",
    "Keep unsubscribed lists separate from active imports.",
  ],
  "campaign-monitor": [
    "Export subscribers from Lists & subscribers.",
    "Include custom fields for tagging.",
    "Rebuild client journeys rather than expecting full history import.",
  ],
  sender: [
    "Export subscribers from Subscribers.",
    "Map groups to SendFable tags.",
    "Preserve opt-outs — never import them as subscribed.",
  ],
};

export default function MigrateSlugPage({ params }: { params: { slug: string } }) {
  if (params.slug === "mailchimp") notFound(); // served by static page
  const c = getCompetitor(params.slug);
  if (!c || !migrateSlugs().includes(params.slug)) notFound();

  const steps = VENDOR_STEPS[params.slug] || [
    "Export a CSV of consented contacts from your current provider.",
    "Include email, first name, last name, and tags when available.",
    "Import into SendFable with column mapping; preview before confirm.",
  ];

  const faqs = [
    {
      q: `Can I import unsubscribed ${c.name} contacts as active?`,
      a: "No. Keep unsubscribed, complained, and hard-bounced addresses suppressed. Importing them as subscribed violates permission-based email practices and SendFable’s terms.",
    },
    {
      q: "What fields should I preserve?",
      a: "Email, first/last name, tags, and any subscription status you can map. Consent evidence should stay in your records even if it is not a CSV column.",
    },
    {
      q: `Will my ${c.name} automations transfer?`,
      a: "Usually not 1:1. Rebuild important journeys as SendFable campaigns or simple follow-ups after your list is clean.",
    },
  ];

  const path = `/migrate/${c.slug}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Migrate", path: "/migrate" },
          { name: c.name, path },
        ])}
      />
      <JsonLd data={faqJsonLd(faqs)} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Migrate", href: "/migrate" },
          { label: c.name, href: path, current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
        Migrate from {c.name} to SendFable
      </h1>
      <p className="mt-4 text-lg text-ink/75">
        Export opted-in contacts from {c.name}, keep suppressions intact, and import via SendFable
        CSV mapping. Do not import purchased lists.
      </p>

      <h2 className="mt-10 text-xl font-semibold">{c.name}-specific export steps</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink/80">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>

      <h2 className="mt-10 text-xl font-semibold">Import into SendFable</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink/80">
        <li>Create your SendFable account and verify a sender.</li>
        <li>Open Contacts → Import and map CSV columns.</li>
        <li>Preview rows; exclude unsubscribed/complained recipients from the active file.</li>
        <li>Send a small test campaign before a full send.</li>
      </ol>

      <p className="mt-6 text-sm">
        <Link className="text-coral hover:underline" href={`/compare/${c.slug}`}>
          SendFable vs {c.name}
        </Link>
        {" · "}
        <Link className="text-coral hover:underline" href="/email-marketing-pricing-comparison">
          Pricing comparison
        </Link>
        {" · "}
        <Link className="text-coral hover:underline" href="/signup">
          Start free and import CSV
        </Link>
      </p>

      <div className="mt-10">
        <Faq items={faqs} />
      </div>
      <MarketingCta />
    </div>
  );
}
