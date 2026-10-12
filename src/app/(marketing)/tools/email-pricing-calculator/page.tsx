import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { PricingComparisonCalculator } from "@/components/marketing/pricing-comparison-calculator";
import { marketingPageMeta } from "@/components/marketing/json-ld";
import { PRICING_MATRIX_VERIFIED } from "@/data/competitors/pricing-matrix";
import { isSmsPublicEnabled } from "@/lib/sms/flags";

export const metadata = marketingPageMeta({
  title: "Email pricing calculator",
  description:
    "Compare likely monthly email-marketing cost by list size. SendFable plans are current. Other providers use dated public snapshots.",
  path: "/tools/email-pricing-calculator",
});

export default function EmailPricingCalculatorPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Tools", href: "/tools" },
          { label: "Email pricing calculator", href: "/tools/email-pricing-calculator", current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
        Email pricing calculator
      </h1>
      <p className="mt-4 max-w-3xl text-lg text-ink/75">
        Pick a list size. See the SendFable plan that fits, then a dated estimate for other tools.
        Figures for those tools were checked {PRICING_MATRIX_VERIFIED}. Confirm on each vendor’s
        site before you buy.
      </p>
      <p className="mt-3 text-sm">
        <Link href="/email-marketing-pricing-comparison" className="font-medium text-coral hover:underline">
          Full pricing comparison
        </Link>
      </p>
      <div className="mt-8">
        <PricingComparisonCalculator smsPublic={isSmsPublicEnabled()} />
      </div>
      <MarketingCta
        title="Start on the plan that fits the list."
        body="Free includes a real contact cap and a real send cap. No credit card."
        primaryLabel="Start free"
        secondaryHref="/pricing"
        secondaryLabel="SendFable pricing"
      />
    </div>
  );
}
