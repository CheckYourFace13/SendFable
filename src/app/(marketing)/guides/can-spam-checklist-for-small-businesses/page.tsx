import { GuidePage, guideMetadata } from "@/components/marketing/guide-page";

export const metadata = guideMetadata(
  "/guides/can-spam-checklist-for-small-businesses",
  "CAN-SPAM checklist for small businesses",
  "A practical CAN-SPAM checklist for US small businesses: accurate From, physical address, clear unsubscribe, and honest subject lines."
);

export default function CanSpamChecklistGuide() {
  return (
    <GuidePage
      path="/guides/can-spam-checklist-for-small-businesses"
      title="CAN-SPAM checklist for small businesses"
      description="Operational checklist — not legal advice. When in doubt, talk to counsel."
      updated="2026-08-24"
      lead="Direct answer: for commercial email to US recipients, use accurate From/subject lines, identify the message as an ad when required, include a valid physical postal address, and honor opt-outs quickly. SendFable injects unsubscribe handling and expects your workspace mailing address in the footer."
      sections={[
        {
          heading: "Before you send",
          body: "☐ Subject and From reflect the real message and sender.\n☐ You have permission (or another lawful basis) to email these people.\n☐ Physical mailing address is set in your workspace — not a fake P.O. box scheme.\n☐ Unsubscribe link will appear (SendFable requires this for campaigns).\n☐ No purchased list.",
        },
        {
          heading: "After someone unsubscribes",
          body: "☐ Stop marketing mail promptly (SendFable suppresses unsubscribed addresses).\n☐ Do not re-add them from an old CSV as “subscribed.”\n☐ Keep transactional mail (receipts) on a separate path if applicable.",
        },
        {
          heading: "What this page is not",
          body: "This is not a complete legal guide for every jurisdiction. Canada’s CASL, EU GDPR, and state laws may add requirements. If you mail internationally or in regulated industries, get advice for your situation.",
        },
      ]}
      faqs={[
        {
          q: "Does SendFable put my mailing address in emails?",
          a: "Campaign footers use your workspace business name and mailing address. Keep them accurate in settings.",
        },
        {
          q: "Is one-click unsubscribe supported?",
          a: "Campaigns include unsubscribe links; one-click list-unsubscribe headers are part of the product send path where applicable.",
        },
      ]}
      related={[
        { href: "/acceptable-use", label: "Acceptable use policy" },
        { href: "/privacy", label: "Privacy policy" },
        { href: "/deliverability", label: "Deliverability basics" },
        { href: "/signup", label: "Start writing free" },
      ]}
    />
  );
}
