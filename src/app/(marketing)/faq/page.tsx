import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd } from "@/components/marketing/json-ld";
import { PLANS } from "@/lib/plans";
import { autopilotMaxDraftsPerMonth } from "@/lib/autopilot/plans";
import { isSmsPublicEnabled } from "@/lib/sms/flags";
import { SENDFABLE_FACTS } from "@/data/sendfable-facts";

export const metadata = marketingPageMeta({
  title: "FAQ — Email, text & Marketing Autopilot",
  description:
    "Answers about SendFable’s free plan, Email/Text/Both, Marketing Autopilot, forms, domains, limits, SMS activation, and cancellation.",
  path: "/faq",
});

export default function FaqPage() {
  const smsPublic = isSmsPublicEnabled();
  const items = [
    {
      q: "What is SendFable?",
      a: "SendFable is simple email and text marketing for small businesses: contacts, campaigns, templates, forms, Marketing Autopilot, and managed delivery — without a giant CRM suite.",
    },
    {
      q: "Is there a free plan?",
      a: `Yes. Free includes up to ${PLANS.FREE.contactCap.toLocaleString()} contacts and ${PLANS.FREE.emailsPerMonth.toLocaleString()} emails per month, with a “Powered by SendFable” footer. No credit card required to start.`,
    },
    {
      q: "Can I send email and text?",
      a: smsPublic
        ? "Yes. After Text Messaging is set up, one campaign can send Email, Text, or Both. Text has its own consent, STOP/HELP, and pricing. Email-only accounts stay email-only."
        : SENDFABLE_FACTS.smsStatus.publicAnswer,
    },
    {
      q: "Do I need a credit card?",
      a: "No. You can create an account and use the Free plan without a card. A card is only needed when you upgrade or purchase Text Messaging.",
    },
    {
      q: "What is Marketing Autopilot?",
      a: "Marketing Autopilot watches a page on your website and creates a campaign. You decide what happens next: Approve & Schedule, Edit, or Skip this campaign. Nothing sends until you schedule it.",
    },
    {
      q: "Does Autopilot send automatically?",
      a: "No. Approve & Schedule, Edit, or Skip this campaign. If you do nothing, nothing sends. The draft stays waiting for you. At most one reminder.",
    },
    {
      q: "Can I import contacts?",
      a: "Yes. Import a CSV with field mapping, or use migration guides for common exports. Only import people you have permission to email. Purchased lists are not allowed.",
    },
    {
      q: "Can I collect contacts with forms?",
      a: "Yes. Hosted signup forms can grow a consented list, with optional double opt-in. Forms can collect email and, when Text is enabled, phone with proper consent.",
    },
    {
      q: "Can I use my own sending domain?",
      a: "Custom domain authentication is available on Growth and above. You can always verify a From address to start — Gmail and Outlook work with From-rewrite when needed.",
    },
    {
      q: "What happens when I reach a plan limit?",
      a: "Your contacts and past campaigns stay put. You’ll see a clear upgrade prompt when you hit contact or monthly email limits. Autopilot stops creating new drafts when you hit that month’s draft allowance until you upgrade or the month resets.",
    },
    {
      q: "What does SMS activation cost?",
      a: smsPublic
        ? "Text Messaging is a separate add-on with an activation/setup fee plus plan pricing for included segments. See /pricing for current Text Messaging details and any promo such as TEXT20."
        : "Text Messaging is not publicly available yet. Email plans do not require SMS.",
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. Paid subscriptions can be canceled from billing / the customer portal. You keep access through the paid period; Free-plan limits apply afterward.",
    },
    {
      q: "How many Autopilot drafts do I get?",
      a: `Free does not permanently include Marketing Autopilot. Start a 3-month free trial for 1 automatically created campaign per month. Unused trial creations do not roll over. Starter includes ${autopilotMaxDraftsPerMonth("STARTER")} a month, Growth ${autopilotMaxDraftsPerMonth("GROWTH")}, Pro ${autopilotMaxDraftsPerMonth("PRO")}, and Pro Plus ${autopilotMaxDraftsPerMonth("PRO_PLUS")}.`,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "FAQ", path: "/faq" },
        ])}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "FAQ", href: "/faq", current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">FAQ</h1>
      <p className="mt-3 text-lg text-ink/70">
        Straight answers about plans, Email/Text/Both, Autopilot, and limits. For deeper how-tos, see{" "}
        <Link href="/guides" className="text-coral underline-offset-2 hover:underline">
          Guides
        </Link>{" "}
        and{" "}
        <Link href="/resources" className="text-coral underline-offset-2 hover:underline">
          Resources
        </Link>
        .
      </p>
      <div className="mt-10">
        <Faq items={items} />
      </div>
      <MarketingCta
        title="Ready to try SendFable?"
        body="Start free — no credit card. Upgrade when your list or Autopilot needs more room."
        primaryLabel="Start free"
      />
    </div>
  );
}
