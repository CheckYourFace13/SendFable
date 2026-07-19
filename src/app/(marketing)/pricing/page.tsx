import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { PricingPreview } from "@/components/marketing/home/pricing-preview";

export const metadata = {
  title: "Pricing",
  description:
    "Sendfable pricing: free plan with clear contact and send limits, then Starter, Growth, and Pro. No credit card to start.",
};

export default function PricingPage() {
  return (
    <div className="editorial-bg">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Pricing", href: "/pricing", current: true },
          ]}
        />
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">
            Honest limits
          </p>
          <h1 className="mt-3 font-display text-display-lg text-ink">
            Pricing that stays readable
          </h1>
          <p className="mt-4 text-lg text-charcoal/75">
            Start free. Upgrade when your list grows. Competitor prices change — dated comparisons
            live on our compare pages.
          </p>
        </div>

        <div className="mt-12">
          <PricingPreview embedded showFullLink={false} />
        </div>

        <MarketingCta
          title="Your audience is ready."
          body="Give them something worth reading — start on Free, upgrade when you need more room."
          primaryLabel="Start writing free"
        />
      </div>
    </div>
  );
}
