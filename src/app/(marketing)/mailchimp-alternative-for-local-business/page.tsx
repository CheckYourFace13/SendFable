import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/components/marketing/json-ld";

export const metadata = marketingPageMeta({
  title: "Mailchimp alternative for local business",
  description:
    "Local businesses often outgrow complexity before they outgrow email. SendFable keeps campaigns, lists, and pricing simple.",
  path: "/mailchimp-alternative-for-local-business",
});

export default function Page() {
  const faqs = [
    {
      q: "Is this different from the restaurant page?",
      a: "Yes — this page covers general local service and retail patterns (appointments, hours, seasonal promos), not kitchen-specific plays.",
    },
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Local business", path: "/mailchimp-alternative-for-local-business" },
        ])}
      />
      <JsonLd data={faqJsonLd(faqs)} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Local business", href: "/mailchimp-alternative-for-local-business", current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
        Mailchimp alternative for local business
      </h1>
      <p className="mt-4 text-lg text-ink/75">
        Direct answer: if your local business mainly sends hours updates, seasonal promos, and
        appointment reminders to a permission-based list, SendFable may be the better fit. Choose
        Mailchimp when you need suite-level automations or a large integration marketplace.
      </p>
      <h2 className="mt-10 text-xl font-semibold">Local workflow ideas</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
        <li>Storm closure / holiday hours with one clear CTA</li>
        <li>Seasonal service window (HVAC, landscaping, tax season)</li>
        <li>Referral thank-you to past customers who opted in</li>
        <li>New location or parking change announcement</li>
      </ul>
      <p className="mt-8 text-sm">
        <Link className="text-coral hover:underline" href="/solutions/professional-services">
          Local email marketing guide
        </Link>{" "}
        ·{" "}
        <Link className="text-coral hover:underline" href="/mailchimp-alternative">
          Main Mailchimp alternative
        </Link>
      </p>
      <section className="mt-12">
        <h2 className="text-2xl font-bold">FAQ</h2>
        <div className="mt-6">
          <Faq items={faqs} />
        </div>
      </section>
      <MarketingCta />
    </div>
  );
}
