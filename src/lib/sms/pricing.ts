/**
 * Central SMS pricing catalog + bundle-discount engine.
 *
 * THE single source of truth for SMS pricing. UI, checkout, billing, usage
 * metering, margin reports and docs must import from here — never hard-code
 * amounts elsewhere.
 *
 * Money units (never floating point):
 *   - Fixed fees: integer USD cents            ($49.99  -> 4999)
 *   - Per-segment amounts: integer USD micros  ($0.035  -> 35_000; 1 USD = 1_000_000)
 *
 * Bundled monthly prices are stored explicitly (owner-specified billing
 * amounts $44.99 / $89.99), not derived with float math.
 */

import type { Plan } from "@prisma/client";

export type SmsPlanKey = "TEXT_ENTRY" | "TEXT_ESSENTIALS" | "TEXT_ADVANTAGE";

export const SMS_PLAN_ORDER: readonly SmsPlanKey[] = [
  "TEXT_ENTRY",
  "TEXT_ESSENTIALS",
  "TEXT_ADVANTAGE",
] as const;

export interface SmsPlanDef {
  key: SmsPlanKey;
  name: string;
  /** Standard fixed monthly fee, cents */
  monthlyPriceCents: number;
  /** Fixed monthly fee when the 10% bundle discount applies, cents (null = never discounted) */
  bundledMonthlyPriceCents: number | null;
  /** Outbound price per SMS segment, micros */
  outboundSegmentPriceMicros: number;
  /** Incoming SMS segments included per UTC calendar month */
  includedInboundSegments: number;
  /** Price per incoming segment beyond the included allowance, micros */
  inboundOveragePriceMicros: number;
  /** Eligible for the 10% bundle discount with a qualifying email plan */
  bundleEligible: boolean;
}

export const SMS_ACTIVATION_FEE_CENTS = 9900; // $99 one-time Text Messaging Activation

export const SMS_INBOUND_OVERAGE_PRICE_MICROS = 25_000; // $0.025 per incoming segment (all plans)

export const SMS_BUNDLE_DISCOUNT_PERCENT = 10;

export const SMS_PLANS: Record<SmsPlanKey, SmsPlanDef> = {
  TEXT_ENTRY: {
    key: "TEXT_ENTRY",
    name: "Text Entry",
    monthlyPriceCents: 1999, // $19.99
    bundledMonthlyPriceCents: null, // never discounted
    outboundSegmentPriceMicros: 50_000, // $0.05
    includedInboundSegments: 100,
    inboundOveragePriceMicros: SMS_INBOUND_OVERAGE_PRICE_MICROS,
    bundleEligible: false,
  },
  TEXT_ESSENTIALS: {
    key: "TEXT_ESSENTIALS",
    name: "Text Essentials",
    monthlyPriceCents: 4999, // $49.99
    bundledMonthlyPriceCents: 4499, // $44.99 (owner-specified billed amount)
    outboundSegmentPriceMicros: 35_000, // $0.035
    includedInboundSegments: 300,
    inboundOveragePriceMicros: SMS_INBOUND_OVERAGE_PRICE_MICROS,
    bundleEligible: true,
  },
  TEXT_ADVANTAGE: {
    key: "TEXT_ADVANTAGE",
    name: "Text Advantage",
    monthlyPriceCents: 9999, // $99.99
    bundledMonthlyPriceCents: 8999, // $89.99 (owner-specified billed amount)
    outboundSegmentPriceMicros: 25_000, // $0.025
    includedInboundSegments: 750,
    inboundOveragePriceMicros: SMS_INBOUND_OVERAGE_PRICE_MICROS,
    bundleEligible: true,
  },
};

// ─── Bundle eligibility ───────────────────────────────────────────────────────

/** Email plans that qualify the account for the SMS bundle discount. */
export const BUNDLE_QUALIFYING_EMAIL_PLANS: readonly Plan[] = [
  "GROWTH",
  "PRO",
  "PRO_PLUS",
] as const;

export interface EmailSubscriptionState {
  plan: Plan;
  /**
   * Whether the email subscription is currently in good standing. A paused,
   * unpaid (payment-failed), cancelled or expired plan must pass `false`.
   * Annual and monthly intervals both qualify.
   */
  active: boolean;
}

export function isBundleQualifyingEmailPlan(plan: Plan): boolean {
  return (BUNDLE_QUALIFYING_EMAIL_PLANS as readonly string[]).includes(plan);
}

export function isBundleEligible(smsPlan: SmsPlanKey, email: EmailSubscriptionState): boolean {
  if (!SMS_PLANS[smsPlan].bundleEligible) return false;
  if (!email.active) return false;
  return isBundleQualifyingEmailPlan(email.plan);
}

export interface AppliedSmsPricing {
  plan: SmsPlanKey;
  baseMonthlyPriceCents: number;
  appliedMonthlyPriceCents: number;
  bundleDiscountPercent: number;
  bundleEligibilitySource: string | null;
  outboundSegmentPriceMicros: number;
  includedInboundSegments: number;
  inboundOveragePriceMicros: number;
  activationFeeCents: number;
}

/**
 * Resolve the customer's effective SMS pricing given their email subscription.
 * ONLY the fixed monthly fee is ever discounted — usage, overage, activation
 * and exceptional charges always stay at standard rates.
 */
export function resolveSmsPricing(
  smsPlan: SmsPlanKey,
  email: EmailSubscriptionState
): AppliedSmsPricing {
  const def = SMS_PLANS[smsPlan];
  const eligible = isBundleEligible(smsPlan, email);
  return {
    plan: smsPlan,
    baseMonthlyPriceCents: def.monthlyPriceCents,
    appliedMonthlyPriceCents:
      eligible && def.bundledMonthlyPriceCents !== null
        ? def.bundledMonthlyPriceCents
        : def.monthlyPriceCents,
    bundleDiscountPercent: eligible ? SMS_BUNDLE_DISCOUNT_PERCENT : 0,
    bundleEligibilitySource: eligible ? `email-plan:${email.plan}` : null,
    outboundSegmentPriceMicros: def.outboundSegmentPriceMicros,
    includedInboundSegments: def.includedInboundSegments,
    inboundOveragePriceMicros: def.inboundOveragePriceMicros,
    activationFeeCents: SMS_ACTIVATION_FEE_CENTS,
  };
}

// ─── Usage charges (integer math only) ───────────────────────────────────────

/** Outbound campaign/reply charge: segments × plan outbound rate (micros). */
export function outboundChargeMicros(smsPlan: SmsPlanKey, totalSegments: number): bigint {
  assertNonNegativeInt(totalSegments, "totalSegments");
  return BigInt(totalSegments) * BigInt(SMS_PLANS[smsPlan].outboundSegmentPriceMicros);
}

/** Billable inbound segments = max(0, monthly inbound − included allowance). */
export function billableInboundSegments(smsPlan: SmsPlanKey, monthlyInboundSegments: number): number {
  assertNonNegativeInt(monthlyInboundSegments, "monthlyInboundSegments");
  return Math.max(0, monthlyInboundSegments - SMS_PLANS[smsPlan].includedInboundSegments);
}

/** Inbound overage charge in micros for a month's total inbound segments. */
export function inboundOverageChargeMicros(
  smsPlan: SmsPlanKey,
  monthlyInboundSegments: number
): bigint {
  const over = billableInboundSegments(smsPlan, monthlyInboundSegments);
  return BigInt(over) * BigInt(SMS_PLANS[smsPlan].inboundOveragePriceMicros);
}

/** Micros → cents, rounding half-up on the customer-favorable side (floor). */
export function microsToCentsFloor(micros: bigint): number {
  return Number(micros / 10_000n);
}

export function centsToMicros(cents: number): bigint {
  assertNonNegativeInt(cents, "cents");
  return BigInt(cents) * 10_000n;
}

export function formatCentsUsd(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const rem = String(abs % 100).padStart(2, "0");
  return `${sign}$${dollars}.${rem}`;
}

export function formatMicrosUsd(micros: bigint): string {
  const sign = micros < 0n ? "-" : "";
  const abs = micros < 0n ? -micros : micros;
  const dollars = abs / 1_000_000n;
  const frac = abs % 1_000_000n;
  // Trim to at most 6 decimals, at least 2
  let fracStr = frac.toString().padStart(6, "0").replace(/0+$/, "");
  if (fracStr.length < 2) fracStr = fracStr.padEnd(2, "0");
  return `${sign}$${dollars}.${fracStr}`;
}

function assertNonNegativeInt(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer (got ${value})`);
  }
}

// ─── Usage alert thresholds ───────────────────────────────────────────────────

export const SMS_INBOUND_ALERT_THRESHOLDS = [75, 90, 100] as const;

/** Which alert thresholds (percent of included inbound allowance) have been crossed. */
export function crossedInboundThresholds(
  smsPlan: SmsPlanKey,
  monthlyInboundSegments: number
): number[] {
  const included = SMS_PLANS[smsPlan].includedInboundSegments;
  if (included <= 0) return [...SMS_INBOUND_ALERT_THRESHOLDS];
  return SMS_INBOUND_ALERT_THRESHOLDS.filter(
    (pct) => monthlyInboundSegments * 100 >= included * pct
  );
}
