/**
 * SMS profitability report + margin warnings (admin-only).
 *
 * Compares customer revenue against provider cost per workspace/plan. All
 * math in integer micros; percentages derived at the last step for display.
 * Provider-cost fluctuations must never silently create negative-margin
 * accounts — warnings fire whenever assumptions are exceeded.
 */

import { MOCK_PROVIDER_COSTS } from "@/lib/sms/mock-provider";
import type { SmsPlanKey } from "@/lib/sms/pricing";
import { centsToMicros } from "@/lib/sms/pricing";

export interface WorkspaceMarginInput {
  workspaceId: string;
  plan: SmsPlanKey;

  /** Revenue, micros */
  fixedFeeRevenueMicros: bigint;
  outboundUsageRevenueMicros: bigint;
  inboundOverageRevenueMicros: bigint;
  activationRevenueMicros: bigint;
  exceptionalChargeRevenueMicros: bigint;

  /** Provider cost, micros */
  telnyxMessageCostMicros: bigint;
  telnyxNumberCostMicros: bigint;
  telnyxRegistrationCostMicros: bigint;
  carrierSurchargeMicros: bigint;

  /** Volumes for anomaly detection */
  outboundSegments: number;
  inboundSegments: number;

  /** Reconciliation: what the provider actually invoiced (null = not yet) */
  reconciledProviderCostMicros: bigint | null;
}

export interface MarginConfig {
  /** Warn below this gross-margin percent */
  marginWarnPercent: number;
  /** Configured per-segment cost assumptions, micros */
  assumedOutboundCostMicros: bigint;
  assumedInboundCostMicros: bigint;
  /** Warn when a workspace's inbound segments exceed this per month */
  inboundAnomalyThreshold: number;
  /** Warn when total provider cost exceeds expectation by this percent */
  costOverrunWarnPercent: number;
}

export const DEFAULT_MARGIN_CONFIG: MarginConfig = {
  marginWarnPercent: 60,
  assumedOutboundCostMicros: MOCK_PROVIDER_COSTS.outboundPerSegmentMicros,
  assumedInboundCostMicros: MOCK_PROVIDER_COSTS.inboundPerSegmentMicros,
  inboundAnomalyThreshold: 2000,
  costOverrunWarnPercent: 25,
};

/**
 * Estimated Stripe processing cost: 2.9% + 30¢ per charge, applied to the
 * revenue actually flowing through Stripe. Integer micros math
 * (29/1000 of revenue + 300_000 micros per assumed charge).
 */
export function estimateStripeCostMicros(revenueMicros: bigint, chargeCount: number): bigint {
  if (revenueMicros <= 0n) return 0n;
  return (revenueMicros * 29n) / 1000n + BigInt(chargeCount) * 300_000n;
}

export interface MarginReportRow {
  workspaceId: string;
  plan: SmsPlanKey;
  revenueMicros: bigint;
  providerCostMicros: bigint;
  stripeCostMicros: bigint;
  grossProfitMicros: bigint;
  /** Percent ×100 for two decimals, e.g. 7245 = 72.45% */
  grossMarginBasisPoints: number;
  warnings: string[];
}

export function buildMarginRow(
  input: WorkspaceMarginInput,
  config: MarginConfig = DEFAULT_MARGIN_CONFIG,
  monthlyChargeCount = 1
): MarginReportRow {
  const revenue =
    input.fixedFeeRevenueMicros +
    input.outboundUsageRevenueMicros +
    input.inboundOverageRevenueMicros +
    input.activationRevenueMicros +
    input.exceptionalChargeRevenueMicros;

  const providerCost =
    input.telnyxMessageCostMicros +
    input.telnyxNumberCostMicros +
    input.telnyxRegistrationCostMicros +
    input.carrierSurchargeMicros;

  const stripeCost = estimateStripeCostMicros(revenue, monthlyChargeCount);
  const grossProfit = revenue - providerCost - stripeCost;
  const marginBp = revenue > 0n ? Number((grossProfit * 10_000n) / revenue) : 0;

  const warnings: string[] = [];

  if (revenue > 0n && marginBp < config.marginWarnPercent * 100) {
    warnings.push(
      `Gross margin ${(marginBp / 100).toFixed(2)}% is below the ${config.marginWarnPercent}% warning threshold`
    );
  }
  if (grossProfit < 0n) {
    warnings.push("NEGATIVE MARGIN: provider + processing cost exceeds revenue");
  }

  // Provider unit cost exceeding assumptions
  const expectedMessageCost =
    BigInt(input.outboundSegments) * config.assumedOutboundCostMicros +
    BigInt(input.inboundSegments) * config.assumedInboundCostMicros;
  if (
    expectedMessageCost > 0n &&
    input.telnyxMessageCostMicros * 100n >
      expectedMessageCost * BigInt(100 + config.costOverrunWarnPercent)
  ) {
    warnings.push(
      "Provider message cost exceeds the configured cost assumption by more than " +
        `${config.costOverrunWarnPercent}% — verify Telnyx pricing`
    );
  }

  if (input.inboundSegments > config.inboundAnomalyThreshold) {
    warnings.push(
      `Abnormally high inbound volume (${input.inboundSegments} segments > ${config.inboundAnomalyThreshold})`
    );
  }

  if (
    input.reconciledProviderCostMicros !== null &&
    input.reconciledProviderCostMicros !== providerCost
  ) {
    warnings.push(
      "Reconciliation mismatch: provider invoice does not match recorded usage cost"
    );
  }

  return {
    workspaceId: input.workspaceId,
    plan: input.plan,
    revenueMicros: revenue,
    providerCostMicros: providerCost,
    stripeCostMicros: stripeCost,
    grossProfitMicros: grossProfit,
    grossMarginBasisPoints: marginBp,
    warnings,
  };
}

/**
 * Break-even helper for docs/monitoring: fixed monthly revenue vs. fixed
 * provider overhead (number + campaign fees), in micros.
 */
export function fixedMonthlyOverheadMicros(): bigint {
  return MOCK_PROVIDER_COSTS.numberMonthlyMicros + MOCK_PROVIDER_COSTS.campaignMonthlyMicros;
}

export function planFixedFeeMicros(planMonthlyCents: number): bigint {
  return centsToMicros(planMonthlyCents);
}
