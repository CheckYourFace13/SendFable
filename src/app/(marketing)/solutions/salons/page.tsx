import { SolutionPage } from "@/components/marketing/solution-page";

export const metadata = {
  title: "Email marketing for salons and spas",
  description:
    "Salon and spa email marketing: booking prompts, membership renewals, and new-service announcements on Sendfable.",
};

export default function SalonsSolutionPage() {
  return (
    <SolutionPage
      industry="Salons"
      path="/solutions/salons"
      title="Email marketing for salons & spas"
      intro="Fill gaps in the book and announce new services without another discounted deal site. Sendfable keeps client email simple for salons, barbershops, and spas."
      challenges={[
        {
          title: "No-shows and lapses",
          body: "Polite rebooking prompts to clients who are past their usual interval work better than generic blasts.",
        },
        {
          title: "Stylist vs front-desk lists",
          body: "If clients belong to a specific stylist, tag them — or keep one studio list if that matches how you operate.",
        },
        {
          title: "Over-discounting",
          body: "Lead with education and availability. Save percentages for true slow periods.",
        },
      ]}
      plays={[
        "New service or product line introductions",
        "Membership and package renewal reminders",
        "Holiday booking windows before calendars fill",
        "Aftercare tips tied to a recent service category",
      ]}
      faqs={[
        {
          q: "Will this sync with our booking app?",
          a: "Native booking sync is not listed as shipped. Export consented clients or grow via a Sendfable form.",
        },
        {
          q: "Can each stylist have their own From name?",
          a: "Verify sender identities per person when appropriate, and follow your studio’s branding rules.",
        },
        {
          q: "How often should we email?",
          a: "Monthly is a solid default for most salons; add booking windows around holidays.",
        },
      ]}
    />
  );
}
