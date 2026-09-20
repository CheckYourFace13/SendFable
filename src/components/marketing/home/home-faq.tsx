import { Faq } from "@/components/marketing/faq";
import { PLANS } from "@/lib/plans";
import { isSmsPublicEnabled } from "@/lib/sms/flags";

export function HomeFaq() {
  const smsPublic = isSmsPublicEnabled();
  const items = [
    {
      q: "Is there a free plan?",
      a: `Yes. Free includes up to ${PLANS.FREE.contactCap.toLocaleString()} contacts and up to ${PLANS.FREE.emailsPerMonth.toLocaleString()} emails per month. Starter is $${PLANS.STARTER.monthlyPrice}/month when you need more. No credit card to start.`,
    },
    {
      q: "Do I need Gmail or Outlook?",
      a: "No. Sign up with any email and a password, or a magic link. SendFable never requires Google or Microsoft OAuth.",
    },
    {
      q: "Does SendFable send the emails for me?",
      a: "Yes. Campaigns go through SendFable’s Amazon SES path. You design and launch; we handle delivery.",
    },
    {
      q: "Can I bring contacts from another service?",
      a: "Yes. Import a CSV or use the migration center. Only import people you have permission to email. Purchased lists are not allowed.",
    },
    {
      q: "What happens when someone unsubscribes?",
      a: "They are suppressed and will not get future campaigns from your workspace. Unsubscribe links are required.",
    },
    ...(smsPublic
      ? [
          {
            q: "Can I send text messages too?",
            a: "Yes. Choose Email, Text, or Both in one campaign after Text Messaging is set up on your account. Consent, STOP, and HELP are built into the flow.",
          },
        ]
      : []),
    {
      q: "Can SendFable help me design the email?",
      a: "Yes. Start from a goal or template, use Simple Mode or the drag-and-drop builder, and preview on mobile and desktop before you send.",
    },
  ];

  return (
    <section className="section-surface border-b border-ink/10 py-20 sm:py-24">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <h2 className="text-center font-display text-display-md text-ink">
          Questions before you start
        </h2>
        <div className="mt-10">
          <Faq items={items} />
        </div>
      </div>
    </section>
  );
}
