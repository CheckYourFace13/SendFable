import { GuidePage, guideMetadata } from "@/components/marketing/guide-page";

export const metadata = guideMetadata(
  "/guides/how-to-switch-from-mailchimp",
  "How to switch from Mailchimp to SendFable",
  "Step-by-step Mailchimp switch: export permissioned contacts, clean suppressions, import, verify sender, test, send a small campaign, then cancel when ready."
);

export default function HowToSwitchFromMailchimpGuide() {
  return (
    <GuidePage
      path="/guides/how-to-switch-from-mailchimp"
      title="How to switch from Mailchimp"
      description="A permission-first checklist for moving your email program without buying lists or re-subscribing people who opted out."
      updated="2026-07-29"
      lead="Direct answer: switching from Mailchimp means exporting contacts you have permission to email, cleaning unsubscribed and bad addresses, importing into the new ESP, verifying your sender and mailing address, sending a test, then canceling Mailchimp only after a successful small campaign. Do not import data you lack permission to use."
      sections={[
        {
          heading: "Before you export",
          body: "Decide which audience you still have a lawful reason to email. Note any automations you actually use weekly — most teams only need to rebuild a few. Screenshot or export any templates you want to recreate manually.\n\nIf you sell or share lists, stop. SendFable (and reputable ESPs) expect permission-based contacts only.",
        },
        {
          heading: "Export from Mailchimp",
          body: "In Mailchimp, open your audience and export contacts. Prefer a CSV that includes email, first name, last name, and subscription status when available.\n\nFilter toward subscribed contacts you intend to market to. Keep a separate handling path for unsubscribed or cleaned rows so they remain suppressed after import.\n\nUI labels in Mailchimp can change; if a menu name differs, use Mailchimp’s current help docs for “export contacts.” See also our short export guide.",
        },
        {
          heading: "Clean before you import",
          body: "Remove obvious typos and role accounts you should not mail. Deduplicate on email. Do not “revive” people who unsubscribed or complained.\n\nIf historical bounce rates were high, fix list hygiene before your first SendFable send. A smaller clean list beats a large risky one.",
        },
        {
          heading: "Import into SendFable",
          body: "Use Contacts → Import (or the migration center). Map columns, review valid / invalid / duplicate / suppressed counts, then commit. Existing suppressed addresses stay suppressed.\n\nTag contacts by source (for example mailchimp-migration-2026-07) so you can send a small first segment.",
        },
        {
          heading: "Verify sender and mailing address",
          body: "Add the From address customers recognize and complete verification. Add your physical mailing address in workspace settings — required for commercial email footers.\n\nFollow any domain authentication steps your setup requires. No ESP can guarantee inbox placement; authentication and permission still matter.",
        },
        {
          heading: "Rebuild one campaign, test, then send small",
          body: "Recreate one simple announcement or newsletter — not every historical automation on day one. Send a test to yourself. Then send to a small segment (or recent engagers) before a full-audience blast.\n\nAvoid sending the same campaign from Mailchimp and SendFable on the same day.",
        },
        {
          heading: "When to cancel Mailchimp",
          body: "Cancel when you are confident: sender verified, a successful test, and at least one small live send with expected delivery behavior. Overlap of a few days to a couple of weeks is normal.\n\nExport any remaining reports you need for your records before the old account closes.",
        },
        {
          heading: "What this guide does not promise",
          body: "We do not promise full-service migration of every automation, template pixel-perfectly, or purchased lists. We do not guarantee cheaper pricing at every list size forever — check /pricing and dated comparison pages.\n\nSelf-serve import tooling and guides are available now. Hands-on concierge migration is not advertised until support capacity is explicitly approved.",
        },
      ]}
      faqs={[
        {
          q: "How long should Mailchimp and SendFable overlap?",
          a: "Often a few days to a couple of weeks. Keep Mailchimp until SendFable tests pass.",
        },
        {
          q: "Do automations migrate automatically?",
          a: "Usually not. Rebuild the few flows you actually use.",
        },
        {
          q: "Can I import unsubscribed contacts?",
          a: "You can import them with an unsubscribed or suppressed status so they stay opted out. Never re-subscribe people who opted out.",
        },
        {
          q: "Where is the shorter checklist?",
          a: "Use /switch-from-mailchimp and /migrate/mailchimp for the compact paths; this guide is the longer walkthrough.",
        },
      ]}
      related={[
        { href: "/migrate/mailchimp", label: "Mailchimp migration guide" },
        { href: "/switch-from-mailchimp", label: "Switch checklist" },
        { href: "/guides/export-contacts-from-mailchimp", label: "Export contacts from Mailchimp" },
        { href: "/guides/import-mailchimp-contacts-to-sendfable", label: "Import into SendFable" },
        { href: "/compare/mailchimp", label: "Mailchimp comparison" },
        { href: "/pricing", label: "SendFable pricing" },
        { href: "/signup", label: "Start writing free" },
      ]}
    />
  );
}
