/**
 * SMS usage accounting: append-only ledger + monthly rollups.
 *
 * Billing rules:
 *  - Outbound: billed on provider ACCEPTANCE (documented in
 *    docs/SMS_BILLING_ARCHITECTURE.md — Telnyx bills accepted messages, so an
 *    accepted-but-undelivered message is billable; failed-before-acceptance is not).
 *  - Inbound: counted per message PART (segment), free until the plan's
 *    included allowance is exhausted for the UTC calendar month, then $0.025
 *    per additional segment.
 *  - Idempotency: every ledger row carries a unique idempotencyKey; webhook
 *    and provider retries can never double-charge.
 */

import { prisma } from "@/lib/prisma";
import {
  SMS_PLANS,
  billableInboundSegments,
  outboundChargeMicros,
  type SmsPlanKey,
} from "@/lib/sms/pricing";
import type { SmsDirection, SmsUsageType } from "@prisma/client";

/** UTC calendar month key, e.g. "2026-07". */
export function billingPeriodFor(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export interface RecordOutboundUsageInput {
  workspaceId: string;
  plan: SmsPlanKey;
  segments: number;
  idempotencyKey: string;
  campaignId?: string | null;
  messageId?: string | null;
  providerMessageId?: string | null;
  providerCostMicros?: bigint;
  at?: Date;
}

/**
 * Record accepted outbound segments. Returns null when the idempotency key
 * was already recorded (retry) — nothing is double-charged.
 */
export async function recordOutboundUsage(input: RecordOutboundUsageInput) {
  const period = billingPeriodFor(input.at);
  const unitPrice = BigInt(SMS_PLANS[input.plan].outboundSegmentPriceMicros);
  const charge = outboundChargeMicros(input.plan, input.segments);

  const existing = await prisma.smsUsageLedger.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return null;

  const [row] = await prisma.$transaction([
    prisma.smsUsageLedger.create({
      data: {
        workspaceId: input.workspaceId,
        direction: "OUTBOUND" satisfies SmsDirection,
        campaignId: input.campaignId ?? null,
        messageId: input.messageId ?? null,
        providerMessageId: input.providerMessageId ?? null,
        billingPeriod: period,
        segments: input.segments,
        unitPriceMicros: unitPrice,
        customerChargeMicros: charge,
        providerCostMicros: input.providerCostMicros ?? 0n,
        usageType: "OUTBOUND_SEGMENT" satisfies SmsUsageType,
        status: "BILLABLE",
        idempotencyKey: input.idempotencyKey,
      },
    }),
    prisma.smsMonthlyUsage.upsert({
      where: { workspaceId_month: { workspaceId: input.workspaceId, month: period } },
      create: {
        workspaceId: input.workspaceId,
        month: period,
        outboundSegments: input.segments,
        includedInboundSegments: SMS_PLANS[input.plan].includedInboundSegments,
        customerOutboundChargeMicros: charge,
        providerCostMicros: input.providerCostMicros ?? 0n,
      },
      update: {
        outboundSegments: { increment: input.segments },
        customerOutboundChargeMicros: { increment: charge },
        providerCostMicros: { increment: input.providerCostMicros ?? 0n },
      },
    }),
  ]);
  return row;
}

export interface RecordInboundUsageInput {
  workspaceId: string;
  plan: SmsPlanKey;
  segments: number;
  idempotencyKey: string;
  messageId?: string | null;
  providerMessageId?: string | null;
  providerCostMicros?: bigint;
  at?: Date;
}

export interface InboundUsageResult {
  includedSegments: number;
  overageSegments: number;
  overageChargeMicros: bigint;
  monthlyInboundTotal: number;
}

/**
 * Record inbound segments, splitting them into included vs. overage against
 * the plan's monthly allowance. Retries (same idempotencyKey) return null.
 *
 * STOP/HELP messages flow through here too: they count toward provider cost
 * and the allowance, but compliance handling itself is never blocked.
 */
export async function recordInboundUsage(
  input: RecordInboundUsageInput
): Promise<InboundUsageResult | null> {
  const period = billingPeriodFor(input.at);
  const planDef = SMS_PLANS[input.plan];

  const existing = await prisma.smsUsageLedger.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return null;

  return prisma.$transaction(async (tx) => {
    const monthly = await tx.smsMonthlyUsage.upsert({
      where: { workspaceId_month: { workspaceId: input.workspaceId, month: period } },
      create: {
        workspaceId: input.workspaceId,
        month: period,
        includedInboundSegments: planDef.includedInboundSegments,
      },
      update: {},
    });

    const before = monthly.inboundSegments;
    const after = before + input.segments;
    const overageBefore = billableInboundSegments(input.plan, before);
    const overageAfter = billableInboundSegments(input.plan, after);
    const newOverage = overageAfter - overageBefore;
    const includedNow = input.segments - newOverage;
    const overageCharge =
      BigInt(newOverage) * BigInt(planDef.inboundOveragePriceMicros);

    await tx.smsUsageLedger.create({
      data: {
        workspaceId: input.workspaceId,
        direction: "INBOUND",
        messageId: input.messageId ?? null,
        providerMessageId: input.providerMessageId ?? null,
        billingPeriod: period,
        segments: input.segments,
        unitPriceMicros: newOverage > 0 ? BigInt(planDef.inboundOveragePriceMicros) : 0n,
        customerChargeMicros: overageCharge,
        providerCostMicros: input.providerCostMicros ?? 0n,
        usageType: newOverage > 0 ? "INBOUND_OVERAGE" : "INBOUND_INCLUDED",
        status: newOverage > 0 ? "BILLABLE" : "PENDING",
        idempotencyKey: input.idempotencyKey,
      },
    });

    await tx.smsMonthlyUsage.update({
      where: { id: monthly.id },
      data: {
        inboundSegments: { increment: input.segments },
        overageInboundSegments: { increment: newOverage },
        includedInboundSegments: planDef.includedInboundSegments,
        customerInboundChargeMicros: { increment: overageCharge },
        providerCostMicros: { increment: input.providerCostMicros ?? 0n },
      },
    });

    return {
      includedSegments: includedNow,
      overageSegments: newOverage,
      overageChargeMicros: overageCharge,
      monthlyInboundTotal: after,
    };
  });
}

/**
 * Pure split calculation for tests and previews: given segments already used
 * this month and an incoming batch, how many are included vs. overage?
 */
export function splitInboundSegments(
  plan: SmsPlanKey,
  usedThisMonth: number,
  incoming: number
): { included: number; overage: number; overageChargeMicros: bigint } {
  const overageBefore = billableInboundSegments(plan, usedThisMonth);
  const overageAfter = billableInboundSegments(plan, usedThisMonth + incoming);
  const overage = overageAfter - overageBefore;
  return {
    included: incoming - overage,
    overage,
    overageChargeMicros: BigInt(overage) * BigInt(SMS_PLANS[plan].inboundOveragePriceMicros),
  };
}
