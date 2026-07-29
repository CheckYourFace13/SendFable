/**
 * Customer SMS billing & usage dashboard.
 * Server-side gated: 404s while SENDFABLE_SMS_ACCOUNT_SIGNUP_ENABLED=false —
 * customers cannot discover the SMS product before launch.
 */

import { notFound } from "next/navigation";
import { isSmsAccountSignupEnabled, isSmsCodeEnabled } from "@/lib/sms/flags";
import { requireWorkspaceContext } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  SMS_PLANS,
  formatCentsUsd,
  formatMicrosUsd,
  microsToCentsFloor,
  type SmsPlanKey,
} from "@/lib/sms/pricing";
import { billingPeriodFor } from "@/lib/sms/usage";
import { PageHeader } from "@/components/app/page-header";

export const dynamic = "force-dynamic";

export default async function SmsBillingPage() {
  if (!isSmsCodeEnabled() || !isSmsAccountSignupEnabled()) notFound();

  const ctx = await requireWorkspaceContext();
  const workspaceId = ctx.workspace.id;
  const month = billingPeriodFor();

  const [subscription, activation, number, monthly] = await Promise.all([
    prisma.smsSubscription.findUnique({ where: { workspaceId } }),
    prisma.smsActivation.findUnique({ where: { workspaceId } }),
    prisma.smsNumber.findFirst({ where: { workspaceId, status: "ACTIVE" } }),
    prisma.smsMonthlyUsage.findUnique({
      where: { workspaceId_month: { workspaceId, month } },
    }),
  ]);

  if (!subscription) {
    return (
      <div className="space-y-6">
        <PageHeader title="Text messaging" description="No text messaging plan is active on this workspace." />
      </div>
    );
  }

  const def = SMS_PLANS[subscription.plan as SmsPlanKey];
  const inbound = monthly?.inboundSegments ?? 0;
  const included = def.includedInboundSegments;
  const remaining = Math.max(0, included - inbound);
  const overage = Math.max(0, inbound - included);
  const outbound = monthly?.outboundSegments ?? 0;
  const outboundCharge = monthly?.customerOutboundChargeMicros ?? 0n;
  const inboundCharge = monthly?.customerInboundChargeMicros ?? 0n;
  const estInvoiceCents =
    subscription.appliedMonthlyPriceCents +
    microsToCentsFloor(outboundCharge + inboundCharge);
  const pct = included > 0 ? Math.min(100, Math.floor((inbound * 100) / included)) : 100;

  const registration = await prisma.smsRegistration.findFirst({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Text messaging usage & billing"
        description="Your SMS plan, this month's usage, and estimated charges. Allowances reset each calendar month (UTC)."
      />

      {pct >= 75 && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            pct >= 100 ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {pct >= 100
            ? `You've used your full included incoming allowance (${included} segments). Additional incoming segments this month are billed at $0.025 each.`
            : `You've used ${pct}% of your included incoming text allowance (${inbound} of ${included} segments).`}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Current plan" value={def.name} />
        <Stat label="Standard monthly fee" value={formatCentsUsd(def.monthlyPriceCents)} />
        <Stat
          label="Billed monthly fee"
          value={formatCentsUsd(subscription.appliedMonthlyPriceCents)}
          hint={
            subscription.bundleDiscountPercent > 0
              ? `${subscription.bundleDiscountPercent}% bundle discount active (fixed fee only)`
              : undefined
          }
        />
        <Stat
          label="Outbound rate"
          value={`${formatMicrosUsd(BigInt(def.outboundSegmentPriceMicros))} / segment`}
        />
        <Stat label="Outbound segments this month" value={String(outbound)} />
        <Stat label="Outbound estimated charges" value={formatMicrosUsd(outboundCharge)} />
        <Stat label="Included incoming segments" value={`${included} / month`} />
        <Stat label="Incoming used" value={String(inbound)} hint={`${remaining} included remaining`} />
        <Stat
          label="Incoming overage"
          value={overage > 0 ? `${overage} segments · ${formatMicrosUsd(inboundCharge)}` : "None"}
          hint="Additional incoming segments are $0.025 each"
        />
        <Stat label="Estimated current invoice" value={formatCentsUsd(estInvoiceCents)} />
        <Stat
          label="Dedicated number"
          value={number ? number.phoneE164 : "Being set up"}
        />
        <Stat
          label="Carrier registration"
          value={registration ? registration.status.replaceAll("_", " ").toLowerCase() : "not started"}
          hint={activation?.status === "PAID" ? "Activation fee paid" : undefined}
        />
      </section>

      <section className="rounded-xl border bg-muted/30 p-5 text-sm text-muted-foreground space-y-2">
        <p className="font-medium text-foreground">How segments work</p>
        <p>
          A text message is billed in segments. A single segment holds up to 160 standard (GSM)
          characters; longer messages are split into 153-character segments. Unicode characters and
          emojis switch the message to a different encoding where each segment holds up to 70
          characters (67 when split), so they can increase the segment count. Personalization
          fields can change each recipient&apos;s length, so estimates are calculated per recipient.
        </p>
        <p>
          Incoming messages count per segment against your monthly included allowance; beyond it,
          each incoming segment is $0.025. Outbound usage, overages, activation and any approved
          exceptional charges are never discounted.
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
