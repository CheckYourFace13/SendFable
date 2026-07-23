import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { AnswerLead } from "@/components/marketing/answer-lead";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import {
  JsonLd,
  definedTermSetJsonLd,
  howToJsonLd,
  marketingPageMeta,
} from "@/components/marketing/json-ld";

export const metadata = marketingPageMeta({
  title: "Email deliverability explained simply",
  description:
    "What SPF, DKIM, and DMARC mean, why Gmail From addresses may be rewritten, how list quality protects inbox placement, and a practical checklist before you send.",
  path: "/deliverability",
});

const TERMS = [
  {
    name: "SPF",
    description:
      "Sender Policy Framework — a DNS record that lists which servers may send email for a domain.",
  },
  {
    name: "DKIM",
    description:
      "DomainKeys Identified Mail — a cryptographic signature on each message so receivers can verify it was not altered.",
  },
  {
    name: "DMARC",
    description:
      "Domain-based Message Authentication — tells receivers what to do when SPF or DKIM fail, and how strict the policy is.",
  },
];

const CHECKLIST = [
  {
    name: "Use opted-in contacts only",
    text: "Import people who asked to hear from you. Never buy, rent, or scrape lists.",
  },
  {
    name: "Add your physical mailing address",
    text: "Commercial email requires a postal address in the footer. Set it in workspace settings.",
  },
  {
    name: "Verify your From address",
    text: "Confirm the sender identity customers will recognize before launching a campaign.",
  },
  {
    name: "Send a test to yourself",
    text: "Check links, mobile layout, and unsubscribe before the full send.",
  },
  {
    name: "Watch bounce and complaint rates",
    text: "High bounces or complaints pause sending. Clean the list before trying again.",
  },
];

const FAQS = [
  {
    q: "Can Sendfable guarantee inbox placement?",
    a: "No honest provider can. Inbox placement depends on authentication, list quality, engagement, and each mailbox provider’s filters. Sendfable focuses on the parts you can control.",
  },
  {
    q: "Why might my Gmail From address be rewritten?",
    a: "Gmail publishes a strict DMARC policy. Mail that claims to be from @gmail.com but originates on Sendfable’s servers would fail authentication. We send via an authenticated platform domain and set Reply-To to your real address so replies still reach you.",
  },
  {
    q: "Do I need to set up Amazon SES myself?",
    a: "No. Normal Sendfable customers do not configure AWS. Delivery infrastructure is managed for you.",
  },
];

export default function DeliverabilityPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd data={definedTermSetJsonLd(TERMS)} />
      <JsonLd
        data={howToJsonLd({
          name: "Deliverability checklist before you send",
          description: "Five practical steps that protect reputation and inbox placement.",
          path: "/deliverability",
          steps: CHECKLIST,
        })}
      />

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Deliverability", href: "/deliverability", current: true },
        ]}
      />

      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
        Deliverability, explained simply
      </h1>
      <p className="mt-3 text-lg text-ink/65">
        Inbox placement isn&apos;t magic — it&apos;s authentication, reputation, and list quality.
      </p>

      <AnswerLead
        question="What actually improves deliverability?"
        answer="Authenticate your sending identity, email only people who opted in, keep bounce and complaint rates low, and make unsubscribe easy. Clever copy cannot fix a dirty list."
      />

      <section className="mt-12 space-y-4 text-ink/80">
        <h2 className="text-2xl font-semibold text-ink">SPF, DKIM, and DMARC</h2>
        <ul className="space-y-3">
          {TERMS.map((t) => (
            <li key={t.name} className="rounded-xl border bg-white p-4">
              <strong className="text-ink">{t.name}</strong>
              <p className="mt-1 text-sm text-ink/75">{t.description}</p>
            </li>
          ))}
        </ul>
        <p>
          Gmail, Yahoo, and others increasingly enforce strict DMARC. That is why From addresses on
          consumer domains may need careful handling.
        </p>
      </section>

      <section className="mt-12 space-y-4 text-ink/80">
        <h2 className="text-2xl font-semibold text-ink">Why we rewrite some Gmail From addresses</h2>
        <p>
          If you verify <code className="rounded bg-parchment px-1">you@gmail.com</code> as a
          sender, we cannot honestly send mail that passes Gmail&apos;s DMARC when the message
          originates from Sendfable&apos;s servers. So we send as an address on our authenticated
          platform domain, keep your display name, and set <strong>Reply-To</strong> to your real
          address. Replies still reach you.
        </p>
      </section>

      <section className="mt-12 space-y-4 text-ink/80">
        <h2 className="text-2xl font-semibold text-ink">Custom domains</h2>
        <p>
          Prefer full brand alignment? Authenticate your own domain with DKIM records. Once
          verified, From addresses at that domain send with proper alignment — no rewrite needed.
          See{" "}
          <Link href="/pricing" className="font-medium text-coral underline">
            pricing
          </Link>{" "}
          for plan details when domain authentication is available on your tier.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-ink">Before-you-send checklist</h2>
        <ol className="mt-6 space-y-4">
          {CHECKLIST.map((step, i) => (
            <li key={step.name} className="rounded-xl border bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal">
                Step {i + 1}
              </p>
              <h3 className="mt-1 font-semibold text-ink">{step.name}</h3>
              <p className="mt-2 text-sm text-ink/75">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 space-y-4 text-ink/80">
        <h2 className="text-2xl font-semibold text-ink">List quality & auto-protection</h2>
        <p>
          Sendfable does not allow purchased lists. Campaigns that exceed bounce or complaint
          thresholds can be auto-paused. Clean lists beat clever copy every time.
        </p>
        <p className="text-sm">
          Related:{" "}
          <Link href="/email-marketing-for-small-business" className="text-coral underline">
            email for small business
          </Link>
          {" · "}
          <Link href="/migrate" className="text-coral underline">
            migrate your list
          </Link>
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold text-ink">Frequently asked questions</h2>
        <div className="mt-6">
          <Faq items={FAQS} />
        </div>
      </section>

      <MarketingCta />
    </div>
  );
}
