import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/components/marketing/json-ld";
import { getCompetitor } from "@/data/competitors";
import { PLANS } from "@/lib/plans";

export const metadata = marketingPageMeta({
  title: "MailerLite alternative for small businesses",
  description:
    "Looking for a MailerLite alternative? SendFable focuses on simple campaigns, transparent Free and paid limits, and managed SES delivery for small businesses.",
  path: "/mailerlite-alternative",
});

export default function MailerLiteAlternativePage() {
  const ml = getCompetitor("mailerlite")!;
  const faqs = [
    {
      q: "Is SendFable a MailerLite alternative?",
      a: "Yes for teams that mainly need permission-based lists, campaigns, forms, and clear pricing. MailerLite may still win if you prefer their specific builder, website tools, or automation style.",
    },
    {
      q: "How does the Free plan compare?",
      a: `SendFable Free includes up to ${PLANS.FREE.contactCap.toLocaleString()} contacts and ${PLANS.FREE.emailsPerMonth.toLocaleString()} emails/month with a small footer badge. MailerLite Free limits change — confirm on their pricing page. Snapshot last checked ${ml.pricingLastChecked}.`,
    },
    {
      q: "Can I switch from MailerLite?",
      a: "Export consented contacts as CSV, clean suppressions, import into SendFable, verify your sender, then send a small test segment before canceling MailerLite.",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "MailerLite alternative", path: "/mailerlite-alternative" },
        ])}
      />
      <JsonLd data={faqJsonLd(faqs)} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "MailerLite alternative", href: "/mailerlite-alternative", current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
        MailerLite alternative: simple email without suite sprawl
      </h1>
      <p className="mt-4 text-lg text-ink/75">
        Direct answer: SendFable is a strong MailerLite alternative when you want a narrow product —
        contacts, campaigns, forms, analytics — with published Free and Starter (${PLANS.STARTER.monthlyPrice}/mo)
        limits. Stay on MailerLite if you already rely on their websites, automations, or ecommerce-adjacent tools.
      </p>
      <p className="mt-2 text-sm text-ink/55">Competitor pricing last checked {ml.pricingLastChecked}.</p>

      <section className="mt-10 space-y-4 text-sm text-slate-700">
        <h2 className="text-xl font-semibold text-ink">Practical differences</h2>
        <p>
          MailerLite is a capable ESP with a polished editor and a free tier. SendFable competes on
          clarity: plan caps you can read, managed Amazon SES delivery, and a small-business send
          workflow (Send Confidence, From verification, one-click unsubscribe).
        </p>
        <p>
          We do not claim to match every MailerLite feature. We claim a shorter path from “I have a
          list” to “I sent this week’s email.”
        </p>
        <p>
          Full dated comparison:{" "}
          <Link className="text-coral hover:underline" href="/compare/mailerlite">
            SendFable vs MailerLite
          </Link>
          .
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">FAQ</h2>
        <div className="mt-6">
          <Faq items={faqs} />
        </div>
      </section>
      <MarketingCta
        secondaryHref="/compare/mailerlite"
        secondaryLabel="See comparison table"
      />
    </div>
  );
}
