import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { JsonLd, faqJsonLd } from "@/components/marketing/json-ld";

const FAQS = [
  {
    q: "Do I need Gmail or Outlook?",
    a: "No. Sign up with any email address and a password — or a magic link. Sendfable never requires Google or Microsoft OAuth.",
  },
  {
    q: "Does Sendfable send the emails for me?",
    a: "Yes. Campaigns are delivered through Sendfable’s own Amazon SES infrastructure. You design and launch; we handle the send path.",
  },
  {
    q: "Can I bring my contacts from another service?",
    a: "Yes. Import a CSV (or use the migration center for common exports). Only import addresses you have permission to email — purchased lists are not allowed.",
  },
  {
    q: "Can I use my own From address?",
    a: "Yes. Verify the address you send as. On Growth and Pro you can authenticate your own domain. Some providers with strict DMARC policies may use a Sendfable From with Reply-To set to your real address.",
  },
  {
    q: "What happens when someone unsubscribes?",
    a: "They are suppressed automatically and won’t receive future campaigns from your workspace. Unsubscribe links are required and injected when needed.",
  },
  {
    q: "Do I need to understand Amazon SES?",
    a: "No. Sendfable manages the delivery infrastructure for you. Normal customers do not configure AWS accounts, SES credentials, or SMTP keys.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. Free includes 500 contacts and 2,000 emails per month, with a “Sent with Sendfable” badge. No credit card required to start.",
  },
  {
    q: "Can Sendfable help me design the email?",
    a: "Yes. Start from a goal or template, use Simple Mode or the drag-and-drop builder, import brand colors from your site, and preview on mobile and desktop before you send.",
  },
];

export function Faq({
  items = FAQS,
  withSchema = true,
}: {
  items?: { q: string; a: string }[];
  /** Emit FAQPage JSON-LD for AEO/search (default true). */
  withSchema?: boolean;
}) {
  return (
    <>
      {withSchema && items.length > 0 ? <JsonLd data={faqJsonLd(items)} /> : null}
      <Accordion type="single" collapsible className="w-full">
        {items.map((f, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger>{f.q}</AccordionTrigger>
            <AccordionContent>{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  );
}
