import { GuidePage, guideMetadata } from "@/components/marketing/guide-page";

export const metadata = guideMetadata(
  "/guides/how-often-to-email-customers",
  "How often should a small business email customers?",
  "A practical cadence for local businesses: weekly specials, monthly updates, and how to avoid fatigue without going silent."
);

export default function HowOftenToEmailGuide() {
  return (
    <GuidePage
      path="/guides/how-often-to-email-customers"
      title="How often should a small business email customers?"
      description="Cadence advice for shops, restaurants, and service businesses — grounded in permission and usefulness, not vanity volume."
      updated="2026-08-24"
      lead="Direct answer: most small businesses do well with one useful email per week, or two short ones if each has a clear reason (specials + event). Monthly is fine if you only have monthly news. Silence for months teaches people to ignore you; daily blasts teach them to unsubscribe."
      sections={[
        {
          heading: "Start from the reason, not a calendar",
          body: "Email when you have something a subscriber would want: a weekly special, a booking window, a restock, a fundraiser update, or a schedule change. If you are inventing content to “hit a cadence,” skip that send.\n\nRestaurants and cafés often land on weekly. Salons and contractors often land on monthly or seasonal. Breweries may spike around releases.",
        },
        {
          heading: "A simple default",
          body: "Week 1–4: one email with one primary CTA. Keep subject lines specific (“Friday oyster night”) rather than vague (“News from us”).\n\nIf open rates fall for several sends in a row, slow down or tighten the list (remove long-term non-openers gently — never buy replacements).",
        },
        {
          heading: "Segment when audiences differ",
          body: "Tourists do not need wholesale pricing. Event fans do not need every retail SKU. Tags and simple segments keep frequency tolerable for each group.",
        },
        {
          heading: "What SendFable helps with",
          body: "Import a consented list, write the email, check Send Confidence, and send. Free plan covers up to 500 contacts and 1,000 emails/month — enough to learn your cadence before you pay.",
        },
      ]}
      faqs={[
        {
          q: "Is weekly too much?",
          a: "Not if the content is useful and expected. Weekly is too much if every message is a hard sell with nothing new.",
        },
        {
          q: "Should I email every day?",
          a: "Almost never for a typical local business list. Daily is for news publishers and high-volume ecommerce with clear opt-in expectations.",
        },
      ]}
      related={[
        { href: "/email-marketing-for-small-business", label: "Email for small business playbook" },
        { href: "/solutions/restaurants", label: "Restaurant email plays" },
        { href: "/guides/build-email-list-without-buying", label: "Build a list without buying one" },
        { href: "/signup", label: "Start writing free" },
      ]}
    />
  );
}
