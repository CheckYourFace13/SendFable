import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta } from "@/components/marketing/json-ld";

export const metadata = marketingPageMeta({
  title: "Email marketing without CRM",
  description:
    "You do not need a CRM suite to send great email. Use SendFable for campaigns, lists, and forms — keep CRM elsewhere if you need it.",
  path: "/email-marketing-without-crm",
});

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Without CRM", href: "/email-marketing-without-crm", current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
        Email marketing without a CRM
      </h1>
      <p className="mt-4 text-lg text-ink/75">
        Direct answer: many small businesses only need contacts, tags, segments, forms, and campaigns.
        A CRM helps when you manage sales pipelines — it is optional for newsletter and promo email.
      </p>
      <p className="mt-4 text-sm text-slate-700">
        Collect readers with a Signup Tool, make it live free, then send email. Scribe can draft from
        your site content when you are ready. If you need CRM-first platforms, see{" "}
        <Link className="text-coral hover:underline" href="/compare/hubspot">
          HubSpot
        </Link>{" "}
        or{" "}
        <Link className="text-coral hover:underline" href="/compare/engagebay">
          EngageBay
        </Link>
        .
      </p>
      <MarketingCta
        title="Skip the CRM suite"
        body="Try a signup on a sample website first. Free plan. No credit card."
        primaryHref="/try/signup-tool"
        primaryLabel="Try Signup Tool"
        secondaryHref="/signup"
        secondaryLabel="Start free"
      />
    </div>
  );
}
