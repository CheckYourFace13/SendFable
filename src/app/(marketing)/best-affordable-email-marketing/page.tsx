import { marketingPageMeta } from "@/components/marketing/json-ld";
import { SENDFABLE_FACTS } from "@/data/sendfable-facts";
import { PLANS } from "@/lib/plans";
import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";

export const metadata = marketingPageMeta({
  title: "Best affordable email marketing",
  description:
    "Affordable email marketing means clear published prices and limits you understand — Free through Pro Plus on SendFable, with honest notes on when cheaper volume tools win.",
  path: "/best-affordable-email-marketing",
});

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Affordable email", href: "/best-affordable-email-marketing", current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
        Best affordable email marketing
      </h1>
      <p className="mt-4 text-lg text-ink/75">
        Direct answer: Start free on SendFable (${PLANS.FREE.monthlyPrice}, {PLANS.FREE.contactCap}{" "}
        contacts). Paid plans begin at ${PLANS.STARTER.monthlyPrice}/mo. For send-volume pricing,
        evaluate Brevo; for established low-cost ESPs, evaluate MailerLite or EmailOctopus.
      </p>
      <p className="mt-4 text-sm text-slate-700">
        Affordable is not the same as “cheapest possible.” Include the cost of complexity — time spent
        learning a suite you will not use. Last updated {SENDFABLE_FACTS.lastUpdated}.
      </p>
      <p className="mt-6 text-sm">
        <Link className="text-coral hover:underline" href="/pricing">
          SendFable pricing
        </Link>{" "}
        ·{" "}
        <Link className="text-coral hover:underline" href="/compare/brevo">
          vs Brevo
        </Link>{" "}
        ·{" "}
        <Link className="text-coral hover:underline" href="/compare/mailerlite">
          vs MailerLite
        </Link>
      </p>
      <MarketingCta />
    </div>
  );
}
