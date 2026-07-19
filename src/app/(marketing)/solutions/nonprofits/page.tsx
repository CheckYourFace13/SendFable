import { SolutionPage } from "@/components/marketing/solution-page";

export const metadata = {
  title: "Email marketing for nonprofits",
  description:
    "Affordable email for nonprofits: appeals, events, and impact updates with compliant footers and list hygiene on Sendfable.",
};

export default function NonprofitsSolutionPage() {
  return (
    <SolutionPage
      industry="Nonprofits"
      path="/solutions/nonprofits"
      title="Email marketing for nonprofits"
      intro="Donors and volunteers already care — they need clarity, not flash. Sendfable keeps nonprofit email affordable with honest plan limits and required unsubscribe footers on every send."
      challenges={[
        {
          title: "Budget pressure",
          body: "Start on the free plan for smaller lists, then upgrade when volume grows. Avoid tools that charge enterprise rates for basic newsletters.",
        },
        {
          title: "Appeal fatigue",
          body: "Balance asks with impact stories. Segment major donors from event attendees when your data allows.",
        },
        {
          title: "Volunteer vs donor lists",
          body: "Tags prevent volunteer shift reminders from looking like donation pleas.",
        },
      ]}
      plays={[
        "Monthly impact update with one story and one optional CTA",
        "Event invitations and day-before reminders",
        "Year-end appeal sequence (a few thoughtful emails, not a dozen)",
        "Volunteer recruitment with role specifics and time commitment",
      ]}
      faqs={[
        {
          q: "Do you offer nonprofit discounts?",
          a: "Published plans are already priced for small teams. Contact support if you need invoicing help — we will not invent a fake “50% off forever” badge here.",
        },
        {
          q: "Can we collect emails at events?",
          a: "Yes — use a hosted form on a tablet or QR code, and state what you will send.",
        },
        {
          q: "What about political or advocacy mail?",
          a: "Follow applicable law and our terms. Purchased voter files are not allowed as marketing lists.",
        },
      ]}
    />
  );
}
