import { SolutionPage } from "@/components/marketing/solution-page";

export const metadata = {
  title: "Email marketing for local events",
  description:
    "Email for venues and local event organizers: lineup reveals, ticket reminders, and day-of logistics with Sendfable.",
};

export default function LocalEventsSolutionPage() {
  return (
    <SolutionPage
      industry="Local events"
      path="/solutions/local-events"
      title="Email marketing for local events"
      intro="Venues, festivals, and community organizers need timely logistics more than vanity metrics. Sendfable helps you announce lineups and remind ticket holders without enterprise pricing."
      challenges={[
        {
          title: "Short attention windows",
          body: "Announce early, remind twice, then send day-of details. Skip daily teasers that train people to ignore you.",
        },
        {
          title: "Multiple audience types",
          body: "Tag artists, vendors, VIPs, and general admission separately when their information differs.",
        },
        {
          title: "Last-minute changes",
          body: "Keep a template ready for gate times, weather plans, or set-time updates.",
        },
      ]}
      plays={[
        "Lineup or speaker reveals with ticket CTA",
        "Early-bird deadline reminders",
        "Week-of logistics (parking, entry, accessibility)",
        "Post-event thank-you with optional survey or next-date teaser",
      ]}
      faqs={[
        {
          q: "Do you sell tickets?",
          a: "No. Link out to Eventbrite, Dice, your box office, or whatever you already use.",
        },
        {
          q: "Can we mail everyone who ever attended?",
          a: "Only if they consented to ongoing email. Ticket purchase terms vary — when unsure, ask or use a fresh opt-in.",
        },
        {
          q: "What about rain-delay blasts?",
          a: "Send a short plain-language update. Clarity beats design polish in emergencies.",
        },
      ]}
    />
  );
}
