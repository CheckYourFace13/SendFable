import Link from "next/link";
import Image from "next/image";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd } from "@/components/marketing/json-ld";
import { PLANS } from "@/lib/plans";
import { autopilotMaxDraftsPerMonth } from "@/lib/autopilot/plans";
import { isSmsPublicEnabled } from "@/lib/sms/flags";

export const metadata = marketingPageMeta({
  title: "Email, Text & Marketing Automation Features",
  description:
    "SendFable features: Email, Text, or Both campaigns, forms, templates, Marketing Autopilot, owner approval, contacts, reports, Send Confidence, and clear Free-plan branding.",
  path: "/features",
  image: "/product/autopilot-feature-page.webp",
});

type Feature = {
  id: string;
  title: string;
  body: string;
  href?: string;
};

export default function FeaturesPage() {
  const smsPublic = isSmsPublicEnabled();

  const features: Feature[] = [
    {
      id: "email",
      title: "Email campaigns",
      body: "Write, schedule, pause, and send with merge tags, previews, and one-click unsubscribe built in. Delivery runs on managed Amazon SES — you design and launch.",
    },
    ...(smsPublic
      ? [
          {
            id: "text",
            title: "Text messaging",
            body: "Add Text Messaging when you’re ready. Consent, STOP, HELP, and suppression are part of the flow — not an afterthought.",
            href: "/pricing",
          } satisfies Feature,
          {
            id: "both",
            title: "Email, Text, or Both",
            body: "One contact list and one campaign can send Email, Text, or Both. Pick the channel that fits the message — without juggling separate tools.",
          } satisfies Feature,
        ]
      : []),
    {
      id: "forms",
      title: "Forms",
      body: "Hosted signup forms grow a consented list without leaving your brand. Optional double opt-in when you want extra confirmation.",
      href: "/features#forms",
    },
    {
      id: "templates",
      title: "Templates",
      body: "Start from industry-ready templates for announcements, offers, and welcome notes — then edit in Simple Mode or the drag-and-drop builder.",
      href: "/templates",
    },
    {
      id: "autopilot",
      title: "Marketing Autopilot",
      body: `Watch one page on your site. When specials or events change, SendFable drafts a campaign. Free: weekly / ${autopilotMaxDraftsPerMonth("FREE")} drafts a month. Starter: daily / ${autopilotMaxDraftsPerMonth("STARTER")}. Growth+: twice daily / ${autopilotMaxDraftsPerMonth("GROWTH")}.`,
      href: "/automated-email-marketing",
    },
    {
      id: "website-campaign",
      title: "Website → Campaign",
      body: "Meaningful page changes become draft emails with relevant copy. No busywork rewriting the same special twice.",
      href: "/automated-email-marketing",
    },
    {
      id: "approval",
      title: "Owner approval",
      body: "Approve & Send, Edit, or Don’t Send. No response always means no send. At most one reminder while a draft waits.",
    },
    {
      id: "contacts",
      title: "Contact management",
      body: "CSV import with mapping, tags, segments, and bounce/complaint suppression. Purchased lists are not allowed.",
    },
    {
      id: "reports",
      title: "Reports",
      body: "Opens, clicks, bounces, complaints, and link performance — enough to know what worked without a BI project.",
    },
    {
      id: "confidence",
      title: "Send Confidence",
      body: "Pre-flight checks before launch so missing unsubscribes, thin content, or risky setups surface early.",
    },
    {
      id: "branding",
      title: "Free-plan branding",
      body: `Free includes up to ${PLANS.FREE.contactCap.toLocaleString()} contacts and ${PLANS.FREE.emailsPerMonth.toLocaleString()} emails/month with a “Sent with SendFable” footer. Paid plans remove the badge.`,
      href: "/pricing",
    },
    ...(smsPublic
      ? [
          {
            id: "sms-setup",
            title: "SMS setup",
            body: "Activation, compliance profile, and number assignment are guided in-app. Text stays separate from email plan limits.",
            href: "/pricing",
          } satisfies Feature,
        ]
      : []),
    {
      id: "scheduling",
      title: "Campaign scheduling",
      body: "Schedule sends for later, pause in flight when supported, and cancel before launch when plans change.",
    },
    {
      id: "audience",
      title: "Audience tools",
      body: "Tags, visual segments, and clean imports so the right people get the right story.",
    },
    {
      id: "builder",
      title: "Email builder",
      body: "Blocks for heading, text, image, button, columns, and social — plus a mandatory compliant footer.",
    },
    {
      id: "deliverability",
      title: "Deliverability",
      body: "Managed SES delivery with smart From-rewrite for strict Gmail/Yahoo-style sender domains. Reply-To stays yours.",
      href: "/deliverability",
    },
    {
      id: "signup",
      title: "Any-email signup",
      body: "Password or magic link. No Google or Microsoft account required — ever.",
    },
    {
      id: "senders",
      title: "Sender identities",
      body: "Verify any From address. Growth+ can authenticate your own domain.",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Features", path: "/features" },
        ])}
      />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Features", href: "/features", current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
        Email, text &amp; marketing automation features
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-ink/70">
        Everything you need to grow a permission-based audience and send campaigns that feel personal
        — without suite sprawl.
      </p>

      <figure className="mt-10 overflow-hidden rounded-xl border border-ink/10 bg-parchment/40">
        <Image
          src="/product/autopilot-feature-page.webp"
          alt="Marketing Autopilot turning a website special into an approved SendFable campaign"
          width={1200}
          height={720}
          className="h-auto w-full"
          priority
        />
        <figcaption className="px-4 py-3 text-left text-sm text-ink/60">
          Marketing Autopilot: website change → draft → your approval.{" "}
          <Link href="/automated-email-marketing" className="text-coral underline-offset-2 hover:underline">
            See how it works
          </Link>
        </figcaption>
      </figure>

      <div className="mt-14 grid gap-8 sm:grid-cols-2">
        {features.map((s) => (
          <div key={s.id} id={s.id} className="scroll-mt-28">
            <h2 className="text-lg font-semibold text-ink">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/65">{s.body}</p>
            {s.href && s.href !== `/features#${s.id}` ? (
              <Link
                href={s.href}
                className="mt-2 inline-block text-sm text-coral underline-offset-2 hover:underline"
              >
                Learn more
              </Link>
            ) : null}
          </div>
        ))}
      </div>

      <MarketingCta
        title="See it in your account"
        body="Start free — no credit card. Add contacts, pick Email/Text/Both when available, and send."
        primaryLabel="Start free"
      />
    </div>
  );
}
