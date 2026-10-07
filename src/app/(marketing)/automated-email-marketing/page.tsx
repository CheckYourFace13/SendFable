import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta, JsonLd } from "@/components/marketing/json-ld";
import { WebsiteToEmailProof } from "@/components/marketing/website-to-email-proof";
import { autopilotMaxDraftsPerMonth } from "@/lib/autopilot/plans";
import { PLANS } from "@/lib/plans";

export const metadata = marketingPageMeta({
  title: "Automated Email Marketing for Small Businesses | SendFable",
  description:
    "SendFable watches your marketing page, creates a ready-to-send email when something changes, and waits for your approval before sending.",
  path: "/automated-email-marketing",
});

const USE_CASES = [
  {
    title: "Restaurant",
    body: "New weekly special appears → campaign drafted for your approval.",
  },
  {
    title: "Brewery",
    body: "New beer release → campaign drafted from the release page.",
  },
  {
    title: "Retail",
    body: "New sale or product → campaign ready to review.",
  },
  {
    title: "Real estate",
    body: "New listing or open house → draft waiting in your inbox.",
  },
  {
    title: "Salon",
    body: "New promotion → polished email draft, you decide.",
  },
  {
    title: "Nonprofit",
    body: "New event or fundraiser → campaign prepared, not sent.",
  },
  {
    title: "Local service",
    body: "Seasonal offer posts → Autopilot drafts, you approve.",
  },
];

const FAQS = [
  {
    q: "Will SendFable send emails without me?",
    a: "No. Marketing Autopilot never sends a generated campaign without your explicit approval. No response always means no send.",
  },
  {
    q: "Is this the same as Mailchimp-style automation builders?",
    a: "No. Complex journey builders ask you to wire triggers and branches. Marketing Autopilot is simpler: your marketing page changes → a campaign is drafted → you approve, edit, or skip.",
  },
  {
    q: "What pages can I watch?",
    a: "Any public https page where you post specials, events, products, news, or announcements. Private or login-walled pages are not supported.",
  },
  {
    q: "Does opening the approval email send the campaign?",
    a: "No. Email security scanners often open links automatically. Approve & Send opens a confirmation page; only the final button (a secure POST) can send.",
  },
  {
    q: "Which plans include Marketing Autopilot?",
    a: `Free includes weekly checks and ${autopilotMaxDraftsPerMonth("FREE")} drafts a month. Starter ($${PLANS.STARTER.monthlyPrice}/mo) checks daily, up to ${autopilotMaxDraftsPerMonth("STARTER")} drafts a month. Growth and above can check twice a day, up to ${autopilotMaxDraftsPerMonth("GROWTH")} drafts a month. A draft is created only when the page actually changes.`,
  },
  {
    q: "Does Autopilot send texts too?",
    a: "Launch is email-first. Text/Both can be added later and would still require explicit enablement, SMS consent, and owner approval.",
  },
];

export default function AutomatedEmailMarketingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Automated Email Marketing for Small Businesses",
          description:
            "Watch your marketing page, draft campaigns automatically, send only after approval.",
          url: "https://sendfable.com/automated-email-marketing",
        }}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Automated email marketing", href: "/automated-email-marketing", current: true },
        ]}
      />

      <h1 className="font-display text-4xl font-bold tracking-tight text-ink text-balance">
        Automated email marketing that still keeps you in control
      </h1>
      <p className="mt-4 text-lg text-ink/65">
        Collect subscribers. Watch the page where you promote. Draft automatically. Approve. Send —
        only when you say so.
      </p>

      <div className="mt-8">
        <WebsiteToEmailProof />
      </div>

      <div className="mt-6 rounded-xl border-2 border-coral/40 bg-coral/5 px-5 py-4">
        <p className="text-sm font-bold uppercase tracking-wider text-coral">No approval. No send.</p>
        <p className="mt-1 text-sm text-ink/70">
          Automate your marketing without giving up control.
        </p>
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {[
          { src: "/product/autopilot-setup.webp", alt: "Marketing Autopilot setup" },
          { src: "/product/autopilot-detected.webp", alt: "Website change detected" },
          { src: "/product/autopilot-draft.webp", alt: "Generated campaign draft" },
          { src: "/product/autopilot-approval-email.webp", alt: "Owner approval email" },
          { src: "/product/autopilot-approval-confirm.webp", alt: "Approval confirmation page" },
          { src: "/product/autopilot-campaign-result.webp", alt: "Campaign result" },
        ].map((img) => (
          <figure
            key={img.alt}
            className="overflow-hidden rounded-xl border border-ink/10 bg-parchment/40"
          >
            <picture>
              <source srcSet={img.src} type="image/webp" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/product/autopilot-flow.svg"
                alt={img.alt}
                className="h-auto w-full bg-[#f7f3eb] object-contain"
                width={640}
                height={420}
                loading="lazy"
                decoding="async"
              />
            </picture>
          </figure>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink/55">
        Real SendFable UI from controlled demo data — no stock photos, no fake testimonials, no
        customer PII.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild className="bg-coral-solid text-white hover:bg-coral-hover">
          <Link href="/signup">Start free</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/signup">Turn on Marketing Autopilot</Link>
        </Button>
      </div>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold text-ink">How it works</h2>
        <ol className="mt-6 space-y-5">
          {[
            {
              t: "Collect",
              b: "SendFable hosted or embedded forms collect email (optional name/phone and separate SMS consent).",
            },
            {
              t: "Watch",
              b: "Point Autopilot at specials, events, products, or news. We check on a simple schedule.",
            },
            {
              t: "Draft",
              b: "Meaningful changes create a real SendFable campaign draft from an existing template — not a plain text dump.",
            },
            {
              t: "Approve",
              b: "You get a preview email with Approve & send, Edit, or Don't send. Confirmation is required before send. Edit before sending opens the exact draft. No response always means no send.",
            },
            {
              t: "Send",
              b: "After explicit approval, the campaign sends through the normal SendFable email pipeline.",
            },
          ].map((s, i) => (
            <li key={s.t} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-page">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold text-ink">{s.t}</h3>
                <p className="mt-1 text-sm text-ink/65">{s.b}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold text-ink">Built for real small businesses</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {USE_CASES.map((u) => (
            <div key={u.title} className="rounded-xl border border-ink/10 p-4">
              <h3 className="font-semibold text-ink">{u.title}</h3>
              <p className="mt-1 text-sm text-ink/65">{u.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 rounded-xl border border-ink/10 bg-parchment/50 p-6">
        <h2 className="text-xl font-semibold text-ink">Page changes → campaign ready → you approve</h2>
        <p className="mt-2 text-sm text-ink/65">
          Competitors often offer complex automation builders. SendFable&apos;s differentiator is
          simpler: watch the page where you already post promotions, prepare the campaign, and wait
          for you. Nothing sends until you approve.
        </p>
        <p className="mt-4 text-sm">
          <Link href="/compare/mailchimp" className="text-coral underline">
            See how this compares to Mailchimp
          </Link>
          {" · "}
          <Link href="/compare" className="text-coral underline">
            All comparisons
          </Link>
        </p>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold text-ink">Availability</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-ink/70">
          <li>
            Free — weekly checks, {autopilotMaxDraftsPerMonth("FREE")} drafts a month
          </li>
          <li>
            Starter (${PLANS.STARTER.monthlyPrice}/mo) — daily checks,{" "}
            {autopilotMaxDraftsPerMonth("STARTER")} drafts a month
          </li>
          <li>
            Growth and above (${PLANS.GROWTH.monthlyPrice}/mo and up) — twice-daily checks,{" "}
            {autopilotMaxDraftsPerMonth("GROWTH")} drafts a month
          </li>
        </ul>
      </section>

      <Faq items={FAQS} />
      <MarketingCta
        title="Automate your marketing without giving up control"
        body="Start free. Point Autopilot at one page. Approve every send."
        primaryLabel="Start free"
      />
    </div>
  );
}
