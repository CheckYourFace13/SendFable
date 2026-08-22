import { PLANS } from "@/lib/plans";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta } from "@/components/marketing/json-ld";

export const metadata = marketingPageMeta({
  title: "Sendfable vs Mailchimp",
  description:
    "Side-by-side Sendfable vs Mailchimp: pricing estimates, From-rewrite for Gmail/Yahoo, free plan limits, and honest trade-offs. Verify Mailchimp pricing on their site.",
  path: "/vs/mailchimp",
});

const ROWS = [
  ["Any email signup (no Google/Microsoft OAuth)", "Yes", "Yes (with OAuth options pushed)"],
  ["Own ESP infrastructure (SES)", "Yes — platform SES", "Mailchimp delivers"],
  ["From-rewrite for Gmail/Yahoo DMARC", "Yes, automatic", "Typically requires custom domain"],
  ["Free plan emails/mo", String(PLANS.FREE.emailsPerMonth), "Limited / promotional"],
  ["Starter ~2.5k contacts", `$${PLANS.STARTER.monthlyPrice}/mo`, "~$45/mo (Standard est.)"],
  ["Growth ~10k contacts", `$${PLANS.GROWTH.monthlyPrice}/mo`, "~$105/mo (Standard est.)"],
  ["Drag-and-drop builder", "Yes", "Yes"],
  ["One-click unsubscribe (RFC 8058)", "Yes", "Yes"],
  ["Auto-pause on high bounce/complaint", "Yes", "Account monitoring"],
  ["Purchased lists allowed", "Never", "Prohibited"],
];

export default function VsMailchimpPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Compare", href: "/compare" },
          { label: "vs Mailchimp", href: "/vs/mailchimp", current: true },
        ]}
      />
      <h1 className="text-4xl font-bold tracking-tight">Sendfable vs Mailchimp</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Mailchimp is a mature platform with a large app marketplace. Sendfable is narrower: contacts,
        campaigns, and managed SES delivery at a lower list price for many small-business tiers.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild className="bg-coral-solid text-white hover:bg-coral-hover">
          <Link href="/signup">Start writing free</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/compare/mailchimp">Full pricing comparison</Link>
        </Button>
      </div>

      <div className="mt-10 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-semibold">Capability</th>
              <th className="px-4 py-3 font-semibold text-ink">Sendfable</th>
              <th className="px-4 py-3 font-semibold">Mailchimp</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([cap, sf, mc]) => (
              <tr key={cap} className="border-b last:border-0">
                <td className="px-4 py-3">{cap}</td>
                <td className="px-4 py-3">{sf}</td>
                <td className="px-4 py-3 text-muted-foreground">{mc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Mailchimp prices as of 2026 estimates for Standard plan by contact tier — verify on
        mailchimp.com. Features change over time. See also{" "}
        <Link className="text-coral hover:underline" href="/switch-from-mailchimp">
          switching from Mailchimp
        </Link>{" "}
        and{" "}
        <Link className="text-coral hover:underline" href="/guides/mailchimp-vs-sendfable-pricing">
          dated pricing notes
        </Link>
        .
      </p>
      <MarketingCta
        title="Try Sendfable on your list size"
        body="Free plan: 500 contacts and 1,000 emails/month. Upgrade when you outgrow it."
        secondaryHref="/pricing"
        secondaryLabel="See all plans"
      />
    </div>
  );
}
