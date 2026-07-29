import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { isSmsAdminEnabled, isSmsCodeEnabled, smsFlagSnapshot } from "@/lib/sms/flags";
import { SMS_PLANS, formatCentsUsd, formatMicrosUsd, type SmsPlanKey } from "@/lib/sms/pricing";
import { buildMarginRow, DEFAULT_MARGIN_CONFIG } from "@/lib/sms/margin";
import { billingPeriodFor } from "@/lib/sms/usage";
import { centsToMicros } from "@/lib/sms/pricing";

export const dynamic = "force-dynamic";

/** Owner-only SMS reporting: customers, usage, revenue, cost, margin, flags. */
export async function GET() {
  if (!isSmsCodeEnabled() || !isSmsAdminEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ctx = await requirePlatformAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const month = billingPeriodFor();
  const [subscriptions, adminSetting] = await Promise.all([
    prisma.smsSubscription.findMany({
      include: { workspace: { select: { id: true, name: true } } },
    }),
    prisma.smsAdminSetting.findUnique({ where: { id: "default" } }),
  ]);

  const config = adminSetting
    ? {
        ...DEFAULT_MARGIN_CONFIG,
        marginWarnPercent: adminSetting.marginWarnPercent,
        assumedOutboundCostMicros: adminSetting.assumedOutboundCostMicros,
        assumedInboundCostMicros: adminSetting.assumedInboundCostMicros,
        inboundAnomalyThreshold: adminSetting.inboundAnomalyThreshold,
      }
    : DEFAULT_MARGIN_CONFIG;

  const rows = [];
  for (const sub of subscriptions) {
    const workspaceId = sub.workspaceId;
    const [monthly, activation, number, registration, emailPlanOwner, failures, optOuts, subscribedPhones, exceptional] =
      await Promise.all([
        prisma.smsMonthlyUsage.findUnique({
          where: { workspaceId_month: { workspaceId, month } },
        }),
        prisma.smsActivation.findUnique({ where: { workspaceId } }),
        prisma.smsNumber.findFirst({ where: { workspaceId, status: "ACTIVE" } }),
        prisma.smsRegistration.findFirst({ where: { workspaceId }, orderBy: { updatedAt: "desc" } }),
        prisma.membership.findFirst({
          where: { workspaceId, role: "OWNER" },
          include: { user: { select: { plan: true, paymentFailedAt: true } } },
        }),
        prisma.smsMessage.count({
          where: { workspaceId, direction: "OUTBOUND", status: "FAILED" },
        }),
        prisma.contact.count({ where: { workspaceId, smsStatus: "OPTED_OUT" } }),
        prisma.contact.count({ where: { workspaceId, smsStatus: "SUBSCRIBED" } }),
        prisma.smsExceptionalCharge.findMany({
          where: { workspaceId },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

    const plan = sub.plan as SmsPlanKey;
    const numberCost = number?.monthlyCostMicros ?? 0n;
    const margin = buildMarginRow(
      {
        workspaceId,
        plan,
        fixedFeeRevenueMicros: centsToMicros(sub.appliedMonthlyPriceCents),
        outboundUsageRevenueMicros: monthly?.customerOutboundChargeMicros ?? 0n,
        inboundOverageRevenueMicros: monthly?.customerInboundChargeMicros ?? 0n,
        activationRevenueMicros:
          activation?.status === "PAID" && activation.paidAt && billingPeriodFor(activation.paidAt) === month
            ? centsToMicros(activation.standardFeeCents)
            : 0n,
        exceptionalChargeRevenueMicros: exceptional
          .filter((e) => e.approvalStatus === "INVOICED")
          .reduce((sum, e) => sum + centsToMicros(e.customerAmountCents), 0n),
        telnyxMessageCostMicros: monthly?.providerCostMicros ?? 0n,
        telnyxNumberCostMicros: numberCost,
        telnyxRegistrationCostMicros: 0n,
        carrierSurchargeMicros: 0n,
        outboundSegments: monthly?.outboundSegments ?? 0,
        inboundSegments: monthly?.inboundSegments ?? 0,
        reconciledProviderCostMicros: monthly?.reconciledAt ? monthly.providerCostMicros : null,
      },
      config
    );

    rows.push({
      workspaceId,
      workspaceName: sub.workspace.name,
      plan: SMS_PLANS[plan].name,
      status: sub.status,
      emailPlan: emailPlanOwner?.user.plan ?? "FREE",
      textOnly: (emailPlanOwner?.user.plan ?? "FREE") === "FREE",
      bundleDiscount: sub.bundleDiscountPercent > 0 ? `${sub.bundleDiscountPercent}%` : "—",
      billedMonthly: formatCentsUsd(sub.appliedMonthlyPriceCents),
      registrationStatus: registration?.status ?? "NOT_STARTED",
      numberStatus: number ? "ACTIVE" : "NONE",
      outboundSegments: monthly?.outboundSegments ?? 0,
      inboundSegments: monthly?.inboundSegments ?? 0,
      includedInbound: SMS_PLANS[plan].includedInboundSegments,
      inboundOverage: monthly?.overageInboundSegments ?? 0,
      revenue: formatMicrosUsd(margin.revenueMicros),
      providerCost: formatMicrosUsd(margin.providerCostMicros),
      grossProfit: formatMicrosUsd(margin.grossProfitMicros),
      marginPercent: (margin.grossMarginBasisPoints / 100).toFixed(2) + "%",
      deliveryFailures: failures,
      optOutRate:
        subscribedPhones + optOuts > 0
          ? ((optOuts * 100) / (subscribedPhones + optOuts)).toFixed(1) + "%"
          : "—",
      warnings: margin.warnings,
      exceptionalCharges: exceptional.map((e) => ({
        id: e.id,
        type: e.type,
        customerAmount: formatCentsUsd(e.customerAmountCents),
        status: e.approvalStatus,
      })),
      reconciledAt: monthly?.reconciledAt?.toISOString() ?? null,
    });
  }

  return NextResponse.json({
    month,
    customers: rows,
    flags: smsFlagSnapshot(),
    marginConfig: {
      marginWarnPercent: config.marginWarnPercent,
      inboundAnomalyThreshold: config.inboundAnomalyThreshold,
    },
  });
}
