import Link from "next/link";
import { notFound } from "next/navigation";
import { isSmsPublicEnabled } from "@/lib/sms/flags";
import { PLANS } from "@/lib/plans";
import { marketingPageMeta } from "@/components/marketing/json-ld";

export const metadata = marketingPageMeta({
  title: "TEXT20 — 20% off Starter & Growth",
  description: "Launch offer: 20% off your first three months on Starter or Growth.",
  path: "/promo/text20",
  noIndex: true,
});

function promoPublic(): boolean {
  return (
    isSmsPublicEnabled() &&
    (process.env.SENDFABLE_PROMO_TEXT20_PUBLIC === "true" ||
      process.env.SENDFABLE_PROMO_TEXT20_PUBLIC === "1")
  );
}

export default function Text20PromoPage() {
  if (!promoPublic()) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-teal">Limited offer</p>
      <h1 className="mt-2 font-display text-4xl font-bold text-ink">TEXT20</h1>
      <p className="mt-4 text-lg text-ink/75">
        20% off your first three months on Starter (${PLANS.STARTER.monthlyPrice}/mo) or Growth ($
        {PLANS.GROWTH.monthlyPrice}/mo). New paid subscriptions only. Does not stack with other
        discounts.
      </p>
      <ol className="mt-8 list-decimal space-y-2 pl-5 text-sm text-ink/80">
        <li>Create your free account</li>
        <li>Open Billing and choose Starter or Growth</li>
        <li>Enter code <strong>TEXT20</strong> at Checkout</li>
      </ol>
      <p className="mt-8">
        <Link
          href="/signup"
          className="inline-flex rounded-lg bg-coral-solid px-5 py-2.5 text-sm font-semibold text-white hover:bg-coral-hover"
        >
          Start free
        </Link>
      </p>
      <p className="mt-6 text-xs text-ink/50">
        See docs/PROMO_TEXT20.md for Stripe setup. Offer terms may change; Checkout shows the live
        discount.
      </p>
    </div>
  );
}
