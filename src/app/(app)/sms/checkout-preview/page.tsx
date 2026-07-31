/**
 * Checkout preview — shows line items without creating Stripe objects (SF-019F/E).
 */

import { notFound } from "next/navigation";
import { isSmsAccountSignupEnabled, isSmsCodeEnabled } from "@/lib/sms/flags";
import { requireWorkspaceContext, getWorkspaceOwner } from "@/lib/session";
import { PageHeader } from "@/components/app/page-header";
import {
  SMS_ACTIVATION_FEE_CENTS,
  SMS_PLAN_ORDER,
  resolveSmsPricing,
  formatCentsUsd,
  formatMicrosUsd,
  type SmsPlanKey,
} from "@/lib/sms/pricing";
import { smsBillingFlagsSnapshot } from "@/lib/sms/billing-guards";
import type { Plan } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function SmsCheckoutPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  if (!isSmsCodeEnabled() || !isSmsAccountSignupEnabled()) notFound();
  const ctx = await requireWorkspaceContext();
  const sp = await searchParams;
  const planKey = (
    SMS_PLAN_ORDER.includes(sp.plan as SmsPlanKey) ? sp.plan : "TEXT_ESSENTIALS"
  ) as SmsPlanKey;

  const owner = await getWorkspaceOwner(ctx.workspace.id);
  const emailState = {
    plan: owner.plan as Plan,
    active: !owner.paymentFailedAt && owner.plan !== "FREE",
  };
  const pricing = resolveSmsPricing(planKey, emailState);
  const flags = smsBillingFlagsSnapshot();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="SMS checkout preview"
        description="Simulated line items only. Live Stripe checkout stays blocked until billing flags are enabled."
      />

      <div className="rounded-xl border p-5 text-sm">
        <p className="font-semibold">{pricing.plan.replace(/_/g, " ")}</p>
        <ul className="mt-3 space-y-2">
          <li>
            Monthly base: {formatCentsUsd(pricing.appliedMonthlyPriceCents)}
            {pricing.bundleDiscountPercent > 0
              ? ` (${pricing.bundleDiscountPercent}% bundle vs ${formatCentsUsd(pricing.baseMonthlyPriceCents)})`
              : ""}
          </li>
          <li>
            Outbound usage: {formatMicrosUsd(BigInt(pricing.outboundSegmentPriceMicros))} / segment
            (metered)
          </li>
          <li>
            Incoming: {pricing.includedInboundSegments} included; then{" "}
            {formatMicrosUsd(BigInt(pricing.inboundOveragePriceMicros))} / segment
          </li>
          <li>Activation (one-time): {formatCentsUsd(SMS_ACTIVATION_FEE_CENTS)}</li>
        </ul>
        <p className="mt-4 text-muted-foreground">
          Live Stripe writes allowed: <strong>{flags.liveWritesAllowed ? "yes" : "no"}</strong>
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Switch plan via ?plan=TEXT_ENTRY | TEXT_ESSENTIALS | TEXT_ADVANTAGE
      </p>
    </div>
  );
}
