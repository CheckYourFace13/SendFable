import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/components/marketing/json-ld";
import { getCompetitor } from "@/data/competitors";
import { PLANS } from "@/lib/plans";

export const metadata = marketingPageMeta({
  title: "Constant Contact alternative for small businesses",
  description:
    "Considering a Constant Contact alternative? SendFable is simple email marketing with a free plan, clear limits, and managed delivery — without suite lock-in.",
  path: "/constant-contact-alternative",
});

export default function ConstantContactAlternativePage() {
  const cc = getCompetitor("constant-contact")!;
  const faqs = [
    {
      q: "Is SendFable a good Constant Contact alternative?",
      a: "Yes if you want self-serve campaigns, transparent Free and paid limits, and managed Amazon SES delivery. Constant Contact may still fit if you want their phone-assisted support model or event add-ons.",
    },
    {
      q: "How does pricing compare?",
      a: `SendFable Free includes ${PLANS.FREE.contactCap.toLocaleString()} contacts and ${PLANS.FREE.emailsPerMonth.toLocaleString()} emails/month. Starter is $${PLANS.STARTER.monthlyPrice}/mo. Constant Contact pricing changes by contact tier and add-ons — verify on their site. Our comparison snapshot was last checked ${cc.pricingLastChecked}.`,
    },
    {
      q: "Can I import my Constant Contact list?",
      a: "Yes. Export a permissioned CSV, clean unsubscribed rows, and import into SendFable. Do not buy or scrape lists.",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Constant Contact alternative", path: "/constant-contact-alternative" },
        ])}
      />
      <JsonLd data={faqJsonLd(faqs)} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Constant Contact alternative", href: "/constant-contact-alternative", current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
        A Constant Contact alternative for simple email
      </h1>
      <p className="mt-4 text-lg text-ink/75">
        Direct answer: Choose SendFable when you want contacts, campaigns, and clear pricing without
        paying for a larger marketing suite. Choose Constant Contact when you specifically want their
        assisted support reputation or local-business add-ons.
      </p>
      <p className="mt-2 text-sm text-ink/55">Competitor pricing last checked {cc.pricingLastChecked}.</p>

      <section className="mt-10 grid gap-6 sm:grid-cols-2 text-sm">
        <div>
          <h2 className="text-lg font-semibold">Where SendFable fits</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
            {cc.sendfableStronger.map((s) => (
              <li key={s}>{s}</li>
            ))}
            <li>Free plan with published contact and send caps</li>
            <li>Managed delivery — you do not bring your own SES account</li>
          </ul>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Where Constant Contact may fit better</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
            {cc.competitorStronger.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-12 text-sm text-slate-700">
        <h2 className="text-xl font-semibold text-ink">What you get on SendFable</h2>
        <p className="mt-3">
          Import a consented list, verify a From address, write a campaign, check Send Confidence,
          and send. Starter is ${PLANS.STARTER.monthlyPrice}/mo for up to{" "}
          {PLANS.STARTER.contactCap.toLocaleString()} contacts. Custom domain authentication starts
          on Growth.
        </p>
        <p className="mt-3">
          See the dated side-by-side at{" "}
          <Link className="text-coral hover:underline" href="/compare/constant-contact">
            /compare/constant-contact
          </Link>{" "}
          and always verify Constant Contact’s current calculator on their site.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">FAQ</h2>
        <div className="mt-6">
          <Faq items={faqs} />
        </div>
      </section>
      <MarketingCta
        title="Try SendFable on your list size"
        body="Start free, import a cleaned CSV, and send a small campaign this week."
        secondaryHref="/compare/constant-contact"
        secondaryLabel="Full comparison"
      />
    </div>
  );
}
