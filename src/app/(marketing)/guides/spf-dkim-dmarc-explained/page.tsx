import { GuidePage, guideMetadata } from "@/components/marketing/guide-page";

export const metadata = guideMetadata(
  "/guides/spf-dkim-dmarc-explained",
  "SPF, DKIM, and DMARC explained simply",
  "Plain-language SPF, DKIM, and DMARC for small businesses sending email marketing — what they do and what SendFable handles for you."
);

export default function SpfDkimDmarcGuide() {
  return (
    <GuidePage
      path="/guides/spf-dkim-dmarc-explained"
      title="SPF, DKIM, and DMARC explained simply"
      description="Authentication basics without the jargon soup — enough to understand why sender verification matters."
      updated="2026-08-24"
      lead="Direct answer: SPF says which servers may send for your domain, DKIM adds a cryptographic signature, and DMARC tells receivers what to do when checks fail. You do not need to become a DNS expert to start on SendFable — verify your From address first; add domain authentication when you are on Growth or above."
      sections={[
        {
          heading: "SPF in one sentence",
          body: "SPF is a DNS record listing mail servers allowed to send mail that claims your domain. If a stranger’s server pretends to be you, receivers can spot the mismatch.",
        },
        {
          heading: "DKIM in one sentence",
          body: "DKIM signs the message so receivers can verify it was not altered and that a key published in your DNS matches the signature.",
        },
        {
          heading: "DMARC in one sentence",
          body: "DMARC ties SPF/DKIM results to a policy (monitor, quarantine, or reject) and can send reports. Strict DMARC on Gmail/Yahoo-style domains is why some ESPs rewrite From while keeping Reply-To as you.",
        },
        {
          heading: "What to do on SendFable",
          body: "1. Verify the From address people recognize.\n2. Add your physical mailing address in workspace settings.\n3. On Growth+, follow in-app DNS instructions for domain authentication.\n4. Use Send Confidence before launch.\n\nNo ESP can promise inbox placement. Authentication + permission + list hygiene are the controllable parts.",
        },
      ]}
      faqs={[
        {
          q: "Can I send from Gmail?",
          a: "Yes after verification. Strict DMARC providers may use From-rewrite with Reply-To preserved so replies still reach you.",
        },
        {
          q: "Where is the deeper deliverability page?",
          a: "See /deliverability for the product-oriented checklist.",
        },
      ]}
      related={[
        { href: "/deliverability", label: "Deliverability on SendFable" },
        { href: "/how-sendfable-works", label: "How SendFable works" },
        { href: "/pricing", label: "Plans (domain auth on Growth+)" },
        { href: "/signup", label: "Start writing free" },
      ]}
    />
  );
}
