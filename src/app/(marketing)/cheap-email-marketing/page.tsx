import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { PLANS } from "@/lib/plans";
import { PRICING_DISCLAIMER, PRICING_LAST_CHECKED } from "@/data/competitor-pricing";

export const metadata = {
  title: "Cheap email marketing that still delivers",
  description:
    "Lower-cost email marketing with Sendfable: a free plan, paid tiers priced under typical Mailchimp Standard rates, and clear limits — not race-to-the-bottom spam tools.",
};

const FAQS = [
  {
    q: "Is the cheapest ESP always the right choice?",
    a: "No. Extremely cheap tools that ignore list hygiene can cost you domain reputation. Look for clear contact caps, bounce/complaint controls, and authentication support.",
  },
  {
    q: "How does Sendfable stay affordable?",
    a: "We focus on core sending, audience tools, and SES delivery — not a sprawling suite of unused add-ons. Free includes 2,000 emails/month; paid plans scale by contacts and volume.",
  },
  {
    q: "Do you undercut every competitor on every tier?",
    a: "Not always. Some send-based or newsletter-first tools may be cheaper for specific use cases. Compare your contact count and required features — see our compare pages and dated pricing notes.",
  },
];

export default function CheapEmailMarketingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Cheap email marketing", href: "/cheap-email-marketing", current: true },
        ]}
      />
      <h1 className="text-4xl font-bold tracking-tight">Cheap email marketing</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Affordable should mean predictable plans and fewer surprise add-ons — not purchased lists or
        tools that cut corners on unsubscribe and authentication.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/signup">Start free</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/pricing">Full pricing</Link>
        </Button>
      </div>

      <section className="mt-12 space-y-3 text-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900">What “cheap” looks like on Sendfable</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Free: {PLANS.FREE.emailsPerMonth.toLocaleString()} emails/mo,{" "}
            {PLANS.FREE.contactCap.toLocaleString()} contacts
          </li>
          <li>
            Starter: ${PLANS.STARTER.monthlyPrice}/mo up to{" "}
            {PLANS.STARTER.contactCap.toLocaleString()} contacts
          </li>
          <li>
            Growth: ${PLANS.GROWTH.monthlyPrice}/mo up to{" "}
            {PLANS.GROWTH.contactCap.toLocaleString()} contacts (custom domains)
          </li>
          <li>
            Pro: ${PLANS.PRO.monthlyPrice}/mo up to {PLANS.PRO.contactCap.toLocaleString()} contacts
            and team seats
          </li>
        </ul>
        <p className="text-sm text-muted-foreground">
          At common contact tiers, paid Sendfable plans are often about half of typical Mailchimp
          Standard list prices — verify with the calculator on{" "}
          <Link href="/pricing" className="text-teal hover:underline">
            pricing
          </Link>
          . Competitor figures last checked {PRICING_LAST_CHECKED}. {PRICING_DISCLAIMER}
        </p>
      </section>

      <section className="mt-12 space-y-3 text-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900">Where not to cut costs</h2>
        <p>
          Skipping authentication, buying emails, or blasting cold lists is expensive in the long
          run. Budget for a tool that pauses risky campaigns and supports proper From domains when
          you need them. Read{" "}
          <Link href="/deliverability" className="text-teal hover:underline">
            deliverability
          </Link>{" "}
          before you optimize purely for price.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">FAQ</h2>
        <div className="mt-6">
          <Faq items={FAQS} />
        </div>
      </section>

      <MarketingCta secondaryHref="/compare/mailchimp" secondaryLabel="Compare to Mailchimp" />
    </div>
  );
}
