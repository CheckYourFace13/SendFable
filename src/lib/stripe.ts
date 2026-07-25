import Stripe from "stripe";
import type { Plan } from "@prisma/client";
import { assertLiveStripeSecretKey, expectedStripeAccountId } from "@/lib/stripe-billing-gate";
import { PAID_PLAN_ORDER, type PaidPlanKey } from "@/lib/plans";

let stripe: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (stripe !== undefined) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    stripe = null;
    return null;
  }
  assertLiveStripeSecretKey();
  stripe = new Stripe(key, { apiVersion: "2024-06-20" });
  return stripe;
}

export function isStripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY?.trim();
}

export type PaidPlan = PaidPlanKey;
export type BillingInterval = "month" | "year";

function priceEnvKeys(plan: PaidPlan, interval: BillingInterval): string[] {
  if (interval === "month") return [`STRIPE_PRICE_${plan}_MONTHLY`];
  return [`STRIPE_PRICE_${plan}_ANNUAL`, `STRIPE_PRICE_${plan}_YEARLY`];
}

export function priceIdFor(plan: PaidPlan, interval: BillingInterval): string | null {
  for (const key of priceEnvKeys(plan, interval)) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return null;
}

export function planFromPriceId(priceId: string): { plan: PaidPlan; interval: BillingInterval } | null {
  const map: Array<{ envs: string[]; plan: PaidPlan; interval: BillingInterval }> = [];
  for (const plan of PAID_PLAN_ORDER) {
    map.push({ envs: [`STRIPE_PRICE_${plan}_MONTHLY`], plan, interval: "month" });
    map.push({
      envs: [`STRIPE_PRICE_${plan}_ANNUAL`, `STRIPE_PRICE_${plan}_YEARLY`],
      plan,
      interval: "year",
    });
  }
  for (const row of map) {
    for (const env of row.envs) {
      if (process.env[env]?.trim() === priceId) return { plan: row.plan, interval: row.interval };
    }
  }
  return null;
}

/**
 * Reject Connect-account events that don't match the expected Sendfable account.
 * Direct-account webhooks omit `event.account`; those are trusted via the webhook secret.
 */
export function assertStripeAccountAllowed(accountId: string | null | undefined): void {
  const expected = expectedStripeAccountId();
  if (!expected) return;
  if (accountId && accountId !== expected) {
    throw new Error("Stripe event account mismatch");
  }
}

export function assertStripeLiveMode(livemode: boolean | null | undefined): void {
  if (process.env.NODE_ENV === "production" && livemode !== true) {
    throw new Error("Stripe event is not livemode");
  }
}

/** Narrow Prisma Plan to a paid plan key when applicable. */
export function asPaidPlan(plan: Plan): PaidPlan | null {
  if (plan === "FREE") return null;
  if ((PAID_PLAN_ORDER as readonly string[]).includes(plan)) return plan as PaidPlan;
  return null;
}
