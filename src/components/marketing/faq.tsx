import { JsonLd, faqJsonLd } from "@/components/marketing/json-ld";
import { PLANS } from "@/lib/plans";

const FAQS = [
  {
    q: "Do I need Gmail or Outlook?",
    a: "No. Sign up with any email address and a password — or a magic link. SendFable never requires Google or Microsoft OAuth.",
  },
  {
    q: "Does SendFable send the emails for me?",
    a: "Yes. Campaigns are delivered through SendFable’s own Amazon SES infrastructure. You design and launch; we handle the send path.",
  },
  {
    q: "Can I bring my contacts from another service?",
    a: "Yes. Import a CSV (or use the migration center for common exports). Only import addresses you have permission to email — purchased lists are not allowed.",
  },
  {
    q: "Can I use my own From address?",
    a: "Yes. Verify the address you send as. On Growth and Pro you can authenticate your own domain. Some providers with strict DMARC policies may use a SendFable From with Reply-To set to your real address.",
  },
  {
    q: "What happens when someone unsubscribes?",
    a: "They are suppressed automatically and won’t receive future campaigns from your workspace. Unsubscribe links are required and injected when needed.",
  },
  {
    q: "Do I need to understand Amazon SES?",
    a: "No. SendFable manages the delivery infrastructure for you. Normal customers do not configure AWS accounts, SES credentials, or SMTP keys.",
  },
  {
    q: "Is there a free plan?",
    a: `Yes. Free includes up to ${PLANS.FREE.contactCap.toLocaleString()} contacts and up to ${PLANS.FREE.emailsPerMonth.toLocaleString()} emails per month, with a “Powered by SendFable” footer. No credit card required to start.`,
  },
  {
    q: "Can SendFable help me design the email?",
    a: "Yes. Start from a goal or template, use Simple Mode or the drag-and-drop builder, import brand colors from your site, and preview on mobile and desktop before you send.",
  },
];

/**
 * Server-rendered FAQ. Answers stay in the initial HTML (for SEO + screen readers)
 * while remaining collapsed via native details/summary.
 */
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
      <div className="w-full divide-y divide-ink/10 border-b border-ink/10">
        {items.map((f, i) => (
          <details key={i} className="group py-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 text-left text-sm font-medium text-ink outline-none marker:content-none hover:underline focus-visible:ring-2 focus-visible:ring-coral [&::-webkit-details-marker]:hidden">
              <span>{f.q}</span>
              <span
                aria-hidden="true"
                className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              >
                ▾
              </span>
            </summary>
            <div className="pb-4 pr-8 text-sm text-ink/80">{f.a}</div>
          </details>
        ))}
      </div>
    </>
  );
}
