import { GuidePage, guideMetadata } from "@/components/marketing/guide-page";

export const metadata = guideMetadata(
  "/guides/export-contacts-from-mailchimp",
  "Export contacts from Mailchimp",
  "How to export a clean Mailchimp audience CSV for migration — including what to exclude before you import elsewhere."
);

export default function ExportMailchimpGuide() {
  return (
    <GuidePage
      path="/guides/export-contacts-from-mailchimp"
      title="Export contacts from Mailchimp"
      description="Clean Mailchimp CSV export steps for migration."
      updated="2026-07-29"
      lead="Direct answer: in Mailchimp, open Audience → All contacts → Export audience, download the CSV, then remove unsubscribed, cleaned, and obviously bad addresses before importing anywhere else."
      sections={[
        {
          heading: "What to export",
          body: "Export subscribed contacts you have permission to email. Keep columns for email, first name, last name, and tags/groups if you use them.\n\nDo not export purchased lists — they are not allowed in SendFable (or reputable ESPs).",
        },
        {
          heading: "What to clean before import",
          body: "Remove rows marked unsubscribed, cleaned, or pending. Delete role addresses you never intended to market to. Deduplicate on email.\n\nIf bounce rates were high historically, fix list hygiene before your first SendFable send.",
        },
        {
          heading: "Privacy note",
          body: "Only migrate contacts you lawfully collected. Keep a record of signup source when you can.",
        },
      ]}
      faqs={[
        {
          q: "Does Mailchimp include unsubscribes in exports?",
          a: "Exports can include multiple statuses depending on filters. Always filter to subscribed contacts and double-check the CSV.",
        },
        {
          q: "Next step?",
          a: "Import the cleaned CSV into SendFable with field mapping — see the import guide.",
        },
      ]}
      related={[
        { href: "/guides/import-mailchimp-contacts-to-sendfable", label: "Import into SendFable" },
        { href: "/switch-from-mailchimp", label: "Full switch checklist" },
        { href: "/migrate/mailchimp", label: "Mailchimp migration" },
      ]}
    />
  );
}
