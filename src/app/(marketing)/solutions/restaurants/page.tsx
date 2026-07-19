import { SolutionPage } from "@/components/marketing/solution-page";

export const metadata = {
  title: "Email marketing for restaurants",
  description:
    "Sendfable for restaurants and cafés: specials, events, and reserved-list updates with affordable plans and clean list tools.",
};

export default function RestaurantsSolutionPage() {
  return (
    <SolutionPage
      industry="Restaurants"
      path="/solutions/restaurants"
      title="Email marketing for restaurants"
      intro="Fill slower nights and announce specials without another expensive social boost. Sendfable helps restaurants mail guests who already asked for updates — menus, events, and loyalty notes."
      challenges={[
        {
          title: "Guests ignore generic blasts",
          body: "Segment brunch regulars from private-dining inquiries. Tags and simple segments keep Friday oyster night from landing on the wrong crowd.",
        },
        {
          title: "Staff time is scarce",
          body: "Use a short template, swap the special and photo, and send. You do not need a designer for every midweek promo.",
        },
        {
          title: "Reputation matters locally",
          body: "Never buy email lists of “foodies in your zip.” Complaints from strangers hurt more than a quiet week.",
        },
      ]}
      plays={[
        "Weekly specials with one clear reservation or order CTA",
        "Holiday and prix-fixe announcements with a deadline",
        "Event nights (live music, wine dinners) to a tagged interest list",
        "Win-back notes to guests who have not opened in 90+ days — gently",
      ]}
      faqs={[
        {
          q: "Can we send from our gmail.com reservations inbox?",
          a: "Yes. Verify the address; strict DMARC may use From-rewrite with Reply-To set to your inbox so replies still arrive.",
        },
        {
          q: "Do you integrate with our POS?",
          a: "Not as a native POS sync today. Export consented emails to CSV or collect new guests via a Sendfable form.",
        },
        {
          q: "Is this only for fine dining?",
          a: "No — cafés, counters, and neighborhood spots use the same tools with shorter, more frequent notes.",
        },
      ]}
    />
  );
}
