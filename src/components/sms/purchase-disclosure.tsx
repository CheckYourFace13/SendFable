/**
 * Pre-purchase disclosure shown before a customer confirms an SMS plan.
 * Required content (owner-specified): exact included incoming allowance,
 * $0.025 incoming overage rate, exact outbound rate, $99 activation fee,
 * bundle eligibility, multi-segment/Unicode behavior, carrier registration,
 * activation timeline, and approval-required exceptional charges.
 */

import {
  SMS_ACTIVATION_FEE_CENTS,
  SMS_PLANS,
  formatCentsUsd,
  formatMicrosUsd,
  type SmsPlanKey,
} from "@/lib/sms/pricing";

export function SmsPurchaseDisclosure({
  plan,
  bundleEligible,
}: {
  plan: SmsPlanKey;
  bundleEligible: boolean;
}) {
  const def = SMS_PLANS[plan];
  return (
    <div className="space-y-2 rounded-xl border bg-muted/30 p-4 text-sm">
      <p className="font-semibold">Before you confirm — {def.name} details</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Monthly fee: {formatCentsUsd(def.monthlyPriceCents)}
          {def.bundledMonthlyPriceCents !== null && (
            <>
              {" "}
              ({formatCentsUsd(def.bundledMonthlyPriceCents)} with an active Growth, Pro or Pro
              Plus email plan — 10% off the fixed monthly fee only
              {bundleEligible ? "; your account qualifies today" : "; your account does not currently qualify"})
            </>
          )}
          {def.bundledMonthlyPriceCents === null && " (this plan is not eligible for a bundle discount)"}
        </li>
        <li>
          Outbound texts: {formatMicrosUsd(BigInt(def.outboundSegmentPriceMicros))} per SMS segment.
        </li>
        <li>
          Included incoming messages: {def.includedInboundSegments} incoming SMS segments per
          calendar month. Additional incoming segments are{" "}
          {formatMicrosUsd(BigInt(def.inboundOveragePriceMicros))} each.
        </li>
        <li>
          One-time Text Messaging Activation fee: {formatCentsUsd(SMS_ACTIVATION_FEE_CENTS)}. It
          covers standard onboarding, standard brand and campaign registration preparation and
          dedicated-number setup. It does not guarantee carrier approval.
        </li>
        <li>
          Longer messages may use multiple segments. Unicode characters and emojis may increase
          the segment count.
        </li>
        <li>
          Carrier registration is required before texting begins, and activation can take several
          weeks.
        </li>
        <li>
          Additional carrier-required charges (for example enhanced vetting, toll-free
          verification, resubmissions caused by incorrect information, or expedited review) are
          not included and always require your approval before they are billed.
        </li>
      </ul>
    </div>
  );
}
