import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { PricingComparisonCalculator } from "@/components/marketing/pricing-comparison-calculator";
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
        Email Marketing Pricing Comparison
      </h1>
      <p className="mt-4 max-w-3xl text-lg text-ink/75">
        Compare SendFable, Mailchimp, Constant Contact, Brevo, MailerLite, Klaviyo and other
        popular email marketing tools. Figures checked {PRICING_MATRIX_VERIFIED} — verify on each
        vendor’s site before buying.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/signup"
          className="inline-flex rounded-lg bg-coral px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          Start free
        </Link>
        <p className="self-center text-sm text-ink/60">
          {PLANS.FREE.contactCap} contacts · {PLANS.FREE.emailsPerMonth.toLocaleString()} emails/month ·
          No credit card
        </p>
      </div>

      <div className="mt-12 overflow-x-auto rounded-xl border border-ink/10">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-parchment text-ink/70">
            <tr>
              {[
                "Provider",
                "Free plan",
                "Free contacts",
                "Free sends",
                "Entry paid",
                "Included contacts",
                "Included sends",
                "SMS",
                "Automations",
                "Brand removal",
                "Pricing model",
                "Best for",
                "Last verified",
              ].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-ink/5 align-top">
                <td className="px-3 py-3 font-semibold text-ink">
                  {r.compareHref ? (
                    <Link href={r.compareHref} className="text-coral hover:underline">
                      {r.name}
                    </Link>
                  ) : (
                    r.name
                  )}
                  <div>
                    <a
                      href={r.pricingUrl}
                      className="text-xs font-normal text-ink/50 underline"
                      rel="nofollow noopener"
                      target="_blank"
                    >
                      Official pricing
                    </a>
                  </div>
                </td>
                <td className="px-3 py-3">{r.freePlan}</td>
                <td className="px-3 py-3">{r.freeContacts}</td>
                <td className="px-3 py-3">{r.freeSends}</td>
                <td className="px-3 py-3">{r.entryPaid}</td>
                <td className="px-3 py-3">{r.includedContacts}</td>
                <td className="px-3 py-3">{r.includedSends}</td>
                <td className="px-3 py-3">{r.sms}</td>
                <td className="px-3 py-3">{r.automations}</td>
                <td className="px-3 py-3">{r.brandRemoval}</td>
                <td className="px-3 py-3">{r.pricingModel}</td>
                <td className="px-3 py-3">{r.bestFor}</td>
                <td className="px-3 py-3 whitespace-nowrap">{r.lastVerified}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-ink/55">{matrixDisclaimer()}</p>

      <div className="mt-14">
        <PricingComparisonCalculator />
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
