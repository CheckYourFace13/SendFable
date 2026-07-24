import Stripe from "stripe";
import type { Plan } from "@prisma/client";
import { assertLiveStripeSecretKey, expectedStripeAccountId } from "@/lib/stripe-billing-gate";

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

export type PaidPlan = Exclude<Plan, "FREE">;
export type BillingInterval = "month" | "year";

function priceEnvKeys(plan: PaidPlan, interval: BillingInterval): string[] {
  if (interval === "month") return [`STRIPE_PRICE_${plan}_MONTHLY`];
  // Prefer ANNUAL (production naming); YEARLY kept for backwards compatibility.
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
  const map: Array<{ envs: string[]; plan: PaidPlan; interval: BillingInterval }> = [
    { envs: ["STRIPE_PRICE_STARTER_MONTHLY"], plan: "STARTER", interval: "month" },
    {
      envs: ["STRIPE_PRICE_STARTER_ANNUAL", "STRIPE_PRICE_STARTER_YEARLY"],
      plan: "STARTER",
      interval: "year",
    },
    { envs: ["STRIPE_PRICE_GROWTH_MONTHLY"], plan: "GROWTH", interval: "month" },
    {
      envs: ["STRIPE_PRICE_GROWTH_ANNUAL", "STRIPE_PRICE_GROWTH_YEARLY"],
      plan: "GROWTH",
      interval: "year",
    },
    { envs: ["STRIPE_PRICE_PRO_MONTHLY"], plan: "PRO", interval: "month" },
    {
      envs: ["STRIPE_PRICE_PRO_ANNUAL", "STRIPE_PRICE_PRO_YEARLY"],
      plan: "PRO",
      interval: "year",
    },
  ];
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
  // In production, only accept livemode events.
  if (process.env.NODE_ENV === "production" && livemode !== true) {
    throw new Error("Stripe event is not livemode");
  }
}
