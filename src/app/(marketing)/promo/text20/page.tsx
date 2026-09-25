import Link from "next/link";
import { notFound } from "next/navigation";
import { isText20Public } from "@/components/marketing/text20-hint";
import { PromoViewTracker } from "@/components/marketing/promo-view-tracker";
import { PLANS } from "@/lib/plans";
import { marketingPageMeta } from "@/components/marketing/json-ld";

export const metadata = marketingPageMeta({
  title: "TEXT20 — 20% off Starter & Growth",
  description: "20% off your first three months on monthly Starter or Growth.",
  path: "/promo/text20",
  noIndex: true,
});

export default function Text20PromoPage() {
  if (!isText20Public()) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <PromoViewTracker />
      <h1 className="font-display text-4xl font-bold text-ink">TEXT20</h1>
      <p className="mt-4 text-lg text-ink/75">
        Try Email + Text together. 20% off your first three months on Starter ($
        {PLANS.STARTER.monthlyPrice}/mo) or Growth (${PLANS.GROWTH.monthlyPrice}/mo). New paid
        subscriptions only. It does not apply to the Free plan and does not stack with other
        discounts.
      </p>
      <ol className="mt-8 list-decimal space-y-2 pl-5 text-sm text-ink/80">
        <li>Create your free account</li>
        <li>Open Billing and choose monthly Starter or Growth</li>
        <li>
          Enter code <strong>TEXT20</strong> at Checkout
        </li>
      </ol>
      <p className="mt-8">
        <Link
          href="/signup"
          className="inline-flex rounded-lg bg-coral-solid px-5 py-2.5 text-sm font-semibold text-white hover:bg-coral-hover"
        >
          Start free
        </Link>
      </p>
      <p className="mt-6 text-xs text-ink/50">Checkout shows the exact discount before you pay.</p>
    </div>
  );
}
