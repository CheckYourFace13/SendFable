import { SolutionPage } from "@/components/marketing/solution-page";

export const metadata = {
  title: "Email marketing for real estate agents",
  description:
    "Sendfable for real estate: listing alerts, open houses, and market notes with professional From addresses and simple segments.",
};

export default function RealEstateSolutionPage() {
  return (
    <SolutionPage
      industry="Real estate"
      path="/solutions/real-estate"
      title="Email marketing for real estate"
      intro="Stay useful between transactions. Sendfable helps agents and small teams send listing alerts and market notes without enterprise CRM pricing."
      challenges={[
        {
          title: "Sphere fatigue",
          body: "Monthly value beats daily noise. Share one insight or one listing cluster — not every MLS change.",
        },
        {
          title: "Personal branding vs spam filters",
          body: "Authenticate a custom domain when you can. If you start on Gmail, understand From-rewrite so mail still authenticates.",
        },
        {
          title: "Mixed buyer/seller interests",
          body: "Tag contacts by neighborhood or intent so condo open houses do not hit your luxury-seller segment.",
        },
      ]}
      plays={[
        "Just-listed / just-sold notes with one property focus",
        "Open-house invites with time, parking, and RSVP link",
        "Quarterly market snapshot for your sphere",
        "Past-client anniversary check-ins (referral ask optional, never pushy)",
      ]}
      faqs={[
        {
          q: "Is this a full CRM?",
          a: "No. Sendfable is email marketing. Keep your CRM; sync via CSV or forms when needed.",
        },
        {
          q: "Can my team share a workspace?",
          a: "Pro plans include multiple seats. Smaller teams can share login carefully or upgrade when ready.",
        },
        {
          q: "Are purchased lead lists allowed?",
          a: "No. Only mail people who expect to hear from you.",
        },
      ]}
    />
  );
}
