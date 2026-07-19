import { SolutionPage } from "@/components/marketing/solution-page";

export const metadata = {
  title: "Email marketing for breweries",
  description:
    "Email for breweries and taprooms: release alerts, tasting events, and membership updates on Sendfable.",
};

export default function BreweriesSolutionPage() {
  return (
    <SolutionPage
      industry="Breweries"
      path="/solutions/breweries"
      title="Email marketing for breweries & taprooms"
      intro="Taproom regulars want drop times and event details — not endless brand fluff. Sendfable keeps release notes and membership updates straightforward and affordable."
      challenges={[
        {
          title: "Drops sell out in hours",
          body: "Mail your can-club and IPA fans as soon as the date is firm. A clear subject beats a pretty PDF nobody opens.",
        },
        {
          title: "Mixed audiences",
          body: "Wholesale accounts, tourists, and locals need different messages. Tags keep distribution notes out of tourist inboxes.",
        },
        {
          title: "Compliance still applies",
          body: "Age-gated offers and alcohol marketing rules vary by region. Keep copy accurate and unsubscribe easy.",
        },
      ]}
      plays={[
        "Release calendar with pickup windows",
        "Tap takeover and live music reminders",
        "Membership renewal and benefit refreshers",
        "Limited collab announcements to interest tags",
      ]}
      faqs={[
        {
          q: "Can we use our brewery domain?",
          a: "Yes on Growth and Pro with DKIM authentication. Until then, verify individual From addresses.",
        },
        {
          q: "Do you handle SMS for drop day?",
          a: "Email only today. Pair with whatever SMS tool you already use.",
        },
        {
          q: "How do we import Untappd or POS emails?",
          a: "Only import addresses you have permission to use. CSV map tags like “can-club” or “events.”",
        },
      ]}
    />
  );
}
