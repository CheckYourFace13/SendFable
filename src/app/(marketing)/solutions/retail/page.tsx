import { SolutionPage } from "@/components/marketing/solution-page";

export const metadata = {
  title: "Email marketing for retail stores",
  description:
    "Retail email marketing with Sendfable: product drops, seasonal promos, and win-back campaigns for shops that want simple tools.",
};

export default function RetailSolutionPage() {
  return (
    <SolutionPage
      industry="Retail"
      path="/solutions/retail"
      title="Email marketing for retail"
      intro="Whether you sell online, in-store, or both, email remains a direct line to people who opted in. Sendfable covers promos and drops without forcing a heavyweight e‑commerce suite."
      challenges={[
        {
          title: "Promo blindness",
          body: "Lead with the product or the reason, not “SALE!!!” every week. Save bigger discounts for moments that matter.",
        },
        {
          title: "Inventory timing",
          body: "Send when stock is real. Nothing erodes trust like a sold-out hero item in the first link.",
        },
        {
          title: "Channel overlap",
          body: "Coordinate with SMS/social so the same offer is not hammered three ways in one day.",
        },
      ]}
      plays={[
        "New arrival drops with 2–4 products max",
        "Seasonal lookbooks or gift guides",
        "Abandoned interest win-backs for tagged browsers (consented list only)",
        "Local in-store event or trunk-show invites",
      ]}
      faqs={[
        {
          q: "Do you sync Shopify carts?",
          a: "Not as a native integration yet. Export customers you have permission to email, or collect via forms.",
        },
        {
          q: "Can we show product prices in email?",
          a: "Yes — use image and text blocks. Keep HTML simple for inbox compatibility.",
        },
        {
          q: "How do we avoid spam complaints on sales?",
          a: "Set expectations at signup, cap frequency, and honor unsubscribes immediately.",
        },
      ]}
    />
  );
}
