import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/components/marketing/json-ld";

export const metadata = marketingPageMeta({
  title: "Mailchimp alternative for nonprofits",
  description:
    "Simple email for nonprofits: appeals, event reminders, volunteer updates — without paying for a suite you will not use.",
  path: "/mailchimp-alternative-for-nonprofits",
});

export default function Page() {
  const faqs = [
    {
      q: "Can nonprofits use the Free plan?",
      a: "Yes if you stay within Free contact and monthly email caps. Upgrade when the list or send volume grows.",
    },
    {
      q: "Is Mailchimp better for donation journeys?",
      a: "Possibly, if you need complex multi-step fundraising automations. SendFable fits clear campaign appeals and updates.",
    },
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Mailchimp alternative for nonprofits", path: "/mailchimp-alternative-for-nonprofits" },
        ])}
      />
      <JsonLd data={faqJsonLd(faqs)} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Nonprofits", href: "/mailchimp-alternative-for-nonprofits", current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
        Mailchimp alternative for nonprofits
      </h1>
      <p className="mt-4 text-lg text-ink/75">
        Direct answer: SendFable may be the better fit when your nonprofit needs permission-based
        appeals, event reminders, and volunteer updates with transparent pricing. Mailchimp may be
        better when you need advanced fundraising journeys or a large integration set.
      </p>
      <h2 className="mt-10 text-xl font-semibold">Nonprofit campaign examples</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
        <li>Year-end appeal with one donation link and a short story</li>
        <li>Volunteer shift reminder with location and arrival notes</li>
        <li>Impact update after a fundraiser — photos + thank you</li>
        <li>Board meeting summary for a consented leadership list</li>
      </ul>
      <p className="mt-8 text-sm">
        Also see{" "}
        <Link className="text-coral hover:underline" href="/solutions/nonprofits">
          nonprofit solutions
        </Link>{" "}
        and{" "}
        <Link className="text-coral hover:underline" href="/compare/mailchimp">
          Mailchimp comparison
        </Link>
        .
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
