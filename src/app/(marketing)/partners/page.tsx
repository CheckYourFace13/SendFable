import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/components/marketing/json-ld";
import { PartnerApplyForm } from "@/components/marketing/partner-apply-form";

export const metadata = marketingPageMeta({
  title: "Partners — designers, agencies, and local advisors",
  description:
    "Refer clients to SendFable for simple, permission-based email marketing. No white-label promise. No recurring commission unless separately approved.",
  path: "/partners",
});

const FAQS = [
  {
    q: "Is this a white-label program?",
    a: "No. Clients use SendFable as SendFable. We do not promise white-label branding unless that product exists and is approved.",
  },
  {
    q: "Do partners earn recurring commissions?",
    a: "Not by default. Any recurring payout requires a separate written agreement. Today’s program emphasizes referral attribution and migration assistance — not cash multi-level commissions.",
  },
  {
    q: "Who is a good fit?",
    a: "Web designers, small agencies, freelance marketers, restaurant and brewery consultants, chambers, local associations, nonprofit consultants, bookkeepers, and managed IT providers who already advise small businesses.",
  },
];

export default function PartnersPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Partners", path: "/partners" },
        ])}
      />
      <JsonLd data={faqJsonLd(FAQS)} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Partners", href: "/partners", current: true },
        ]}
      />
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Partners</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-ink">
        Partner with SendFable
      </h1>
      <p className="mt-4 text-lg text-ink/75">
        Help clients run permission-based email without forcing a CRM. Referrals are attributed;
        rewards stay inactive until economics and Stripe credits are owner-approved.
      </p>

      <section className="mt-10 space-y-4 text-sm text-slate-700">
        <h2 className="text-xl font-semibold text-ink">Benefits (honest)</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Clear product story for small businesses who outgrew inbox CC lists</li>
          <li>Documented Mailchimp migration path for permissioned contacts</li>
          <li>Unique referral URL once your application is approved</li>
          <li>Agency/client boundary: each client keeps their own workspace</li>
        </ul>
      </section>

      <section className="mt-10 space-y-4 text-sm text-slate-700">
        <h2 className="text-xl font-semibold text-ink">How referral works</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Apply below — we review fit manually.</li>
          <li>Share your referral link after approval.</li>
          <li>Attributed signups appear in admin reporting.</li>
          <li>Account credits (if any) activate only after owner approval of the referral program.</li>
        </ol>
        <p>
          Migration assistance means guidance and import tooling — not a promise to import data the
          customer lacks permission to use.{" "}
          <Link className="text-coral underline" href="/migrate/mailchimp">
            Mailchimp migration guide
          </Link>
          .
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-ink">Apply</h2>
        <p className="mt-2 text-sm text-ink/70">We do not scrape directories. Outreach stays off until you approve sends.</p>
        <div className="mt-6">
          <PartnerApplyForm />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">FAQ</h2>
        <div className="mt-6">
          <Faq items={FAQS} />
        </div>
      </section>
      <MarketingCta />
    </div>
  );
}
