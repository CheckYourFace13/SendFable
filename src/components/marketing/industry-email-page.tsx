import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { Faq } from "@/components/marketing/faq";
import { MarketingCta } from "@/components/marketing/marketing-cta";
import { marketingPageMeta, JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/components/marketing/json-ld";

const INDUSTRIES: Record<
  string,
  {
    path: string;
    title: string;
    lead: string;
    ideas: string[];
    solutionHref: string;
    faqs: { q: string; a: string }[];
  }
> = {
  local: {
    path: "/email-marketing-for-local-business",
    title: "Email marketing for local business",
    lead: "Direct answer: collect emails at the counter or online with clear consent, send useful updates (hours, offers, appointments), and keep frequency honest — usually a few times a month, not daily.",
    ideas: [
      "Weather-related schedule changes",
      "Loyalty thank-you to opted-in regulars",
      "Seasonal service window reminders",
    ],
    solutionHref: "/solutions/professional-services",
    faqs: [
      {
        q: "How often should a local business email?",
        a: "Enough to be useful, rare enough to stay welcome. Many local lists do well with 2–4 thoughtful emails per month.",
      },
    ],
  },
  restaurants: {
    path: "/email-marketing-for-restaurants",
    title: "Email marketing for restaurants",
    lead: "Direct answer: use email for specials, events, and catering — not for blasting purchased lists. Pair hosted signup with a clear benefit (first to know about wine dinners, etc.).",
    ideas: [
      "Chef’s tasting announcement",
      "Brunch hours change",
      "Private dining availability for holidays",
    ],
    solutionHref: "/solutions/restaurants",
    faqs: [
      {
        q: "Should restaurants text instead?",
        a: "SMS can work for last-minute covers, but SendFable SMS is not publicly available yet. Email remains the live channel.",
      },
    ],
  },
  breweries: {
    path: "/email-marketing-for-breweries",
    title: "Email marketing for breweries",
    lead: "Direct answer: release calendars, taproom events, and membership updates perform well when subscribers opted in for beer news — keep the tone local and specific.",
    ideas: [
      "Limited release drop time",
      "Trivia night reminder",
      "Crowler/club pickup window",
    ],
    solutionHref: "/solutions/breweries",
    faqs: [
      {
        q: "Can I email people from a festival list?",
        a: "Only with clear consent for ongoing brewery email. Event one-offs are not a blank check for marketing.",
      },
    ],
  },
  retail: {
    path: "/email-marketing-for-retail",
    title: "Email marketing for retail",
    lead: "Direct answer: retail email works when offers are real and segments are tight (new arrivals vs clearance). Avoid daily blasts that train people to ignore you.",
    ideas: [
      "New arrivals for a specific category",
      "Local pickup window for online holds",
      "End-of-season clear-out with honest stock notes",
    ],
    solutionHref: "/solutions/retail",
    faqs: [
      {
        q: "Do I need ecommerce automation?",
        a: "If you run a serious online store, Omnisend/Klaviyo may fit better. SendFable fits shop updates and local retail promos.",
      },
    ],
  },
  "real-estate": {
    path: "/email-marketing-for-real-estate",
    title: "Email marketing for real estate",
    lead: "Direct answer: stay useful — market snapshots, new listings for opted-in buyers/sellers, and closing anniversaries. Avoid spammy “just sold” blasts to cold lists.",
    ideas: [
      "Neighborhood monthly snapshot",
      "Open house reminder to warm leads who opted in",
      "Past-client anniversary check-in",
    ],
    solutionHref: "/solutions/real-estate",
    faqs: [
      {
        q: "Is this a CRM replacement?",
        a: "No. Keep your CRM for pipelines; use SendFable for permission-based email.",
      },
    ],
  },
  nonprofits: {
    path: "/email-marketing-for-nonprofits",
    title: "Email marketing for nonprofits",
    lead: "Direct answer: lead with impact, ask clearly, thank promptly. Segment donors, volunteers, and event attendees when consent allows.",
    ideas: [
      "Peer-to-peer fundraiser kickoff",
      "Volunteer orientation reminder",
      "Impact story after a campaign closes",
    ],
    solutionHref: "/solutions/nonprofits",
    faqs: [
      {
        q: "Can we buy nonprofit email lists?",
        a: "No. Purchased lists harm deliverability and trust — and are not allowed.",
      },
    ],
  },
  events: {
    path: "/email-marketing-for-events",
    title: "Email marketing for events",
    lead: "Direct answer: confirm registration, share logistics, and send a short follow-up. Keep each email to one primary action.",
    ideas: [
      "Day-before logistics (parking, entry)",
      "Schedule change alert",
      "Post-event thank you + photo album link",
    ],
    solutionHref: "/solutions/local-events",
    faqs: [
      {
        q: "Should every attendee stay on the marketing list?",
        a: "Only with consent for ongoing email. Registration for one event is not forever permission.",
      },
    ],
  },
};

export function IndustryEmailPage({ id }: { id: keyof typeof INDUSTRIES }) {
  const d = INDUSTRIES[id];
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: d.title, path: d.path }])} />
      <JsonLd data={faqJsonLd(d.faqs)} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: d.title, href: d.path, current: true },
        ]}
      />
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">{d.title}</h1>
      <p className="mt-4 text-lg text-ink/75">{d.lead}</p>
      <h2 className="mt-10 text-xl font-semibold">Ideas to try</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
        {d.ideas.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
      <p className="mt-8 text-sm">
        <Link className="text-coral hover:underline" href={d.solutionHref}>
          Industry solution page
        </Link>{" "}
        ·{" "}
        <Link className="text-coral hover:underline" href="/templates">
          Templates
        </Link>{" "}
        ·{" "}
        <Link className="text-coral hover:underline" href="/pricing">
          Pricing
        </Link>
      </p>
      <section className="mt-12">
        <h2 className="text-2xl font-bold">FAQ</h2>
        <div className="mt-6">
          <Faq items={d.faqs} />
        </div>
      </section>
      <MarketingCta />
    </div>
  );
}

export function industryMeta(id: keyof typeof INDUSTRIES) {
  const d = INDUSTRIES[id];
  return marketingPageMeta({
    path: d.path,
    title: d.title,
    description: d.lead.slice(0, 155),
  });
}
