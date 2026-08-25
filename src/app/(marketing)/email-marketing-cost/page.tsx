import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/components/marketing/json-ld";
import { PLANS, PLAN_ORDER } from "@/lib/plans";

export const metadata = marketingPageMeta({
  title: "Email marketing cost for a small business",
  description: `What email marketing costs for a small business in 2026: SendFable Free (${PLANS.FREE.contactCap} contacts), Starter $${PLANS.STARTER.monthlyPrice}/mo, and how contact tiers drive price elsewhere.`,
  path: "/email-marketing-cost",
});

const FAQS = [
  {
    q: "How much does email marketing cost?",
    a: `On SendFable: Free is $0 (up to ${PLANS.FREE.contactCap.toLocaleString()} contacts / ${PLANS.FREE.emailsPerMonth.toLocaleString()} emails/mo). Paid plans start at $${PLANS.STARTER.monthlyPrice}/mo. Other ESPs often price by contact tier — always check their calculator.`,
  },
  {
    q: "What else costs money besides the plan?",
    a: "Your time to write emails, optional design help, and domain email/hosting you already pay for. Avoid “cheap” tools that ignore list hygiene — reputation damage is the expensive part.",
  },
  {
    q: "Is free email marketing enough?",
    a: `Often yes for a new list. Free on SendFable covers ${PLANS.FREE.contactCap.toLocaleString()} contacts. Upgrade when you hit the contact or monthly email cap.`,
  },
];

export default function EmailMarketingCostPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Email marketing cost", path: "/email-marketing-cost" },
        ])}
      />
      <JsonLd data={faqJsonLd(FAQS)} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Email marketing cost", href: "/email-marketing-cost", current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
        What email marketing costs for a small business
      </h1>
      <p className="mt-4 text-lg text-ink/75">
        Direct answer: Start at $0 on SendFable’s Free plan. When you outgrow it, Starter is $
        {PLANS.STARTER.monthlyPrice}/month. Most tools charge more as your contact list grows — so
        the real cost driver is list size, not “how fancy the editor looks.”
      </p>

      <section className="mt-10 overflow-x-auto rounded-xl border bg-white text-sm">
        <table className="w-full text-left">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-4 py-3">SendFable plan</th>
              <th className="px-4 py-3">Monthly</th>
              <th className="px-4 py-3">Contacts</th>
              <th className="px-4 py-3">Emails/mo</th>
            </tr>
          </thead>
          <tbody>
            {PLAN_ORDER.map((key) => {
              const p = PLANS[key];
              return (
                <tr key={key} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">{p.monthlyPrice === 0 ? "$0" : `$${p.monthlyPrice}`}</td>
                  <td className="px-4 py-3">{p.contactCap.toLocaleString()}</td>
                  <td className="px-4 py-3">{p.emailsPerMonth.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <p className="mt-3 text-xs text-muted-foreground">
        Allowances reset each calendar month (UTC). Unused sends do not roll over. Annual billing
        saves two months on paid plans.
      </p>

      <section className="mt-12 space-y-4 text-sm text-slate-700">
        <h2 className="text-xl font-semibold text-ink">Compared with big-name ESPs</h2>
        <p>
          Mailchimp, Constant Contact, and similar tools often look fine at a few hundred contacts
          and then jump when you cross a tier. Use our dated{" "}
          <Link className="text-coral hover:underline" href="/compare/mailchimp">
            Mailchimp comparison
          </Link>{" "}
          and verify every vendor’s live calculator before you decide.
        </p>
        <p>
          Also see{" "}
          <Link className="text-coral hover:underline" href="/cheap-email-marketing">
            cheap email marketing
          </Link>{" "}
          — cheap without hygiene is not a bargain.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">FAQ</h2>
        <div className="mt-6">
          <Faq items={FAQS} />
        </div>
      </section>
      <MarketingCta secondaryHref="/pricing" secondaryLabel="Full pricing page" />
    </div>
  );
}
