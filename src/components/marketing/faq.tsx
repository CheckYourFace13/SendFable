import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "Do I need a Gmail or Microsoft account?",
    a: "No. Sign up with any email address and password — or a magic link. Sendfable never requires OAuth with Google or Microsoft.",
  },
  {
    q: "Can I send from my Gmail address?",
    a: "Yes. Because Gmail publishes a strict DMARC policy, we send as you@send.sendfable.com with Reply-To set to your real address so replies still reach you and deliverability stays high.",
  },
  {
    q: "Who actually sends the emails?",
    a: "Sendfable delivers through our own Amazon SES infrastructure. You don't bring your own SMTP or ESP keys.",
  },
  {
    q: "Are purchased lists allowed?",
    a: "Never. Purchased, rented, or scraped lists violate our terms and can result in immediate termination. We auto-pause campaigns that hit bounce or complaint thresholds.",
  },
  {
    q: "How does pricing compare to Mailchimp?",
    a: "Typically about half the cost at similar contact tiers. Use the calculator on our homepage for a side-by-side estimate.",
  },
];

export function Faq() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {FAQS.map((f, i) => (
        <AccordionItem key={i} value={`item-${i}`}>
          <AccordionTrigger>{f.q}</AccordionTrigger>
          <AccordionContent>{f.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
