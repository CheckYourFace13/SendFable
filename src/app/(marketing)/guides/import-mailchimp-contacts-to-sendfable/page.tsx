import { GuidePage, guideMetadata } from "@/components/marketing/guide-page";

export const metadata = guideMetadata(
  "/guides/import-mailchimp-contacts-to-sendfable",
  "Import Mailchimp contacts to SendFable",
  "Map a Mailchimp CSV into SendFable: email required, names and tags optional, suppressions respected."
);

export default function ImportMailchimpGuide() {
  return (
    <GuidePage
      path="/guides/import-mailchimp-contacts-to-sendfable"
      title="Import Mailchimp contacts to SendFable"
      description="CSV mapping steps for Mailchimp → SendFable."
      updated="2026-07-29"
      lead="Direct answer: in SendFable go to Contacts → Import, upload your cleaned CSV, map Email (required) plus name/tag columns, review the preview, then confirm. Start with a small test import if the file is large."
      sections={[
        {
          heading: "Field mapping",
          body: "Map the primary email column first. Map first/last name when present. Convert Mailchimp tags or groups into SendFable tags if you want segment continuity.\n\nSkip columns you do not need — unused CRM fields create noise.",
        },
        {
          heading: "After import",
          body: "Spot-check a few contacts. Create a segment for “recently imported.” Verify your sender and mailing address before any campaign.\n\nSend a test email to yourself, then a small live segment.",
        },
        {
          heading: "Limits",
          body: "Stay within your plan’s contact cap. Free includes up to 500 contacts — upgrade before importing a larger list.",
        },
      ]}
      faqs={[
        {
          q: "What if a contact already exists?",
          a: "SendFable scopes contacts per workspace and email. Duplicates in the same workspace are handled by the import rules — review the import summary.",
        },
        {
          q: "Can I import unsubscribed people to keep a suppression list?",
          a: "Prefer keeping suppressions clean. Do not re-permission people who opted out.",
        },
      ]}
      related={[
        { href: "/guides/export-contacts-from-mailchimp", label: "Export from Mailchimp" },
        { href: "/features#audience", label: "Audience features" },
        { href: "/signup", label: "Create free account" },
      ]}
    />
  );
}
