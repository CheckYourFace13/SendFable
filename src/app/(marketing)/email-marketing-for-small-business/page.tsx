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
  title: "Email marketing for small business",
  description:
    "A simple email marketing playbook for small businesses: permission-based lists, one weekly send, clear offers, and tools that stay out of your way.",
  path: "/email-marketing-for-small-business",
});

const FAQS = [
  {
    q: "What is the simplest email marketing workflow for a small business?",
    a: "Collect opted-in contacts, write one clear email, send a test to yourself, then send to your list. Review clicks and unsubscribes, then plan the next note. Repeat weekly or biweekly.",
  },
  {
    q: "How often should a small business send email?",
    a: "Most local businesses do well with one useful email every one or two weeks. Consistency beats volume. Skip days with nothing useful to say.",
  },
  {
    q: "Do small businesses need complicated automation?",
    a: "Usually no. A welcome note, a weekly update, and occasional offers cover most needs. Add automation later only when a manual step becomes painful.",
  },
  {
    q: "Is Sendfable built for small businesses?",
    a: "Yes. The product journey is add people → create an email → send → understand results. Advanced tools stay available, but Simple Mode is the default.",
  },
];

const HOW_TO = [
  {
    name: "Collect permission",
    text: "Only email people who asked to hear from you — signup forms, checkout checkboxes, or in-person signups. Never buy lists.",
  },
  {
    name: "Write one clear email",
    text: "One idea, one offer or update, one button. Use your normal voice. Keep the subject specific.",
  },
  {
    name: "Send a test",
    text: "Send to yourself first. Check mobile layout, links, and the unsubscribe footer.",
  },
  {
    name: "Send to your list",
    text: "Launch when the test looks right. Start smaller if the list is new.",
  },
  {
    name: "Review and repeat",
    text: "Look at clicks and unsubscribes. Write the next email based on what people responded to.",
  },
];

export default function EmailMarketingForSmallBusinessPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={articleJsonLd({
          title: "Email marketing for small business",
          description:
            "A simple playbook for permission-based email that busy owners can run without a marketing team.",
          path: "/email-marketing-for-small-business",
          datePublished: "2026-07-23",
          dateModified: "2026-07-23",
        })}
      />
      <JsonLd
        data={howToJsonLd({
          name: "How to run email marketing as a small business",
          description: "A five-step workflow from permission to send.",
          path: "/email-marketing-for-small-business",
          steps: HOW_TO,
        })}
      />

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Resources", href: "/resources" },
          {
            label: "Email marketing for small business",
            href: "/email-marketing-for-small-business",
            current: true,
          },
        ]}
      />

      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
        Email marketing for small business
      </h1>
      <p className="mt-3 text-lg text-ink/65">
        You do not need a marketing department to stay in touch with customers. You need permission,
        a clear message, and a tool that does not fight you.
      </p>

      <AnswerLead
        question="What works for most small businesses?"
        answer="Email people who opted in, send one useful note on a steady cadence, and measure clicks — not vanity open rates. Keep the tool simple enough that you actually send."
      />

      <section className="mt-12 space-y-4 text-ink/80">
        <h2 className="text-2xl font-semibold text-ink">Why email still wins for local and small teams</h2>
        <p>
          Social algorithms change. Ads get expensive. Email is a list you own — as long as you
          earned permission and make it easy to leave. For restaurants, shops, contractors, salons,
          nonprofits, and professional services, a short weekly email often outperforms sporadic posts.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-ink">The five-step workflow</h2>
        <ol className="mt-6 space-y-5">
          {HOW_TO.map((step, i) => (
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

      <section className="mt-12 space-y-4 text-ink/80">
        <h2 className="text-2xl font-semibold text-ink">What to send (plain ideas)</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>This week&apos;s hours, specials, or appointments</li>
          <li>A single offer with a clear end date</li>
          <li>A helpful tip related to what you sell</li>
          <li>A thank-you or win-back note to quiet customers</li>
          <li>A welcome message for new subscribers</li>
        </ul>
        <p>
          Avoid stuffing five promotions into one email. One job per send keeps clicks higher and
          complaints lower.
        </p>
      </section>

      <section className="mt-12 space-y-4 text-ink/80">
        <h2 className="text-2xl font-semibold text-ink">How Sendfable keeps this simple</h2>
        <p>
          Sendfable is built around{" "}
          <strong>add people → create an email → send → understand results</strong>. Simple Mode is
          the default. You do not configure Amazon SES yourself. Import contacts from a spreadsheet,
          pick a goal or template, and use the send-confidence checklist before you launch.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/features" className="font-medium text-coral underline">
            Features
          </Link>
          <Link href="/templates" className="font-medium text-coral underline">
            Templates
          </Link>
          <Link href="/deliverability" className="font-medium text-coral underline">
            Deliverability basics
          </Link>
          <Link href="/pricing" className="font-medium text-coral underline">
            Pricing
          </Link>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold text-ink">Frequently asked questions</h2>
        <div className="mt-6">
          <Faq items={FAQS} />
        </div>
      </section>

      <MarketingCta
        title="Start with a list you already have"
        body="Request early access, then import opted-in contacts and write your first short campaign."
      />
    </div>
  );
}
