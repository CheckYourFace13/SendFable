/**
 * Public SMS pricing cards — SERVER component gated by
 * SENDFABLE_SMS_PUBLIC_ENABLED. Renders nothing while the flag is off, so it
 * can be mounted on the pricing page today without exposing anything.
 *
 * Cards stay simple by design (monthly fee, outbound rate, headline
 * features). Detailed incoming-overage terms are disclosed before purchase
 * (SmsPurchaseDisclosure), in checkout, billing, the usage dashboard and Terms.
 */

import { isSmsCodeEnabled, isSmsPublicEnabled } from "@/lib/sms/flags";
import { SMS_PLANS, SMS_PLAN_ORDER, formatCentsUsd, formatMicrosUsd } from "@/lib/sms/pricing";

export function SmsPricingSection() {
  if (!isSmsCodeEnabled() || !isSmsPublicEnabled()) return null;

  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <h2 className="text-center text-3xl font-bold tracking-tight">Text messaging plans</h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">
        Add a dedicated business texting number and send text campaigns from the same place you
        send email. Usage limits apply.
      </p>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {SMS_PLAN_ORDER.map((key) => {
          const plan = SMS_PLANS[key];
          return (
            <div key={key} className="flex flex-col rounded-2xl border p-6">
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-2 text-3xl font-bold">
                {formatCentsUsd(plan.monthlyPriceCents)}
                <span className="text-sm font-normal text-muted-foreground">/month</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatMicrosUsd(BigInt(plan.outboundSegmentPriceMicros))} per outbound text segment
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>Dedicated business texting number</li>
                <li>Text campaigns</li>
                <li>SendFable Inbox</li>
                <li>Email notifications for replies</li>
                <li>Incoming customer replies included</li>
                <li className="text-muted-foreground">Usage limits apply</li>
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Longer messages may use multiple segments. Full pricing details, the one-time activation
        fee and carrier-registration requirements are shown before you purchase.
      </p>
    </section>
  );
}
