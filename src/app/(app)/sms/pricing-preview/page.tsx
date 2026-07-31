/**
 * Hidden SMS pricing + checkout preview (SF-019F).
 * Gated by ACCOUNT_SIGNUP — not public marketing (PUBLIC flag stays false).
 */

import { notFound } from "next/navigation";
import { isSmsAccountSignupEnabled, isSmsCodeEnabled } from "@/lib/sms/flags";
import { requireWorkspaceContext } from "@/lib/session";
import { PageHeader } from "@/components/app/page-header";
import {
  SMS_ACTIVATION_FEE_CENTS,
  SMS_PLAN_ORDER,
  SMS_PLANS,
  formatCentsUsd,
  formatMicrosUsd,
} from "@/lib/sms/pricing";
import { SmsPurchaseDisclosure } from "@/components/sms/purchase-disclosure";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SmsPricingPreviewPage() {
  if (!isSmsCodeEnabled() || !isSmsAccountSignupEnabled()) notFound();
  await requireWorkspaceContext();

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <PageHeader
        title="Text messaging plans (preview)"
        description="Internal preview only. Public pricing stays email-only until SMS launch flags are enabled."
      />

      <div className="grid gap-6 md:grid-cols-3">
        {SMS_PLAN_ORDER.map((key) => {
          const p = SMS_PLANS[key];
          return (
            <div key={key} className="rounded-xl border p-5 text-sm">
              <h2 className="text-lg font-semibold uppercase tracking-wide">{p.name}</h2>
              <p className="mt-2 text-2xl font-bold">
                {formatCentsUsd(p.monthlyPriceCents)}
                <span className="text-sm font-normal text-muted-foreground">/month</span>
              </p>
              {p.bundledMonthlyPriceCents != null && (
                <p className="mt-1 text-muted-foreground">
                  {formatCentsUsd(p.bundledMonthlyPriceCents)} with Growth, Pro or Pro Plus email
                </p>
              )}
              <ul className="mt-4 list-disc space-y-1 pl-5">
                <li>
                  {formatMicrosUsd(BigInt(p.outboundSegmentPriceMicros))} per outbound segment
                </li>
                <li>{p.includedInboundSegments} incoming segments included</li>
                <li>
                  {formatMicrosUsd(BigInt(p.inboundOveragePriceMicros))} per additional incoming
                  segment
                </li>
                <li>{formatCentsUsd(SMS_ACTIVATION_FEE_CENTS)} activation</li>
              </ul>
            </div>
          );
        })}
      </div>

      <section className="space-y-3 text-sm">
        <h2 className="font-semibold">Before checkout</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>A dedicated business texting number is required</li>
          <li>Brand and campaign registration approval is required before sending</li>
          <li>Carrier approval timing varies and is not guaranteed</li>
          <li>
            Additional fees may apply for rejected or resubmitted registrations or special numbers
            (always disclosed for approval first)
          </li>
          <li>Long or Unicode messages may use multiple billable segments</li>
          <li>Incoming allowances apply per billing month (UTC calendar month)</li>
          <li>Replies sent by the business are outbound billable segments</li>
        </ul>
      </section>

      <SmsPurchaseDisclosure plan="TEXT_ESSENTIALS" bundleEligible={false} />

      <p className="text-sm">
        <Link className="underline" href="/sms/onboarding">
          Continue to registration
        </Link>
        {" · "}
        <Link className="underline" href="/sms/checkout-preview">
          Checkout preview
        </Link>
      </p>
    </div>
  );
}
