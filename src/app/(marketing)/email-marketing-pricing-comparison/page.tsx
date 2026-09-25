import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { PricingComparisonCalculator } from "@/components/marketing/pricing-comparison-calculator";
import { PricingMatrixTable } from "@/components/marketing/pricing-matrix-table";
import {
  marketingPageMeta,
  JsonLd,
  breadcrumbJsonLd,
} from "@/components/marketing/json-ld";
import {
  allMatrixRows,
  matrixDisclaimer,
  PRICING_MATRIX_VERIFIED,
  TRADEMARK_DISCLAIMER,
  LIST_SIZE_PAGES,
} from "@/data/competitors/pricing-matrix";
import { PLANS } from "@/lib/plans";
import { isSmsPublicEnabled } from "@/lib/sms/flags";
import { Text20Hint } from "@/components/marketing/text20-hint";

const year = new Date().getFullYear();

export const metadata = marketingPageMeta({
  title: `Email Marketing Pricing Comparison (${year})`,
  description:
    "Compare SendFable, Mailchimp, Constant Contact, Brevo, MailerLite, Klaviyo and other popular email marketing tools — dated public pricing snapshots with an interactive calculator.",
  path: "/email-marketing-pricing-comparison",
});

export default function EmailMarketingPricingComparisonPage() {
  const rows = allMatrixRows();
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: rows.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: r.name,
      url: r.compareHref
        ? `https://sendfable.com${r.compareHref}`
        : r.pricingUrl,
    })),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Pricing comparison", path: "/email-marketing-pricing-comparison" },
        ])}
      />
      <JsonLd data={itemList} />

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          {
            label: "Pricing comparison",
            href: "/email-marketing-pricing-comparison",
            current: true,
          },
        ]}
      />

      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">
        Pricing hub
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
        Email marketing pricing comparison
      </h1>
      <p className="mt-4 max-w-3xl text-lg text-ink/75">
        One money page: free caps, entry paid plans, SMS class, and honest “varies” where we cannot
        verify. Figures checked {PRICING_MATRIX_VERIFIED}. Confirm on each vendor’s site before you
        buy.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/signup"
          className="inline-flex rounded-lg bg-coral-solid px-5 py-2.5 text-sm font-semibold text-white hover:bg-coral-hover"
        >
          Start free — {PLANS.FREE.contactCap} contacts
        </Link>
        <Link
          href="/pricing"
          className="inline-flex rounded-lg border border-ink/15 px-5 py-2.5 text-sm font-semibold text-ink hover:bg-parchment"
        >
          SendFable pricing
        </Link>
      </div>

      <PricingMatrixTable rows={rows} />

      <p className="mt-4 text-xs text-ink/55">{matrixDisclaimer()}</p>

      <div className="mt-14">
        <Text20Hint />
        <PricingComparisonCalculator smsPublic={isSmsPublicEnabled()} />
      </div>

      <section className="mt-14">
        <h2 className="font-display text-2xl font-bold text-ink">Cost by list size</h2>
        <p className="mt-2 text-sm text-ink/65">
          What does email marketing software cost at common contact counts?
        </p>
        <ul className="mt-4 flex flex-wrap gap-3 text-sm">
          {LIST_SIZE_PAGES.map((n) => (
            <li key={n}>
              <Link
                className="rounded-lg border border-ink/10 px-3 py-1.5 text-coral hover:bg-parchment"
                href={`/email-marketing-cost/${n}-contacts`}
              >
                {n.toLocaleString()} contacts
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-2xl font-bold text-ink">Where SendFable fits</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink/75">
          <li>Simple signup — name, email, password; no credit card on Free</li>
          <li>
            Free: {PLANS.FREE.contactCap} contacts · {PLANS.FREE.emailsPerMonth.toLocaleString()}{" "}
            emails/mo
          </li>
          <li>
            Starter ${PLANS.STARTER.monthlyPrice}/mo · {PLANS.STARTER.contactCap.toLocaleString()}{" "}
            contacts · {PLANS.STARTER.emailsPerMonth.toLocaleString()} emails/mo
          </li>
          <li>Campaign-first UI, Simple Mode, Send Confidence, CSV import, hosted forms</li>
        </ul>
        <h3 className="mt-8 text-lg font-semibold text-ink">Where others may win</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink/75">
          <li>Sender — currently larger free contact/send allowance</li>
          <li>Mailchimp — integration ecosystem and deep automations</li>
          <li>Klaviyo — ecommerce/CDP depth</li>
          <li>HubSpot — full CRM suite</li>
          <li>Kit — creator monetization and large free subscriber allowance</li>
        </ul>
      </section>

      <p className="mt-10 text-xs text-ink/45">{TRADEMARK_DISCLAIMER}</p>
      <MarketingCta />
    </div>
  );
}
