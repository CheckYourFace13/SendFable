import { SolutionPage } from "@/components/marketing/solution-page";

export const metadata = {
  title: "Email marketing for professional services",
  description:
    "Email for consultants, agencies, and advisors: newsletters, tip series, and client check-ins with Sendfable.",
};

export default function ProfessionalServicesSolutionPage() {
  return (
    <SolutionPage
      industry="Professional services"
      path="/solutions/professional-services"
      title="Email marketing for professional services"
      intro="Accountants, agencies, coaches, and consultants win with steady usefulness. Sendfable supports newsletters and client updates without locking you into Google signup or bloated suites."
      challenges={[
        {
          title: "Saying something worth opening",
          body: "One insight per email beats a long digest nobody finishes. Link deeper resources for those who want more.",
        },
        {
          title: "Prospect vs client tone",
          body: "Segment active clients from newsletter readers so invoices and nurture do not collide.",
        },
        {
          title: "Compliance and claims",
          body: "Avoid guaranteed outcomes. Be precise in regulated fields and keep unsubscribe obvious.",
        },
      ]}
      plays={[
        "Monthly tip or regulatory update",
        "Case-study style wins with client permission",
        "Webinar or office-hours invites",
        "Quarterly relationship check-ins to past clients",
      ]}
      faqs={[
        {
          q: "Can we use our firm domain?",
          a: "Yes — authenticate on Growth+ for aligned From addresses.",
        },
        {
          q: "Is this a replacement for our CRM?",
          a: "No. Use Sendfable for broadcast and nurture email alongside your CRM.",
        },
        {
          q: "Do you support multiple brands?",
          a: "Workspaces are account-based today; keep brands in separate accounts if you need hard separation, or use clear From names within one workspace carefully.",
        },
      ]}
    />
  );
}
