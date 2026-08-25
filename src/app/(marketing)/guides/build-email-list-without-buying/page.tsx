import { GuidePage, guideMetadata } from "@/components/marketing/guide-page";

export const metadata = guideMetadata(
  "/guides/build-email-list-without-buying",
  "How to build an email list without buying one",
  "Permission-based ways small businesses grow email lists: signup forms, receipts, events, and QR codes — never purchased lists."
);

export default function BuildListWithoutBuyingGuide() {
  return (
    <GuidePage
      path="/guides/build-email-list-without-buying"
      title="How to build an email list without buying one"
      description="Practical opt-in methods for local businesses. Purchased and scraped lists are not allowed on SendFable."
      updated="2026-08-24"
      lead="Direct answer: grow your list by asking people who already know you — at checkout, on your site, at events, and on receipts. Buying email lists is against SendFable’s acceptable use and usually backfires with bounces and complaints."
      sections={[
        {
          heading: "Why bought lists fail",
          body: "People who never asked for your mail mark it as spam. That hurts domain reputation for everyone who shares delivery infrastructure — including you.\n\nSendFable does not allow purchased or scraped lists. Import only addresses you have permission to use.",
        },
        {
          heading: "High-trust collection methods",
          body: "1. Hosted signup form on your site (“Weekly specials / event alerts”).\n2. Paper or QR signup at the register with a clear promise.\n3. Ask on invoices and booking confirmations.\n4. Event check-in: “Text/email for schedule changes.”\n5. Loyalty cards that include an email opt-in checkbox — not a pre-checked box.",
        },
        {
          heading: "Set expectations at signup",
          body: "Say how often you will write and what people get. “Weekly Friday specials” beats “marketing emails.” Make unsubscribe easy later so people do not complain instead.",
        },
        {
          heading: "Import what you already have",
          body: "If you have a spreadsheet of customers who opted in historically, clean it (remove unsubscribes and obvious typos), then import via CSV. Tag the source so you can send gently at first.",
        },
      ]}
      faqs={[
        {
          q: "Can I use emails from my POS export?",
          a: "Only if customers consented to marketing email. Transactional receipts alone are not automatic marketing consent in every jurisdiction — when unsure, collect a fresh opt-in.",
        },
        {
          q: "Does SendFable provide signup forms?",
          a: "Yes. Hosted forms with optional double opt-in. See product features after you create an account.",
        },
      ]}
      related={[
        { href: "/acceptable-use", label: "Acceptable use (no purchased lists)" },
        { href: "/email-marketing-guide", label: "Email marketing guide" },
        { href: "/guides/can-spam-checklist-for-small-businesses", label: "CAN-SPAM checklist" },
        { href: "/signup", label: "Start writing free" },
      ]}
    />
  );
}
