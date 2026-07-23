import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { AnswerLead } from "@/components/marketing/answer-lead";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import {
  JsonLd,
  articleJsonLd,
  howToJsonLd,
  marketingPageMeta,
} from "@/components/marketing/json-ld";

export const metadata = marketingPageMeta({
  title: "Migrate from Mailchimp to Sendfable",
  description:
    "Step-by-step guide to leave Mailchimp: export contacts, map fields, suppress unsubscribes, import into Sendfable, and send your first campaign without buying lists.",
  path: "/migrate/mailchimp",
});

const STEPS = [
  {
    name: "Export your Mailchimp audience",
    text: "In Mailchimp, export the audience you have permission to email. Prefer a CSV that includes email, first name, last name, and subscription status when available.",
  },
  {
    name: "Clean before you import",
    text: "Remove obvious typos, role accounts you should not mail, and anyone who already unsubscribed or complained. Purchased or scraped lists are not allowed on Sendfable.",
  },
  {
    name: "Import into Sendfable",
    text: "Use Contacts → Import (or the migration center). Map columns, review valid/invalid/duplicate/suppressed counts, then commit. Existing suppressed addresses stay suppressed.",
  },
  {
    name: "Verify your sender",
    text: "Add the From address customers recognize. Complete mailing address in settings — required for commercial email.",
  },
  {
    name: "Send a test, then a small campaign",
    text: "Create a short email in Simple Mode, send a test to yourself, then send to a small segment first if the list is large or quiet.",
  },
];

const FAQS = [
  {
    q: "Will my Mailchimp open rates transfer?",
    a: "No — and you should not chase open rates anyway. Many inboxes block tracking pixels. Focus on clicks, replies, and unsubscribes after you migrate.",
  },
  {
    q: "Can I import unsubscribed contacts?",
    a: "You can import them with an unsubscribed status so they stay suppressed. Never re-subscribe people who opted out.",
  },
  {
    q: "Do I need to cancel Mailchimp the same day?",
    a: "No. Migrate contacts, send a test from Sendfable, then cancel Mailchimp when you are confident. Avoid sending the same campaign from both tools.",
  },
  {
    q: "Is Sendfable a Mailchimp alternative for small businesses?",
    a: "Yes for teams that want a simpler workflow. Compare features on our Mailchimp comparison page, then migrate with this guide when you are ready.",
  },
];

export default function MigrateFromMailchimpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={articleJsonLd({
          title: "Migrate from Mailchimp to Sendfable",
          description:
            "A practical CSV-first migration from Mailchimp without purchased lists or lost suppressions.",
          path: "/migrate/mailchimp",
          datePublished: "2026-07-23",
          dateModified: "2026-07-23",
        })}
      />
      <JsonLd
        data={howToJsonLd({
          name: "How to migrate from Mailchimp to Sendfable",
          description: "Export, clean, import, verify sender, and send a test.",
          path: "/migrate/mailchimp",
          steps: STEPS,
        })}
      />

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Migrate", href: "/migrate" },
          { label: "From Mailchimp", href: "/migrate/mailchimp", current: true },
        ]}
      />

      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
        Migrate from Mailchimp to Sendfable
      </h1>
      <p className="mt-3 text-lg text-ink/65">
        Leave complexity without losing the people who asked to hear from you. This guide is CSV-first
        and permission-first.
      </p>

      <AnswerLead
        question="How do I switch from Mailchimp without messing up my list?"
        answer="Export your opted-in audience, keep unsubscribes suppressed, import with column mapping, verify your From address, then send a test before a full campaign."
      />

      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-ink">Step-by-step</h2>
        <ol className="mt-6 space-y-5">
          {STEPS.map((step, i) => (
            <li key={step.name} className="rounded-xl border bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal">
                Step {i + 1}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-ink">{step.name}</h3>
              <p className="mt-2 text-ink/75">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 space-y-3 text-ink/80">
        <h2 className="text-2xl font-semibold text-ink">Related pages</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <Link href="/migrate" className="font-medium text-coral underline">
              General migration center
            </Link>
          </li>
          <li>
            <Link href="/compare/mailchimp" className="font-medium text-coral underline">
              Sendfable vs Mailchimp
            </Link>
          </li>
          <li>
            <Link href="/alternatives/mailchimp" className="font-medium text-coral underline">
              Mailchimp alternative overview
            </Link>
          </li>
          <li>
            <Link href="/email-marketing-for-small-business" className="font-medium text-coral underline">
              Email marketing for small business
            </Link>
          </li>
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold text-ink">Frequently asked questions</h2>
        <div className="mt-6">
          <Faq items={FAQS} />
        </div>
      </section>

      <MarketingCta
        title="Ready to leave Mailchimp complexity?"
        body="Request early access, import your cleaned CSV, and send a test from Simple Mode."
      />
    </div>
  );
}
