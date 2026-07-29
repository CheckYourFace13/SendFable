import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { MailchimpCostCalculator } from "@/components/marketing/mailchimp-cost-calculator";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd } from "@/components/marketing/json-ld";
import { getCompetitor } from "@/data/competitors";
import { PLANS } from "@/lib/plans";

export const metadata = marketingPageMeta({
  title: "Mailchimp pricing alternative",
  description:
    "Compare approximate Mailchimp Standard pricing with SendFable’s published Free–Pro Plus plans. Dated snapshots — verify on each vendor’s site.",
  path: "/mailchimp-pricing-alternative",
});

export default function MailchimpPricingAlternativePage() {
  const mc = getCompetitor("mailchimp")!;
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Mailchimp pricing alternative", path: "/mailchimp-pricing-alternative" },
        ])}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Mailchimp pricing", href: "/mailchimp-pricing-alternative", current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
        Mailchimp pricing alternative
      </h1>
      <p className="mt-4 text-lg text-ink/75">
        Direct answer: SendFable publishes flat plans (Free $0, Starter ${PLANS.STARTER.monthlyPrice},
        Growth ${PLANS.GROWTH.monthlyPrice}, Pro ${PLANS.PRO.monthlyPrice}, Pro Plus $
        {PLANS.PRO_PLUS.monthlyPrice}). Mailchimp Standard pricing scales by contact tier and often
        includes promotions — approximate only as of {mc.pricingLastChecked}.
      </p>

      <h2 className="mt-10 text-xl font-semibold">SendFable published plans</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
        <li>Free — ${PLANS.FREE.monthlyPrice} · {PLANS.FREE.contactCap} contacts · {PLANS.FREE.emailsPerMonth.toLocaleString()} emails/mo</li>
        <li>Starter — ${PLANS.STARTER.monthlyPrice}/mo · {PLANS.STARTER.contactCap.toLocaleString()} contacts</li>
        <li>Growth — ${PLANS.GROWTH.monthlyPrice}/mo · {PLANS.GROWTH.contactCap.toLocaleString()} contacts</li>
        <li>Pro — ${PLANS.PRO.monthlyPrice}/mo · {PLANS.PRO.contactCap.toLocaleString()} contacts</li>
        <li>Pro Plus — ${PLANS.PRO_PLUS.monthlyPrice}/mo · {PLANS.PRO_PLUS.contactCap.toLocaleString()} contacts</li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold">Approximate Mailchimp snapshot</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
        {mc.tiers.map((t) => (
          <li key={t.name}>
            {t.name}: {typeof t.monthlyPrice === "number" ? `$${t.monthlyPrice}/mo` : t.monthlyPrice}
            {t.notes ? ` — ${t.notes}` : ""}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        Source:{" "}
        <a href={mc.pricingUrl} className="underline" rel="noopener noreferrer">
          {mc.pricingUrl}
        </a>
        . Pricing can change.
      </p>

      <div className="mt-10">
        <MailchimpCostCalculator />
      </div>

      <p className="mt-8 text-sm">
        <Link className="text-coral hover:underline" href="/compare/mailchimp">
          Full SendFable vs Mailchimp comparison
        </Link>{" "}
        ·{" "}
        <Link className="text-coral hover:underline" href="/guides/mailchimp-vs-sendfable-pricing">
          Pricing guide
        </Link>
      </p>
      <MarketingCta />
    </div>
  );
}
