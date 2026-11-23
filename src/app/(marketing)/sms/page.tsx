import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { SmsPricingSection } from "@/components/marketing/sms-pricing";
import { Button } from "@/components/ui/button";
import { marketingPageMeta } from "@/components/marketing/json-ld";
import { isSmsCodeEnabled, isSmsPublicEnabled } from "@/lib/sms/flags";
import {
  SMS_ACTIVATION_FEE_CENTS,
  SMS_PLANS,
  formatCentsUsd,
  formatMicrosUsd,
} from "@/lib/sms/pricing";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  if (!isSmsCodeEnabled() || !isSmsPublicEnabled()) {
    return { title: "Text messaging", robots: { index: false, follow: false } };
  }
  return marketingPageMeta({
    title: "SendFable Text — Email, Text, or Both",
    description: `Add SendFable Text to collect and message opted-in contacts. Three plans from ${formatCentsUsd(SMS_PLANS.TEXT_ENTRY.monthlyPriceCents)}/mo plus per-segment pricing. ${formatCentsUsd(SMS_ACTIVATION_FEE_CENTS)} activation.`,
    path: "/sms",
  });
}

export default function SmsProductPage() {
  if (!isSmsCodeEnabled() || !isSmsPublicEnabled()) notFound();

  return (
    <div className="editorial-bg">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Text messaging", href: "/sms", current: true },
          ]}
        />
        <p className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          SendFable
        </p>
        <h1 className="mt-3 font-display text-display-lg text-ink text-balance">
          Text messaging for the same audience you already email
        </h1>
        <p className="mt-4 text-lg text-charcoal/80">
          SendFable Text lets you send short, permission-based SMS from the same workspace as email.
          One contact list. One campaign flow. Choose Email, Text, or Both.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" className="bg-coral-solid text-white hover:bg-coral-hover">
            <Link href="/signup">Start free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/pricing">Add Text on pricing</Link>
          </Button>
        </div>
      </div>

      <section className="mx-auto max-w-3xl px-4 pb-12 sm:px-6">
        <h2 className="font-display text-2xl text-ink">What Text does</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>Dedicated business texting number after activation</li>
          <li>Campaigns that send Email, Text, or Both to the same audience</li>
          <li>Inbox for replies, with email notifications</li>
          <li>Tags and segments so you message the right people</li>
        </ul>

        <h2 className="mt-12 font-display text-2xl text-ink">Who it is useful for</h2>
        <p className="mt-3 text-sm text-slate-700">
          Local businesses that already collect customers on a website or in person and need a short
          reminder, offer, or update — restaurants, salons, retail, events, contractors — without a
          separate SMS-only stack.
        </p>

        <h2 className="mt-12 font-display text-2xl text-ink">Consent, STOP, and HELP</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>Only message people who opted in for SMS</li>
          <li>STOP ends texts; HELP returns support instructions</li>
          <li>Email-only accounts stay email-only until you add Text</li>
        </ul>

        <h2 className="mt-12 font-display text-2xl text-ink">Activation</h2>
        <p className="mt-3 text-sm text-slate-700">
          Text requires a one-time {formatCentsUsd(SMS_ACTIVATION_FEE_CENTS)} activation fee, then a
          monthly Text plan. Carrier registration and number provisioning happen after purchase —
          details are shown in billing before you pay. Current pricing:{" "}
          <Link href="/pricing" className="text-coral hover:underline">
            Pricing
          </Link>
          .
        </p>
        <p className="mt-3 text-sm text-slate-700">
          Per-segment outbound rates today: Text Entry{" "}
          {formatMicrosUsd(BigInt(SMS_PLANS.TEXT_ENTRY.outboundSegmentPriceMicros))}, Text Essentials{" "}
          {formatMicrosUsd(BigInt(SMS_PLANS.TEXT_ESSENTIALS.outboundSegmentPriceMicros))}, Text
          Advantage {formatMicrosUsd(BigInt(SMS_PLANS.TEXT_ADVANTAGE.outboundSegmentPriceMicros))}.
          Longer messages may use multiple segments.
        </p>
      </section>

      <SmsPricingSection />

      <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <p className="text-sm text-muted-foreground">
          See also{" "}
          <Link href="/terms" className="text-coral hover:underline">
            Terms
          </Link>
          ,{" "}
          <Link href="/privacy" className="text-coral hover:underline">
            Privacy
          </Link>
          , and{" "}
          <Link href="/acceptable-use" className="text-coral hover:underline">
            Acceptable use
          </Link>
          .
        </p>
        <MarketingCta
          title="Ready for Email, Text, or Both?"
          body="Start free on email. Add Text when you are ready — same contacts, same campaign flow."
          primaryHref="/signup"
          primaryLabel="Start free"
          secondaryHref="/pricing"
          secondaryLabel="See pricing"
        />
      </div>
    </div>
  );
}
