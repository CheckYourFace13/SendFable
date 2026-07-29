import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd } from "@/components/marketing/json-ld";
import { SENDFABLE_FACTS } from "@/data/sendfable-facts";
import { PLANS } from "@/lib/plans";

export const metadata = marketingPageMeta({
  title: "Mailchimp alternative for small business",
  description:
    "SendFable is a Mailchimp alternative for small businesses that want simple campaigns and transparent pricing — without pretending to match every suite feature.",
  path: "/mailchimp-alternative-for-small-business",
});

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Small business", path: "/mailchimp-alternative-for-small-business" },
        ])}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Small business", href: "/mailchimp-alternative-for-small-business", current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
        Mailchimp alternative for small business
      </h1>
      <p className="mt-4 text-lg text-ink/75">
        Direct answer: {SENDFABLE_FACTS.positioning} Start free with {PLANS.FREE.contactCap} contacts
        and {PLANS.FREE.emailsPerMonth.toLocaleString()} emails/month — no credit card required.
      </p>
      <p className="mt-4 text-sm text-slate-700">
        This page is the general small-business overview. For vertical detail see{" "}
        <Link className="text-coral hover:underline" href="/mailchimp-alternative-for-restaurants">
          restaurants
        </Link>
        ,{" "}
        <Link className="text-coral hover:underline" href="/mailchimp-alternative-for-nonprofits">
          nonprofits
        </Link>
        , and{" "}
        <Link className="text-coral hover:underline" href="/mailchimp-alternative-for-local-business">
          local business
        </Link>
        . Full trade-offs live on{" "}
        <Link className="text-coral hover:underline" href="/compare/mailchimp">
          /compare/mailchimp
        </Link>
        .
      </p>
      <MarketingCta />
    </div>
  );
}
