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

  const starterHref = "/signup?plan=STARTER&interval=month&code=TEXT20";
  const growthHref = "/signup?plan=GROWTH&interval=month&code=TEXT20";

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <PromoViewTracker />
      <h1 className="font-display text-4xl font-bold text-ink">TEXT20</h1>
      <p className="mt-4 text-lg text-ink/75">
        20% off your first three months on monthly Starter ($
        {PLANS.STARTER.monthlyPrice}/mo) or Growth (${PLANS.GROWTH.monthlyPrice}/mo). For new
        first-time paid customers only. It does not apply to the Free plan, annual billing, Text
        Messaging plans, or other discounts.
      </p>
      <ol className="mt-8 list-decimal space-y-2 pl-5 text-sm text-ink/80">
        <li>Create your account (or sign in)</li>
        <li>Continue to billing for monthly Starter or Growth</li>
        <li>
          Code <strong>TEXT20</strong> is applied automatically at Checkout when you arrive from
          this promo
        </li>
      </ol>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={starterHref}
          className="inline-flex rounded-lg bg-coral-solid px-5 py-2.5 text-sm font-semibold text-white hover:bg-coral-hover"
        >
          Continue with Starter
        </Link>
        <Link
          href={growthHref}
          className="inline-flex rounded-lg border border-ink/20 bg-page px-5 py-2.5 text-sm font-semibold text-ink hover:bg-parchment"
        >
          Continue with Growth
        </Link>
      </div>
      <p className="mt-6 text-xs text-ink/50">Checkout shows the exact discount before you pay.</p>
    </div>
  );
}
