import { SolutionPage } from "@/components/marketing/solution-page";

export const metadata = {
  title: "Email marketing for contractors",
  description:
    "Email for contractors and trades: seasonal reminders, project updates, and referral asks with Sendfable.",
};

export default function ContractorsSolutionPage() {
  return (
    <SolutionPage
      industry="Contractors"
      path="/solutions/contractors"
      title="Email marketing for contractors & trades"
      intro="Homeowners hire people they remember. Sendfable helps HVAC, roofing, landscaping, and remodel teams stay in touch between jobs — without a marketing department."
      challenges={[
        {
          title: "Seasonal demand swings",
          body: "Remind past clients before peak season (filter changes, gutter cleans, AC tune-ups) with one clear booking CTA.",
        },
        {
          title: "Trust and proof",
          body: "Short before/after stories beat glossy brochures. Keep claims accurate and local.",
        },
        {
          title: "Jobsite emails are messy",
          body: "Verify a company domain when you can so mail looks professional even if you started on a free mailbox.",
        },
      ]}
      plays={[
        "Seasonal maintenance reminders by service tag",
        "Project spotlight with permissioned photos",
        "Referral ask after a completed five-star job",
        "Storm or weather preparedness notes when relevant — helpful, not fear-mongering",
      ]}
      faqs={[
        {
          q: "Can office and field staff both send?",
          a: "Use verified sender identities for the people who should send. Pro seats help larger offices.",
        },
        {
          q: "Do you replace Angi or Lead services?",
          a: "No. We help you email people who already know you — usually higher quality than cold lead marketplaces.",
        },
        {
          q: "How do we build a list ethically?",
          a: "Ask at estimate and invoice time, link a form on your site, and never scrape public records for marketing.",
        },
      ]}
    />
  );
}
